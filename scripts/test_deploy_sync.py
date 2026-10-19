#!/usr/bin/env python3
"""Behavior tests for deploy_sync.py; all tests run without Tencent Cloud calls."""

from __future__ import annotations

import base64
import io
import json
import sys
import tempfile
import unittest
import zipfile
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).parent))
import deploy_scf  # noqa: E402
import deploy_sync  # noqa: E402


class FakeFunctionClient:
    """只记录请求的假 SCF 客户端；默认假设目标函数已存在。"""

    def __init__(self, *, exists=True, status="Active", triggers=None):
        self.exists = exists
        self.status = status
        self.triggers = list(triggers or [])
        self.requests = []
        self.url_created = False

    def GetFunction(self, request):
        self.requests.append(("GetFunction", request))
        if not self.exists:
            raise FakeSdkError("ResourceNotFound.Function", "function not found")
        return SimpleNamespace(
            Response=SimpleNamespace(Status=self.status, AvailableStatus="Available")
        )

    def CreateFunction(self, request):
        self.requests.append(("CreateFunction", request))
        # 创建之后函数即存在，供后续轮询与触发器操作使用。
        self.exists = True
        return SimpleNamespace(Response=SimpleNamespace())

    def UpdateFunctionCode(self, request):
        self.requests.append(("UpdateFunctionCode", request))
        return SimpleNamespace(Response=SimpleNamespace())

    def UpdateFunctionConfiguration(self, request):
        self.requests.append(("UpdateFunctionConfiguration", request))
        return SimpleNamespace(Response=SimpleNamespace())

    def ListTriggers(self, request):
        self.requests.append(("ListTriggers", request))
        return SimpleNamespace(Response=SimpleNamespace(Triggers=list(self.triggers)))

    def _trigger_from(self, request):
        # 真实形态：平台回读的描述里带上公网地址。
        desc = json.loads(request.TriggerDesc)
        desc.setdefault("NetConfig", {})["ExtranetUrl"] = FAKE_FUNCTION_URL
        return SimpleNamespace(
            Type=request.Type,
            TriggerName=request.TriggerName,
            TriggerDesc=json.dumps(desc),
            Enable=1,
        )

    def CreateTrigger(self, request):
        self.requests.append(("CreateTrigger", request))
        self.url_created = True
        self.triggers.append(self._trigger_from(request))
        return SimpleNamespace(Response=SimpleNamespace())

    def UpdateTrigger(self, request):
        self.requests.append(("UpdateTrigger", request))
        for index, trigger in enumerate(self.triggers):
            if getattr(trigger, "Type", "") == request.Type:
                self.triggers[index] = self._trigger_from(request)
        return SimpleNamespace(Response=SimpleNamespace())

    def PutReservedConcurrencyConfig(self, request):
        self.requests.append(("PutReservedConcurrencyConfig", request))
        return SimpleNamespace(Response=SimpleNamespace())

    def actions(self):
        return [name for name, _ in self.requests]


class FakeSdkError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


FAKE_FUNCTION_URL = "https://1-abc.ap-guangzhou.tencentscf.com"


def http_trigger(auth_type="NONE", url=FAKE_FUNCTION_URL):
    # 真实形态：公网地址在 NetConfig.ExtranetUrl，不是顶层键（2026-10-19 对真实账户核对）。
    net_config = {"EnableIntranet": True, "EnableExtranet": True}
    if url:
        net_config["ExtranetUrl"] = url
    desc = {"AuthType": auth_type, "NetConfig": net_config}
    return SimpleNamespace(
        Type="http",
        TriggerName="func_url",
        TriggerDesc=json.dumps(desc),
        Enable=1,
    )


