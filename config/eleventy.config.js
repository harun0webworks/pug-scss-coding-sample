const path = require("path");
const paths = require("./paths");
const prettier = require("prettier");

module.exports = async function (eleventyConfig) {
	// ESMプラグインをdynamic importで読み込み
	const pluginPug = await import("@11ty/eleventy-plugin-pug");
	eleventyConfig.addPlugin(pluginPug.default, {
		// debug: true,
		pretty: true,
	});

	// img・sourceにwidth/height、imgにalt・loadingを自動付与
	eleventyConfig.addTransform(
		"image-attributes",
		require("../build/scripts/image-attributes")
	);

	eleventyConfig.addTransform("prettier", async (content, outputPath) => {
		if (outputPath && outputPath.endsWith(".html")) {
			return await prettier.format(content, {
				parser: "html",
				// タグ前後の空白を気にせず改行・インデントする（"><source" のような崩れを防ぐ）
				htmlWhitespaceSensitivity: "ignore",
				printWidth: 120,
			});
		}
		return content;
	});

	// Copy `src/static/` to `dist/`
	// eleventyConfig.ignores.add("**/_*.*");
	eleventyConfig.addPassthroughCopy({ "src/static/": "/" });
	// eleventyConfig.addPassthroughCopy({ "src/assets/images": "/assets/images" });

	return {
		dir: {
			input: "src/pages",
			output: "dist",
			includes: "_includes",
			data: "../_data",
		},
	};
};
