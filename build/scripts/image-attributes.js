const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const paths = require("../../config/paths");

const TAG_PATTERN = /<(?:img|source)\b[^>]*>/gi;
const ATTR_PATTERN = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const sizeCache = new Map();

function isFile(file) {
	try {
		return fs.statSync(file).isFile();
	} catch {
		return false;
	}
}

// タグの属性をMapにする
function parseAttributes(tag) {
	const attrs = new Map();
	const body = tag.replace(/^<\w+/, "").replace(/\/?>$/, "");
	for (const [, name, dq, sq, uq] of body.matchAll(ATTR_PATTERN)) {
		attrs.set(name.toLowerCase(), dq ?? sq ?? uq ?? "");
	}
	return attrs;
}

// URLからsrc内の画像ファイルを探す
function resolveImageFile(url, pageUrl) {
	if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith("data:")) {
		return null;
	}
	const pathname = decodeURIComponent(new URL(url, `http://localhost${pageUrl}`).pathname);
	const file = path.join(paths.src, pathname);
	const candidates = [file];
	// webpはビルド時に生成されるので、変換前の画像でサイズを取る（xxx.jpg.webp → xxx.jpg、xxx.webp → xxx.jpg など）
	if (file.endsWith(".webp")) {
		const base = file.slice(0, -".webp".length);
		candidates.push(base, ...[".jpg", ".jpeg", ".png"].map((ext) => base + ext));
	}
	return candidates.find(isFile) ?? null;
}

async function getImageSize(file) {
	const key = `${file}:${fs.statSync(file).mtimeMs}`;
	if (!sizeCache.has(key)) {
		const { width, height, orientation } = await sharp(file).metadata();
		// EXIFで90度回転している写真は縦横を入れ替える
		sizeCache.set(key, orientation >= 5 ? { width: height, height: width } : { width, height });
	}
	return sizeCache.get(key);
}

// srcまたはsrcsetの先頭の候補から、width・heightを求める
async function getSize(value, pageUrl, outputPath) {
	const [url, descriptor = ""] = value.split(",")[0].trim().split(/\s+/);
	if (!url) {
		return null;
	}
	const file = resolveImageFile(url, pageUrl);
	if (!file) {
		if (!/^(?:[a-z]+:)?\/\//i.test(url) && !url.startsWith("data:")) {
			console.warn(`[image-attributes] 画像が見つかりません: ${url} (${outputPath})`);
		}
		return null;
	}
	const size = await getImageSize(file);
	if (!size.width || !size.height) {
		return null;
	}
	// 2xなどの指定がある場合は表示サイズに戻す
	const density = descriptor.match(/^([\d.]+)x$/);
	const ratio = density ? Number(density[1]) : 1;
	return {
		width: Math.round(size.width / ratio),
		height: Math.round(size.height / ratio),
	};
}

async function processTag(tag, pageUrl, outputPath) {
	const isImg = /^<img/i.test(tag);
	const attrs = parseAttributes(tag);
	const additions = [];

	if (!attrs.has("width") && !attrs.has("height")) {
		const target = isImg ? attrs.get("src") || attrs.get("srcset") : attrs.get("srcset");
		const size = target ? await getSize(target, pageUrl, outputPath) : null;
		if (size) {
			additions.push(`width="${size.width}"`, `height="${size.height}"`);
		}
	}
	if (isImg && !attrs.has("alt")) {
		additions.push('alt=""');
	}
	if (isImg && !attrs.has("loading")) {
		additions.push('loading="lazy"');
	}

	if (!additions.length) {
		return tag;
	}
	return tag.replace(/(\s*\/?>)$/, ` ${additions.join(" ")}$1`);
}

module.exports = async function (content, outputPath) {
	if (!outputPath || !outputPath.endsWith(".html")) {
		return content;
	}
	const pageUrl = this.page?.url ?? "/";
	const replacements = new Map();
	for (const tag of new Set(content.match(TAG_PATTERN))) {
		replacements.set(tag, await processTag(tag, pageUrl, outputPath));
	}
	return content.replace(TAG_PATTERN, (tag) => replacements.get(tag));
};
