const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'development', // 使用生产模式，自动启用最佳压缩
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true, // 每次构建前清理输出目录
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      react: "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.worker\.ts$/,
        use: {
          loader: 'worker-loader',
          options: {
            inline: 'fallback',
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  // optimization: {
  //   minimize: true, // 启用最小化
  //   minimizer: [
  //     new TerserPlugin({
  //       parallel: true, // 启用多进程并行运行以提高构建速度
  //       terserOptions: {
  //         compress: {
  //           drop_console: true, // 移除 console 语句
  //           drop_debugger: true, // 移除 debugger 语句
  //           pure_funcs: ['console.log'], // 移除指定的函数调用
  //           passes: 2, // 多次优化传递
  //         },
  //         mangle: {
  //           toplevel: true, // 混淆顶级作用域中的变量和函数名
  //         },
  //         format: {
  //           comments: false, // 移除所有注释
  //         },
  //       },
  //       extractComments: false, // 不将注释提取到单独的文件中
  //     }),
  //   ],
  // },
};
