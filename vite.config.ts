import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import { visualizer } from 'rollup-plugin-visualizer';
// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(),
  cssInjectedByJsPlugin()
  ],
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'IIROSE-MEDIA-WEB',
      fileName: () => `bundle.js`, // 只生成 UMD 文件
      formats: ['umd'] // 仅输出 UMD 格式
    },
    cssCodeSplit: false, // 不拆分 CSS
    rollupOptions: {
      output: {
        globals: {
          preact: 'Preact'
        }
      },
      plugins: [
        // visualizer({
        //   open: true, // 构建完成后自动打开分析报告
        //   filename: 'stats.html', // 输出文件名
        // })
      ]
    }
  }
})
