import { defineConfig } from "vitest/config";

// 客户端测试：只需要浏览器环境垫片（window / indexedDB / crypto.subtle），
// 不加载 preact/tailwind 插件——被测的是纯逻辑与存储层，与视图无关。
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
  },
});
