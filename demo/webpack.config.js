const path = require('path');
const webpack = require('webpack');
const atl = require('awesome-typescript-loader');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const chunkOrder = ['inline', 'polyfill', 'main'];
const paths = {};
paths.root = paths.root || path.resolve(__dirname);
paths.dist = path.resolve(__dirname, 'dist');
paths.indexTemplate = path.resolve(__dirname, 'src/index.ejs');
paths.tsconfig = path.resolve(__dirname, '../tsconfig.json');

module.exports = {
  devtool: 'source-map',
  context: paths.root,
  entry: {
    main: path.resolve(__dirname, 'src/bundles/main.ts'),
    polyfills: path.resolve(__dirname, 'src/bundles/polyfills.ts')
  },
  output: {
    path: paths.dist,
    filename: 'bundles/[name].bundle.js',
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  devServer: {
    host: '0.0.0.0',
    port: 8080,
    historyApiFallback: true,
    contentBase: 'demo/dist'
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        loaders: [
          {
            loader: 'awesome-typescript-loader',
            query: {
              tsconfig: paths.tsconfig
            }
          },
        ],
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: paths.indexTemplate,
      hash: true,
      chunksSortMode: (a, b) => chunkOrder.indexOf(a.names[0]) > chunkOrder.indexOf(b.names[0]),
    }),

    // Fix for critical dependency warning due to System.import in angular.
    // See https://github.com/angular/angular/issues/11580
    new webpack.ContextReplacementPlugin(
      /angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
      paths.app
    ),
  ],
  node: {
    fs: 'empty',
    crypto: 'empty',
    module: false,
    clearImmediate: false,
    setImmediate: false
  }
};
