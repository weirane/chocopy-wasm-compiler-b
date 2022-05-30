const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require('path');
const webpack = require('webpack');
module.exports = {
  entry: './webstart.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /(node_modules|tests)/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          "style-loader",
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
    ],
  },
  devtool: 'inline-source-map',
  externals: {
    wabt: 'wabt'
  },
  devServer: {
    hot: true,  // 打开热更新开关
  },
  resolve: {
    extensions: ['.ts','.js']
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: 'webstart.js'
  },
  plugins: [

    new HtmlWebpackPlugin({
      hash: true,
      template: "./index.html",
    }),
  ],
  
};
