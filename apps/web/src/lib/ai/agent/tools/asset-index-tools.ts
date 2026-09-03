/**
 * 语义素材匹配工具（最小版）
 *
 * 三个工具闭环：
 * 1. index_asset —— 索引素材（标签 + 描述，AI 在 video_analyze 后调用，一次性成本）
 * 2. search_assets —— 语义检索（纯索引查询，零视觉调用）
 * 3. list_asset_index —— 查看索引状态（发现哪些素材还没索引）
 */

import type { AgentTool } from "./types";
import {
	indexAsset as writeIndex,
	searchAssets as runSearch,
	getAssetIndex,
	extractNameTags,
} from "./semantic-asset-index";

/**
 * 懒加载 EditorCore（避免模块加载期循环依赖：
 * EditorCore → tools/index → asset-index-tools → EditorCore）
 */
async function getEditorCore() {
	const { EditorCore } = await import("@/core");
	return EditorCore.getInstance();
}

async function resolveAsset(assetId: string) {
	const editor = await getEditorCore();
	const assets = editor.media.getAssets();
	return assets.find(
		(a) => a.id === assetId || a.name === assetId || a.name.includes(assetId),
	);
}

export const indexAssetTool: AgentTool = {
	name: "index_asset",
	description:
		"Index a media asset with semantic tags for later retrieval. Call AFTER video_analyze: pass 3-8 concise content tags (e.g. ['rain', 'city', 'night']) and an optional one-line description. Tags are extracted from filename automatically even without visual analysis (zero cost). Indexed assets can be found instantly by search_assets.",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name.",
			},
			tags: {
				type: "array",
				items: { type: "string" },
				description: "Semantic content tags (3-8 recommended). Chinese or English.",
			},
			description: {
				type: "string",
				description: "Optional one-line content description.",
			},
		},
		required: ["assetId"],
	},
	async execute(args) {
		const assetId = args.assetId as string | undefined;
		if (!assetId) return { success: false, message: "assetId is required" };
		const asset = await resolveAsset(assetId);
		if (!asset) return { success: false, message: `Media asset not found: ${assetId}` };

		// 显式标签 + 文件名自动标签合并
		const explicitTags = Array.isArray(args.tags)
			? (args.tags as string[]).map((t) => t.trim()).filter((t) => t.length > 0)
			: [];
		const nameTags = extractNameTags(asset.name);
		const tags = Array.from(new Set([...nameTags, ...explicitTags]));

		const result = writeIndex({
			assetId: asset.id,
			name: asset.name,
			type: asset.type,
			tags,
			description: (args.description as string | undefined) ?? undefined,
		});

		return {
			success: true,
			message: `${result.message} (${nameTags.length} auto from filename + ${explicitTags.length} explicit)`,
			data: { tags },
		};
	},
};

export const searchAssetsTool: AgentTool = {
	name: "search_assets",
	description:
		"Semantic search over indexed media assets by content tags/name/description (zero vision cost). Use when the user asks for footage by CONTENT (e.g. '找下雨的素材', 'a clip of a cat'). Returns matching assets with scores. If nothing matches, suggest running index_asset on candidates first.",
	parameters: {
		type: "object",
		properties: {
			query: {
				type: "string",
				description: "Content keywords (Chinese or English, space-separated for AND).",
			},
		},
		required: ["query"],
	},
	async execute(args) {
		const query = args.query as string | undefined;
		if (!query?.trim()) return { success: false, message: "query is required" };

		const results = runSearch(query);
		return {
			success: true,
			message: `Found ${results.length} matching asset(s) for "${query}"`,
			data: {
				results: results.map((r) => ({
					assetId: r.assetId,
					name: r.name,
					type: r.type,
					tags: r.tags,
					description: r.description,
				})),
			},
		};
	},
};

export const listAssetIndexTool: AgentTool = {
	name: "list_asset_index",
	description:
		"List all indexed media assets with their semantic tags. Use to see which assets are indexed and discover gaps (assets that have not been indexed yet).",
	parameters: {
		type: "object",
		properties: {},
		required: [],
	},
	async execute() {
		const indexed = getAssetIndex();
		const editor = await getEditorCore();
		const allAssets = editor.media.getAssets();
		const indexedIds = new Set(indexed.map((i) => i.assetId));
		const notIndexed = allAssets
			.filter((a) => !indexedIds.has(a.id))
			.map((a) => ({ id: a.id, name: a.name, type: a.type }));

		return {
			success: true,
			message: `Indexed ${indexed.length}/${allAssets.length} asset(s)`,
			data: {
				indexed: indexed.map((i) => ({
					assetId: i.assetId,
					name: i.name,
					type: i.type,
					tags: i.tags,
					description: i.description,
				})),
				notIndexed,
			},
		};
	},
};

export const assetIndexTools: AgentTool[] = [
	indexAssetTool,
	searchAssetsTool,
	listAssetIndexTool,
];
