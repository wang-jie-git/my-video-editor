/**
 * 语义素材索引（最小版）
 *
 * 设计原则（避免检索时全量视觉分析的成本灾难）：
 * - 索引时：素材被分析后把标签写入索引（一次性成本，由 AI 调用 index_asset 触发）
 * - 检索时：search_assets 只在索引上做关键词匹配（零视觉调用）
 *
 * 存储：localStorage（key: "semantic-asset-index"）
 * - 索引是辅助数据，与素材库（IndexedDB）解耦
 * - 素材删除时索引条目会残留，提供清理能力
 */

import type { MediaType } from "@/types/assets";

export interface AssetIndexEntry {
	assetId: string;
	name: string;
	type: MediaType;
	tags: string[];
	description?: string;
	indexedAt: number;
}

const STORAGE_KEY = "semantic-asset-index";

function readIndex(): AssetIndexEntry[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as AssetIndexEntry[]) : [];
	} catch {
		return [];
	}
}

function writeIndex(entries: AssetIndexEntry[]): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	} catch (error) {
		console.error("[AssetIndex] Failed to persist index:", error);
	}
}

/**
 * 写入/更新素材索引条目（indexedAt 由内部自动填充）
 */
export function indexAsset(
	entry: Omit<AssetIndexEntry, "indexedAt">,
): { success: boolean; message: string } {
	const entries = readIndex();
	const existing = entries.find((e) => e.assetId === entry.assetId);
	if (existing) {
		// 合并标签（去重）
		const mergedTags = Array.from(new Set([...existing.tags, ...entry.tags]));
		Object.assign(existing, entry, { tags: mergedTags, indexedAt: Date.now() });
	} else {
		entries.push({ ...entry, indexedAt: Date.now() });
	}
	writeIndex(entries);
	return {
		success: true,
		message: `Indexed asset '${entry.name}' with ${entry.tags.length} tag(s)`,
	};
}

/**
 * 语义检索：关键词匹配 标签/文件名/描述
 *
 * 匹配策略：
 * - 标签精确包含（最高分）
 * - 文件名包含（次之）
 * - 描述包含（再次）
 * 支持中英文关键词（子串匹配，可多词空格分词 AND 匹配）。
 */
export function searchAssets(query: string): AssetIndexEntry[] {
	const entries = readIndex();
	const keywords = query
		.toLowerCase()
		.split(/\s+/)
		.filter((k) => k.length > 0);
	if (keywords.length === 0) return [];

	const scored = entries.map((entry) => {
		const name = entry.name.toLowerCase();
		const desc = (entry.description ?? "").toLowerCase();
		const tags = entry.tags.map((t) => t.toLowerCase());

		let score = 0;
		for (const kw of keywords) {
			if (tags.some((t) => t.includes(kw))) score += 3;
			else if (name.includes(kw)) score += 2;
			else if (desc.includes(kw)) score += 1;
		}
		return { entry, score };
	});

	return scored
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.map((s) => s.entry);
}

/**
 * 获取全部索引条目（AI 查看哪些素材已索引）
 */
export function getAssetIndex(): AssetIndexEntry[] {
	return readIndex();
}

/**
 * 删除素材索引条目（素材删除时调用）
 */
export function removeAssetIndex(assetId: string): void {
	const entries = readIndex().filter((e) => e.assetId !== assetId);
	writeIndex(entries);
}

/**
 * 从文件名提取基础标签（零成本，作为视觉分析的补充）
 */
export function extractNameTags(name: string): string[] {
	const base = name.replace(/\.[^.]+$/, ""); // 去扩展名
	const parts = base.split(/[-_\s.]+/).filter((p) => p.length > 0);
	// 过滤纯数字/单字符噪声
	return parts.filter((p) => !/^\d+$/.test(p) && p.length >= 2);
}
