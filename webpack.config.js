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
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader', // 使用 Babel 处理 TypeScript 和 JavaScript 文件
          },
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true, // 让 ts-loader 只进行类型检查，具体代码优化由 Babel 和 Webpack 完成
            },
          },
        ],
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
  optimization: {
    minimize: true,
    usedExports: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            dead_code: true, // 移除无用的代码
            unused: true,    // 移除未被使用的函数和变量
          },
          output: {
            comments: false, // 去掉注释
          },
        },
        extractComments: false,
      }),
    ],
  },
}
