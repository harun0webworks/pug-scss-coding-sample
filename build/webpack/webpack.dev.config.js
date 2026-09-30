const path = require("path");
const paths = require("../../config/paths");
const { merge } = require('webpack-merge');
const webpackBaseConfig = require("./webpack.base.config.js");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { WebpackAssetsManifest } = require("webpack-assets-manifest");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = merge(webpackBaseConfig, {
	mode: "development",
	output: {
		filename: "assets/js/[name].bundle.js",
	},
	devtool: 'source-map',
	module: {
		rules: [
			{
				test: [/.css$|.scss$/],
				exclude: /(node_modules)/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
						// options: { hmr: true },
					},
					{ loader: "css-loader", options: { importLoaders: 1 } },
					{
						loader: "postcss-loader",
						options: {
							postcssOptions: {
								plugins: [["autoprefixer"]]
							},
						},
					},
					{
						loader: "sass-loader",
						options: {
							sourceMap: true,
						}
					},
				],
			},
		],
	},
	devServer: {
    watchFiles: {
      paths: ['dist/**/*'],
      options: {
        usePolling: true,
        interval: 300,
      },
    },
    hot: false,
    liveReload: true,
		client: {
			overlay: true,
		},
		// contentBase: paths.dist,
		static: {
			directory: paths.dist,
			watch: {
				// ignored: '*.txt',
				// usePolling: false,
			},
		},
		// index: "index.html",
		// host: "localhost",
		port: 3000,
		open: false,
	},

	plugins: [
		new MiniCssExtractPlugin({
			filename: "assets/css/[name].bundle.css",
		}),
		new WebpackAssetsManifest({
			output: path.resolve(paths.src, "_data/assets.json"),
			publicPath: "/",
			writeToDisk: true,
			apply(manifest) {
				manifest.set("year", new Date().getFullYear());
			},
		}),
		new CopyWebpackPlugin({
			patterns: [
				{
					from: "./src/assets/images/**/*.{png,jpg,jpeg}",
					to({ context, absoluteFilename }) {
						let tempPath = path.relative(context, absoluteFilename);
						tempPath = tempPath.replace(/src\//g, '');
						// 拡張子を .webp に変更
						tempPath = tempPath.replace(/\.(png|jpe?g)$/i, '.webp');
						return tempPath;
					},
					globOptions: {
						ignore: [
							"**/_*.*",
							"**/inline/**",
						],
					},
				},
			]
		}),
		// new webpack.HotModuleReplacementPlugin(),
	],

});
