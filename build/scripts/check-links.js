#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const distDir = path.resolve(__dirname, '../../dist');

// HTMLファイルからリンクを抽出
function extractLinks() {
	const htmlFiles = glob.sync(`${distDir}/**/*.html`);
	const links = [];

	htmlFiles.forEach(file => {
		const content = fs.readFileSync(file, 'utf-8');
		const relativePath = path.relative(distDir, file);

		// aタグを抽出（href属性の有無に関わらず）
		const aTagPattern = /<a\s+([^>]*?)>/gi;
		let match;

		while ((match = aTagPattern.exec(content)) !== null) {
			const attributes = match[1];
			const hrefMatch = /href=["']([^"']*)["']/i.exec(attributes);

			links.push({
				file: relativePath,
				href: hrefMatch ? hrefMatch[1] : null,
				fullTag: match[0]
			});
		}
	});

	return links;
}

// HTMLファイルからすべてのid属性を抽出
function extractIds() {
	const htmlFiles = glob.sync(`${distDir}/**/*.html`);
	const ids = {};

	htmlFiles.forEach(file => {
		const content = fs.readFileSync(file, 'utf-8');
		const relativePath = path.relative(distDir, file);
		const idPattern = /id=["']([^"']+)["']/gi;
		let match;

		ids[relativePath] = new Set();
		while ((match = idPattern.exec(content)) !== null) {
			ids[relativePath].add(match[1]);
		}
	});

	return ids;
}

// リンクが有効かチェック
function checkLink(link, allIds) {
	const { file, href } = link;

	// href属性がない、または空
	if (!href || href.trim() === '') {
		return {
			valid: false,
			reason: 'href属性が空またはありません',
			type: 'empty'
		};
	}

	// 外部リンク（スキップ）
	if (/^(https?:\/\/|mailto:|tel:|ftp:)/i.test(href)) {
		return { valid: true, type: 'external' };
	}

	// JavaScriptリンク（スキップ）
	if (/^javascript:/i.test(href)) {
		return { valid: true, type: 'javascript' };
	}

	// ハッシュのみのリンク（同じページ内）
	if (href.startsWith('#')) {
		const targetId = href.substring(1);
		if (allIds[file] && allIds[file].has(targetId)) {
			return { valid: true, type: 'hash' };
		}
		return {
			valid: false,
			reason: `id="${targetId}" が見つかりません`,
			type: 'hash'
		};
	}

	// パス + ハッシュ（別ページの特定要素）
	const hashIndex = href.indexOf('#');
	let targetPath = href;
	let targetHash = null;

	if (hashIndex !== -1) {
		targetPath = href.substring(0, hashIndex);
		targetHash = href.substring(hashIndex + 1);
	}

	// 絶対パス or 相対パスを正規化
	let resolvedPath;
	if (targetPath.startsWith('/')) {
		// 絶対パス
		resolvedPath = targetPath.substring(1); // 先頭の/を削除
	} else {
		// 相対パス
		const currentDir = path.dirname(file);
		resolvedPath = path.normalize(path.join(currentDir, targetPath));
	}

	// .htmlがない場合は追加して試す
	const possiblePaths = [
		resolvedPath,
		resolvedPath + '.html',
		path.join(resolvedPath, 'index.html')
	];

	let foundPath = null;
	for (const p of possiblePaths) {
		const fullPath = path.join(distDir, p);
		if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
			foundPath = p;
			break;
		}
	}

	if (!foundPath) {
		return {
			valid: false,
			reason: `ファイルが見つかりません: ${targetPath}`,
			type: 'internal'
		};
	}

	// ハッシュリンクのチェック
	if (targetHash) {
		if (allIds[foundPath] && allIds[foundPath].has(targetHash)) {
			return { valid: true, type: 'internal-hash' };
		}
		return {
			valid: false,
			reason: `${foundPath} 内に id="${targetHash}" が見つかりません`,
			type: 'internal-hash'
		};
	}

	return { valid: true, type: 'internal' };
}

// メイン処理
function main() {
	console.log('\n🔗 リンクチェックを実行中...\n');

	const links = extractLinks();
	const allIds = extractIds();
	const errors = [];

	links.forEach(link => {
		const result = checkLink(link, allIds);
		if (!result.valid) {
			errors.push({
				...link,
				...result
			});
		}
	});

	if (errors.length === 0) {
		console.log('✅ すべてのリンクが正常です\n');
		return;
	}

	console.log(`⚠️  ${errors.length} 個の問題が見つかりました:\n`);

	// エラーをタイプ別にグループ化
	const emptyLinks = errors.filter(e => e.type === 'empty');
	const brokenInternalLinks = errors.filter(e => e.type === 'internal');
	const brokenHashLinks = errors.filter(e => e.type === 'hash');
	const brokenInternalHashLinks = errors.filter(e => e.type === 'internal-hash');

	if (emptyLinks.length > 0) {
		console.log('📌 空のリンク:');
		emptyLinks.forEach(err => {
			console.log(`   ${err.file}`);
			console.log(`   ${err.fullTag}`);
			console.log(`   → ${err.reason}\n`);
		});
	}

	if (brokenInternalLinks.length > 0) {
		console.log('📌 存在しないページへのリンク:');
		brokenInternalLinks.forEach(err => {
			console.log(`   ${err.file} → ${err.href}`);
			console.log(`   → ${err.reason}\n`);
		});
	}

	if (brokenHashLinks.length > 0) {
		console.log('📌 存在しないID（同一ページ内）:');
		brokenHashLinks.forEach(err => {
			console.log(`   ${err.file} → ${err.href}`);
			console.log(`   → ${err.reason}\n`);
		});
	}

	if (brokenInternalHashLinks.length > 0) {
		console.log('📌 存在しないID（別ページ）:');
		brokenInternalHashLinks.forEach(err => {
			console.log(`   ${err.file} → ${err.href}`);
			console.log(`   → ${err.reason}\n`);
		});
	}

	console.log(`合計 ${errors.length} 個の問題があります\n`);
}

main();
