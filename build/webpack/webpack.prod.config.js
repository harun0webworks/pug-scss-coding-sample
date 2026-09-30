const path = require("path");
const paths = require("../../config/paths");
const { merge } = require('webpack-merge');
const webpack = require('webpack');
const webpackBaseConfig = require("./webpack.base.config.js");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');
const { WebpackAssetsManifest } = require("webpack-assets-manifest");
const crypto = require('crypto');

const autoprefixer = require("autoprefixer");

// ビルド情報を生成
const buildDate = new Date().toISOString();

// ファイル内容ベースのバナーを追加するカスタムプラグイン
class ContentHashBannerPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap('ContentHashBannerPlugin', (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: 'ContentHashBannerPlugin',
					stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
				},
				(assets) => {
					Object.keys(assets).forEach((filename) => {
						if (/\.(js|css)$/.test(filename)) {
							const asset = assets[filename];
							const source = asset.source();
							const hash = crypto.createHash('md5').update(source).digest('hex').substring(0, 8);
							const banner = `/*! Build: ${buildDate} | Hash: ${hash} */\n`;

							compilation.updateAsset(filename, new webpack.sources.ConcatSource(banner, asset));
						}
					});
				}
			);
		});
	}
}

module.exports = merge(webpackBaseConfig, {
	mode: "production",
	output: {
		filename: "assets/js/[name].bundle.js",
	},
	module: {
		rules: [
			{
				test: [/.css$|.scss$/],
				exclude: /(node_modules)/,
				use: [
					MiniCssExtractPlugin.loader,
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
					},
				],
			},
		],
	},
	plugins: [
		new ContentHashBannerPlugin(),
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
		new ImageMinimizerPlugin({
			test: /\.(jpe?g|png)$/i,
			deleteOriginalAssets: false,
			generator: [
				{
					type: 'asset',
					implementation: ImageMinimizerPlugin.sharpGenerate,
					options: {
						encodeOptions: {
							webp: {
								quality: 90,
							},
						},
					},
				},
			],
		}),
	],
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				extractComments: false,
				terserOptions: {
					format: {
						comments: /^!/,
					},
				},
			}),
		],
	},
});