class DeploySyncTests(unittest.TestCase):
    def setUp(self):
        models = SimpleNamespace(
            GetFunctionRequest=SimpleNamespace,
            CreateFunctionRequest=SimpleNamespace,
            UpdateFunctionCodeRequest=SimpleNamespace,
            UpdateFunctionConfigurationRequest=SimpleNamespace,
            ListTriggersRequest=SimpleNamespace,
            CreateTriggerRequest=SimpleNamespace,
            UpdateTriggerRequest=SimpleNamespace,
            PutReservedConcurrencyConfigRequest=SimpleNamespace,
            Code=SimpleNamespace,
            Environment=SimpleNamespace,
            Variable=SimpleNamespace,
        )
        modules = patch.dict(
            sys.modules,
            {
                "tencentcloud": SimpleNamespace(),
                "tencentcloud.scf": SimpleNamespace(),
                "tencentcloud.scf.v20180416": SimpleNamespace(models=models),
            },
        )
        modules.start()
        self.addCleanup(modules.stop)
        self.package = deploy_sync.build_package()

    def request_for(self, client, action):
        matches = [request for name, request in client.requests if name == action]
        self.assertTrue(matches, f"{action} 未被调用")
        return matches[0]

    # --- 代码包 -------------------------------------------------------------

    def test_package_contains_only_runtime_files_and_is_reproducible(self):
        with zipfile.ZipFile(io.BytesIO(self.package)) as archive:
            self.assertEqual(archive.namelist(), list(deploy_sync.PACKAGE_ENTRIES))
            self.assertNotIn("logic.test.js", archive.namelist())
            for name in archive.namelist():
                self.assertTrue(archive.read(name))
        self.assertEqual(deploy_sync.build_package(), self.package)

        manifest = json.loads(
            zipfile.ZipFile(io.BytesIO(self.package)).read("package.json")
        )
        self.assertEqual(manifest["type"], "commonjs")

    def test_package_requires_every_runtime_file(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)
            with self.assertRaisesRegex(deploy_sync.DeploymentError, "缺少"):
                deploy_sync.build_package(source)

            for name in deploy_sync.PACKAGE_ENTRIES:
                (source / name).write_text("x", encoding="utf-8")
            (source / "logic.js").write_text("", encoding="utf-8")
            with self.assertRaisesRegex(deploy_sync.DeploymentError, "为空"):
                deploy_sync.build_package(source)

    def test_package_entry_actually_loads_in_node(self):
        # 不是清单自证：把包解开后真的 require 一次入口
        deploy_sync.verify_package_loads(self.package)

    def test_missing_require_target_fails_load_check(self):
        # 清单漏掉 logic.js：打包与 namelist 断言都过得去，只有真加载会失败
        with patch.object(
            deploy_sync,
            "PACKAGE_ENTRIES",
            ("package.json", "cos.js", "index.js"),
        ):
            with self.assertRaisesRegex(
                deploy_sync.DeploymentError, "校验函数代码包失败"
            ):
                deploy_sync.build_package()

    # --- upsert -------------------------------------------------------------

    def test_creates_function_with_role_memory_environment_and_zip(self):
        client = FakeFunctionClient(exists=False)

        deploy_sync.deploy_package(client, "default", self.package)

        request = self.request_for(client, "CreateFunction")
        self.assertEqual(request.FunctionName, "IIROSE-MEDIA-SYNC")
        self.assertEqual(request.Namespace, "default")
        self.assertEqual(request.Role, "IIROSE-MEDIA-SYNC-Role")
        self.assertEqual(request.Runtime, "Nodejs24.11")
        self.assertEqual(request.Handler, "index.main_handler")
        self.assertEqual(request.MemorySize, 128)
        self.assertEqual(request.Timeout, 30)
        self.assertEqual(request.CodeSource, "ZipFile")
        self.assertEqual(base64.b64decode(request.Code.ZipFile), self.package)
        self.assertEqual(
            {
                variable.Key: variable.Value
                for variable in request.Environment.Variables
            },
            {
                "COS_BUCKET": "iirose-media-sync-1309510434",
                "COS_REGION": "ap-guangzhou",
            },
        )
        self.assertNotIn("UpdateFunctionCode", client.actions())
        self.assertNotIn(
            "UpdateFunctionConfiguration",
            client.actions(),
            "创建时已带齐角色与环境变量，不需要再收敛",
        )

    def test_updates_code_and_configuration_when_function_exists(self):
        client = FakeFunctionClient(exists=True)

        deploy_sync.deploy_package(client, "custom", self.package)

        request = self.request_for(client, "UpdateFunctionCode")
        self.assertEqual(request.FunctionName, "IIROSE-MEDIA-SYNC")
        self.assertEqual(request.Namespace, "custom")
        self.assertEqual(request.Publish, "FALSE")
        self.assertEqual(request.CodeSource, "ZipFile")
        self.assertFalse(hasattr(request, "Qualifier"))
        self.assertEqual(base64.b64decode(request.ZipFile), self.package)
        self.assertNotIn("CreateFunction", client.actions())

        # 只替换代码不会纠正角色与环境变量，必须一并收敛。
        configuration = self.request_for(client, "UpdateFunctionConfiguration")
        self.assertEqual(configuration.FunctionName, "IIROSE-MEDIA-SYNC")
        self.assertEqual(configuration.Namespace, "custom")
        self.assertEqual(configuration.Role, "IIROSE-MEDIA-SYNC-Role")
        self.assertEqual(configuration.MemorySize, deploy_sync.MEMORY_MB)
        self.assertEqual(configuration.Timeout, deploy_sync.TIMEOUT_SECONDS)
        self.assertEqual(
            {
                variable.Key: variable.Value
                for variable in configuration.Environment.Variables
            },
            {
                "COS_BUCKET": "iirose-media-sync-1309510434",
                "COS_REGION": "ap-guangzhou",
            },
        )
        self.assertLess(
            client.actions().index("UpdateFunctionConfiguration"),
            client.actions().index("UpdateFunctionCode"),
            "两次变更必须串行：平台会拒绝并发更新",
        )

    def test_oversized_package_is_rejected_before_upload(self):
        client = FakeFunctionClient(exists=True)
        oversized = b"\0" * (20 * 1024 * 1024)  # base64 后超过 20 MiB

        with self.assertRaisesRegex(deploy_sync.DeploymentError, "20 MiB"):
            deploy_sync.update_function_code(client, "default", oversized)

        self.assertEqual(client.requests, [])

    def test_not_found_codes_are_treated_as_missing_function(self):
        for code in ("ResourceNotFound.Function", "ResourceNotFound.FunctionName"):
            with self.subTest(code=code):
                client = FakeFunctionClient(exists=False)
                seen = []

                def respond(request, code=code, seen=seen):
                    seen.append(request)
                    if len(seen) == 1:
                        raise FakeSdkError(code, "secret detail")
                    return SimpleNamespace(
                        Response=SimpleNamespace(
                            Status="Active", AvailableStatus="Available"
                        )
                    )

                client.GetFunction = respond
                deploy_sync.deploy_package(client, "default", self.package)

                self.assertIn("CreateFunction", client.actions())
                self.assertEqual(len(seen), 2)

    def test_other_cloud_errors_do_not_leak_server_text(self):
        client = FakeFunctionClient()
        client.GetFunction = Mock(
            side_effect=FakeSdkError("AuthFailure.SecretIdNotFound", "secret text")
        )
        with self.assertRaises(deploy_sync.DeploymentError) as caught:
            deploy_sync.deploy_package(client, "default", self.package)
        self.assertNotIn("secret", str(caught.exception))
        self.assertIn("GetFunction", str(caught.exception))

    # --- 等待就绪 -----------------------------------------------------------

    def test_wait_accepts_transition_to_active(self):
        client = FakeFunctionClient(status="Updating")
        statuses = iter(["Updating", "Active"])

        def respond(request):
            return SimpleNamespace(
                Response=SimpleNamespace(
                    Status=next(statuses), AvailableStatus="Available"
                )
            )

        client.GetFunction = respond
        deploy_sync.wait_for_function_ready(client, "default", sleep=lambda _: None)

    def test_wait_treats_resource_not_found_as_not_ready(self):
        client = FakeFunctionClient()
        missing = [
            FakeSdkError("ResourceNotFound.Function", "not created yet"),
            FakeSdkError("ResourceNotFound.FunctionName", "not created yet"),
        ]
        polls = []

        def respond(request, pending=missing):
            polls.append(request)
            if pending:
                raise pending.pop(0)
            return SimpleNamespace(
                Response=SimpleNamespace(Status="Active", AvailableStatus="Available")
            )

        client.GetFunction = respond
        deploy_sync.wait_for_function_ready(client, "default", sleep=lambda _: None)

        self.assertEqual(
            len(polls), 3, "ResourceNotFound 只算「尚未就绪」，必须继续轮询"
        )

    def test_wait_reports_failure_and_timeout(self):
        failed = FakeFunctionClient(status="UpdateFailedRollbackDone")
        with self.assertRaisesRegex(deploy_sync.DeploymentError, "更新失败"):
            deploy_sync.wait_for_function_ready(failed, "default")

        stalled = FakeFunctionClient(status="Updating")
        clock = iter([0.0, 0.0, 2.0])
        with self.assertRaisesRegex(deploy_sync.DeploymentError, "超时"):
            deploy_sync.wait_for_function_ready(
                stalled,
                "default",
                timeout=1,
                interval=0,
                sleep=lambda _: None,
                monotonic=lambda: next(clock),
            )

        absent = FakeFunctionClient(exists=False)
        clock = iter([0.0, 0.0, 2.0])
        with self.assertRaisesRegex(deploy_sync.DeploymentError, "超时"):
            deploy_sync.wait_for_function_ready(
                absent,
                "default",
                timeout=1,
                interval=0,
                sleep=lambda _: None,
                monotonic=lambda: next(clock),
            )

    # --- 函数 URL -----------------------------------------------------------

    def test_function_url_is_created_open_when_missing(self):
        client = FakeFunctionClient(triggers=[])

        url = deploy_sync.ensure_function_url(client, "default")

        request = self.request_for(client, "CreateTrigger")
        self.assertEqual(request.FunctionName, "IIROSE-MEDIA-SYNC")
        self.assertEqual(request.Type, "http")
        self.assertEqual(request.TriggerName, "func_url")
        self.assertEqual(request.Enable, "OPEN")
        self.assertEqual(request.Qualifier, "$LATEST")
        desc = json.loads(request.TriggerDesc)
        self.assertEqual(desc["AuthType"], "NONE")
        self.assertTrue(desc["NetConfig"]["EnableExtranet"])
        self.assertEqual(request.TriggerDesc, json.dumps(desc, separators=(",", ":")))
        self.assertEqual(url, FAKE_FUNCTION_URL)
        self.assertEqual(client.actions().count("ListTriggers"), 2)

    def test_function_url_wait_retries_until_trigger_appears(self):
        client = FakeFunctionClient(triggers=[])
        empty = SimpleNamespace(Response=SimpleNamespace(Triggers=[]))
        listings = [empty, empty]

        def list_triggers(request):
            client.requests.append(("ListTriggers", request))
            if listings:
                return listings.pop(0)
            return SimpleNamespace(Response=SimpleNamespace(Triggers=[http_trigger()]))

        client.ListTriggers = list_triggers
        url = deploy_sync.ensure_function_url(client, "default", sleep=lambda _: None)

        self.assertEqual(url, FAKE_FUNCTION_URL)
        self.assertEqual(
            client.actions().count("ListTriggers"),
            3,
            "创建后要重试读到触发器与地址（1 次探测 + 2 次重试）",
        )

    def test_existing_open_function_url_is_not_touched(self):
        client = FakeFunctionClient(triggers=[http_trigger()])

        url = deploy_sync.ensure_function_url(client, "default")

        self.assertEqual(url, FAKE_FUNCTION_URL)
        self.assertNotIn("CreateTrigger", client.actions())
        self.assertNotIn("UpdateTrigger", client.actions())

    def test_function_url_auth_is_corrected_by_update_trigger(self):
        client = FakeFunctionClient(triggers=[http_trigger(auth_type="CAM")])

        url = deploy_sync.ensure_function_url(client, "default")

        self.assertEqual(url, FAKE_FUNCTION_URL)
        self.assertNotIn("CreateTrigger", client.actions())
        request = self.request_for(client, "UpdateTrigger")
        self.assertEqual(request.TriggerName, "func_url")
        self.assertEqual(request.Type, "http")
        self.assertEqual(json.loads(request.TriggerDesc)["AuthType"], "NONE")

    def test_trigger_url_reads_extranet_url_then_falls_back(self):
        self.assertEqual(deploy_sync.trigger_url(http_trigger()), FAKE_FUNCTION_URL)
        legacy = SimpleNamespace(
            TriggerDesc=json.dumps(
                {"AuthType": "NONE", "Url": "https://legacy.example"}
            )
        )
        self.assertEqual(deploy_sync.trigger_url(legacy), "https://legacy.example")
        self.assertEqual(
            deploy_sync.trigger_url(SimpleNamespace(TriggerDesc="{不是 JSON")), ""
        )
        self.assertEqual(deploy_sync.trigger_url(SimpleNamespace()), "")

    def test_missing_function_url_address_fails_instead_of_silently_passing(self):
        client = FakeFunctionClient(triggers=[http_trigger(url=None)])

        with self.assertRaisesRegex(deploy_sync.DeploymentError, "读到地址"):
            deploy_sync.ensure_function_url(client, "default", sleep=lambda _: None)

        never = FakeFunctionClient(triggers=[])
        never.ListTriggers = Mock(
            return_value=SimpleNamespace(Response=SimpleNamespace(Triggers=[]))
        )
        with self.assertRaisesRegex(deploy_sync.DeploymentError, "函数 URL"):
            deploy_sync.ensure_function_url(never, "default", sleep=lambda _: None)

    def test_url_failure_makes_main_exit_nonzero(self):
        output = io.StringIO()
        with (
            patch.object(
                deploy_sync,
                "deploy",
                side_effect=deploy_sync.DeploymentError(
                    "未从函数 URL 触发器读到地址，请在 SCF 控制台确认函数 URL"
                ),
            ),
            redirect_stderr(output),
        ):
            result = deploy_sync.main([])
        self.assertEqual(result, 1)
        self.assertIn("函数 URL", output.getvalue())

    # --- 并发上限 -----------------------------------------------------------

    def test_concurrency_limit_is_applied(self):
        client = FakeFunctionClient()

        deploy_sync.ensure_concurrency(client, "default")

        request = self.request_for(client, "PutReservedConcurrencyConfig")
        self.assertEqual(request.FunctionName, "IIROSE-MEDIA-SYNC")
        self.assertEqual(request.ReservedConcurrencyMem, 1280)
        self.assertEqual(
            request.ReservedConcurrencyMem,
            deploy_sync.MEMORY_MB * deploy_sync.MAX_CONCURRENCY,
        )

    # --- 整体流程 -----------------------------------------------------------

    def test_deploy_runs_in_expected_order_and_is_idempotent(self):
        client = FakeFunctionClient(exists=False)

        first = deploy_sync.deploy_package(client, "default", self.package)
        second = deploy_sync.deploy_package(client, "default", self.package)

        self.assertEqual(first, FAKE_FUNCTION_URL)
        self.assertEqual(second, FAKE_FUNCTION_URL)
        self.assertEqual(
            client.actions(),
            [
                "GetFunction",
                "CreateFunction",
                "GetFunction",
                "ListTriggers",
                "CreateTrigger",
                "ListTriggers",
                "PutReservedConcurrencyConfig",
                "GetFunction",
                "UpdateFunctionConfiguration",
                "GetFunction",
                "UpdateFunctionCode",
                "GetFunction",
                "ListTriggers",
                "PutReservedConcurrencyConfig",
            ],
        )
        self.assertEqual(client.actions().count("CreateFunction"), 1)
        self.assertEqual(client.actions().count("CreateTrigger"), 1)
        self.assertEqual(client.actions().count("UpdateFunctionConfiguration"), 1)

    def test_deploy_only_touches_the_sync_function(self):
        self.assertEqual(deploy_sync.FUNCTION_NAME, "IIROSE-MEDIA-SYNC")
        self.assertEqual(deploy_scf.FUNCTION_NAME, "IIROSE-MEDIA-WEB")
        self.assertEqual(deploy_scf.REGION, deploy_sync.REGION)

        client = FakeFunctionClient(exists=False)
        deploy_sync.deploy_package(client, "default", self.package)
        for name, request in client.requests:
            self.assertEqual(
                getattr(request, "FunctionName", deploy_sync.FUNCTION_NAME),
                deploy_sync.FUNCTION_NAME,
                name,
            )

    # --- 入口 ---------------------------------------------------------------

    def test_main_missing_credentials_fails_without_traceback(self):
        output = io.StringIO()
        with (
            patch.dict(deploy_sync.os.environ, {}, clear=True),
            redirect_stderr(output),
        ):
            result = deploy_sync.main([])
        self.assertEqual(result, 1)
        self.assertIn("缺少", output.getvalue())
        self.assertNotIn("Traceback", output.getvalue())

    def test_main_unexpected_error_is_sanitized(self):
        output = io.StringIO()
        with (
            patch.object(
                deploy_sync, "deploy", side_effect=RuntimeError("secret signed URL")
            ),
            redirect_stderr(output),
        ):
            result = deploy_sync.main([])
        self.assertEqual(result, 1)
        self.assertNotIn("secret", output.getvalue())
        self.assertNotIn("Traceback", output.getvalue())

    def test_main_reports_success_without_secrets(self):
        output = io.StringIO()
        with (
            patch.object(
                deploy_sync,
                "deploy",
                return_value="https://1-abc.ap-guangzhou.tencentscf.com",
            ),
            # 客户端常量必须与部署地址一致，否则 main 会拒绝（见 addCleanup 后的用例）
            patch.object(
                deploy_sync,
                "read_client_server_url",
                return_value="https://1-abc.ap-guangzhou.tencentscf.com",
            ),
            patch.dict(
                deploy_sync.os.environ,
                {
                    "TENCENT_SECRET_ID": "secret-id",
                    "TENCENT_SECRET_KEY": "secret-key",
                },
            ),
            redirect_stderr(output),
            redirect_stdout(output),
        ):
            result = deploy_sync.main(["--source", "cloud/sync"])
        self.assertEqual(result, 0)
        printed = output.getvalue()
        self.assertIn("IIROSE-MEDIA-SYNC", printed)
        self.assertIn("tencentscf.com", printed)
        self.assertNotIn("secret-id", printed)
        self.assertNotIn("secret-key", printed)

    def test_main_fails_when_client_url_drifted_from_deployed(self):
        """函数 URL 变了而客户端常量没改：必须让部署失败，否则全体客户端打旧地址。"""

        output = io.StringIO()
        with (
            patch.object(
                deploy_sync,
                "deploy",
                return_value="https://9-new.ap-guangzhou.tencentscf.com",
            ),
            patch.object(
                deploy_sync,
                "read_client_server_url",
                return_value="https://1-old.ap-guangzhou.tencentscf.com",
            ),
            patch.dict(
                deploy_sync.os.environ,
                {
                    "TENCENT_SECRET_ID": "secret-id",
                    "TENCENT_SECRET_KEY": "secret-key",
                },
            ),
            redirect_stderr(output),
            redirect_stdout(output),
        ):
            result = deploy_sync.main(["--source", "cloud/sync"])
        self.assertEqual(result, 1)
        self.assertIn("DEFAULT_SYNC_SERVER_URL", output.getvalue())
        self.assertNotIn("secret-id", output.getvalue())

    def test_main_fails_when_client_url_is_unreadable(self):
        output = io.StringIO()
        with (
            patch.object(
                deploy_sync,
                "deploy",
                return_value="https://1-abc.ap-guangzhou.tencentscf.com",
            ),
            patch.object(deploy_sync, "read_client_server_url", return_value=""),
            patch.dict(
                deploy_sync.os.environ,
                {
                    "TENCENT_SECRET_ID": "secret-id",
                    "TENCENT_SECRET_KEY": "secret-key",
                },
            ),
            redirect_stderr(output),
            redirect_stdout(output),
        ):
            result = deploy_sync.main(["--source", "cloud/sync"])
        self.assertEqual(result, 1)
        self.assertIn("无法校验", output.getvalue())

    def test_read_client_server_url_reads_the_real_repo_constant(self):
        """仓库里确实能读到地址，且形态是 https 的 tencentscf 域名。"""

        url = deploy_sync.read_client_server_url()
        self.assertRegex(
            url, r"^https://[0-9]+-[a-z0-9]+\.ap-guangzhou\.tencentscf\.com$"
        )

    def test_deploy_rejects_missing_credentials_before_touching_cloud(self):
        with self.assertRaisesRegex(deploy_sync.DeploymentError, "缺少"):
            deploy_sync.deploy(Path("cloud/sync"), "", "", "default")


if __name__ == "__main__":
    unittest.main()
