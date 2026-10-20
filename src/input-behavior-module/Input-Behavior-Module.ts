import { PluginSettings } from "../settings/pluginSettings/PluginSettings";
import { InputPlatformAnalysis } from "./InputPlatformAnalysis";

/**
 * 代理 @ 事件的模块
 */
export class Input_Behavior_Module {
  static firstTime = true;

  public static init(
    changeSearchKeyword: (keyword: string | null) => void,
    ShowOrHideIMC: () => Promise<void>,
  ) {
    if (!window.Utils) return;

    // 1. 确保原始方法只备份一次
    if (!window.Utils.IMW?.backup.moveinputDo) {
      window.Utils.IMW = {
        backup: {
          moveinputDo: window.Utils.service.moveinputDo,
        },
      };
    }

    // 2. 执行应用逻辑
    this.applyBehavior(changeSearchKeyword, ShowOrHideIMC);
  }

  /**
   * 拆分出来的应用逻辑：可以被外部多次调用以更新状态
   */
  public static applyBehavior(
    changeSearchKeyword: (keyword: string | null) => void,
    ShowOrHideIMC: () => Promise<void>,
  ) {
    if (!window.Utils || !window.Utils.IMW) return; // 1. 显式检查 IMW 是否存在

    const ps = PluginSettings.getPluginSetting();

    // 2. 使用非空断言 ! 告诉 TS 你确定 backup 此时一定存在
    const backupMethod = window.Utils.IMW.backup.moveinputDo;

    if (!ps.chatBox.isProxyAtInput) {
      // 还原回备份的原始方法
      window.Utils.service.moveinputDo = backupMethod;
    } else {
      // 绑定代理逻辑
      window.Utils.service.moveinputDo = this.changedOriginalMoveInputDo.bind(
        this,
        backupMethod,
        changeSearchKeyword,
        ShowOrHideIMC,
      );
    }
  }

  /**
   * 代理 moveinputDo 方法：
   * 必须保持同步函数契约！严禁声明为 async 或返回 Promise，
   * 否则宿站在私聊模式下（pmFull）执行 if (pmFull && !moveinputDo(val, 1)) 会因 Promise 为真值而判定未拦截，进而误外发私聊！
   */
  public static changedOriginalMoveInputDo(
    originalMethod: Function,
    changeSearchKeyword: (keyword: string | null) => void,
    ShowOrHideIMC: () => Promise<void>,
    e: string,
    t?: any,
  ): any {
    // 1. 显式检查设置项是否开启
    const ps = PluginSettings.getPluginSetting();
    if (!ps.chatBox.isProxyAtInput) {
      return originalMethod(e, t);
    }

    if (typeof e === "string" && e.startsWith("@")) {
      // 2. 宿站原生快捷键、单字符 @、换背景图 Probe 状态放行原生处理
      if (
        e.length === 1 ||
        e === "@@@" ||
        e.startsWith("@@") ||
        (e.length === 2 && /\p{P}|\p{S}/u.test(e[1])) ||
        window.Probe?.getMediaLink
      ) {
        return originalMethod(e, t);
      }

      // 3. 拦截成功：清空输入框（针对宿站可能未清空的情形进行兜底保障）
      if ((window as any).moveinput?.val) {
        try {
          (window as any).moveinput.val("");
        } catch {
          /* ignore */
        }
      }

      // 4. 后台异步执行链接解析或搜索派发，完全与宿站主线程解耦
      void InputPlatformAnalysis.Analysis(
        e,
        originalMethod,
        t,
        changeSearchKeyword,
        ShowOrHideIMC,
      );

      // 5. 必须同步返回 false！确保私聊 !moveinputDo(this.value, 1) 为 true，从而阻断 msgfetch 发送私聊
      return false;
    } else {
      return originalMethod(e, t);
    }
  }
}
