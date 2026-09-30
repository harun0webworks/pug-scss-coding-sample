const webpack = require('webpack');
const path = require("path");
const paths = require("../../config/paths");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
	target: 'web',
	entry: {
		main: [
			path.resolve(paths.srcAssets, "js/main.js"),
			path.resolve(paths.srcAssets, "scss/main.scss"),
		]
	},
	output: {
		path: path.resolve(paths.dist),
		publicPath: "",
		assetModuleFilename: (pathData) => {
			let tempPath = pathData.filename;
			tempPath = tempPath.replace("src\/", "/");
			return tempPath;
		},
	},
	module: {
		rules: [
			{
				test: /\.m?js$/,
				// exclude: /node_modules\/(?!(dom7|ssr-window|swiper)\/).*/,
				exclude: /(node_modules)/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["@babel/preset-env"],
					},
				},
			},
			{
				test: /\.(jpe?g|png|gif)$/,
				type: 'asset/resource'
			},
			{
				test: /\.svg$/,
				include: /inline/,
				type: 'asset/inline',
			},
			{
				test: /\.svg$/,
				exclude: /inline/,
				type: 'asset/resource'
			},
		],
	},
	plugins: [
		new CopyWebpackPlugin({
			patterns: [
				{
					from: "./src/assets/images/**/*.{png,jpg,jpeg,svg}",
					to({ context, absoluteFilename }) {
						let tempPath = path.relative(context, absoluteFilename);
						tempPath = tempPath.replace(/src\//g, '');
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
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: "jquery",
		})
	],
};
