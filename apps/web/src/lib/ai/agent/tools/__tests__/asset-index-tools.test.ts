/**
 * 语义素材索引测试
 *
 * 覆盖：
 * - 文件名自动标签提取
 * - 索引写入/合并
 * - 关键词检索（标签/文件名/描述）
 * - 工具注册链（Phase 10）
 */
import { describe, expect, test, beforeEach } from "bun:test";
import {
	extractNameTags,
	indexAsset,
	searchAssets,
	getAssetIndex,
	removeAssetIndex,
} from "../semantic-asset-index";
import { assetIndexTools } from "../asset-index-tools";
import { getAllTools } from "../index";

// --- localStorage mock（Node 环境） ---
function createLocalStorageMock() {
	let store: Record<string, string> = {};
	return {
		getItem: (k: string) => store[k] ?? null,
		setItem: (k: string, v: string) => {
			store[k] = v;
		},
		removeItem: (k: string) => {
			delete store[k];
		},
		clear: () => {
			store = {};
		},
	};
}

beforeEach(() => {
	const mock = createLocalStorageMock();
	(globalThis as any).window = { localStorage: mock };
	(globalThis as any).localStorage = mock;
});

describe("extractNameTags 文件名自动标签", () => {
	test("提取去扩展名的有效词", () => {
		const tags = extractNameTags("rain-city-night.mp4");
		expect(tags).toContain("rain");
		expect(tags).toContain("city");
		expect(tags).toContain("night");
	});

	test("过滤纯数字和单字符噪声", () => {
		const tags = extractNameTags("IMG_2024_001_a.mp4");
		expect(tags.every((t) => !/^\d+$/.test(t))).toBe(true);
		expect(tags.some((t) => t === "a")).toBe(false);
	});
});

describe("indexAsset / getAssetIndex / removeAssetIndex", () => {
	test("写入新条目", () => {
		const r = indexAsset({
			assetId: "a1",
			name: "rain.mp4",
			type: "video",
			tags: ["rain", "weather"],
		});
		expect(r.success).toBe(true);
		expect(getAssetIndex()).toHaveLength(1);
	});

	test("重复索引合并标签（去重）", () => {
		indexAsset({ assetId: "a1", name: "rain.mp4", type: "video", tags: ["rain"] });
		indexAsset({ assetId: "a1", name: "rain.mp4", type: "video", tags: ["storm"] });
		const entry = getAssetIndex()[0];
		expect(entry.tags).toContain("rain");
		expect(entry.tags).toContain("storm");
		expect(getAssetIndex()).toHaveLength(1);
	});

	test("删除条目", () => {
		indexAsset({ assetId: "a1", name: "rain.mp4", type: "video", tags: ["rain"] });
		removeAssetIndex("a1");
		expect(getAssetIndex()).toHaveLength(0);
	});
});

describe("searchAssets 语义检索", () => {
	beforeEach(() => {
		indexAsset({ assetId: "v1", name: "city-night.mp4", type: "video", tags: ["city", "night", "neon"] });
		indexAsset({ assetId: "v2", name: "cat.mp4", type: "video", tags: ["cat", "animal"] });
		indexAsset({ assetId: "a1", name: "rain.wav", type: "audio", tags: ["rain", "weather"], description: "下雨环境声" });
	});

	test("按标签精确匹配", () => {
		const r = searchAssets("cat");
		expect(r.map((e) => e.assetId)).toContain("v2");
	});

	test("按描述匹配", () => {
		const r = searchAssets("下雨");
		expect(r.map((e) => e.assetId)).toContain("a1");
	});

	test("按文件名匹配", () => {
		const r = searchAssets("city");
		expect(r.map((e) => e.assetId)).toContain("v1");
	});

	test("标签命中优先于文件名", () => {
		// v2 标签含 animal，a1 描述含 下雨；查 animal 应 v2 排最前
		const r = searchAssets("animal");
		expect(r[0].assetId).toBe("v2");
	});

	test("无匹配返回空", () => {
		expect(searchAssets("spaceship")).toHaveLength(0);
	});

	test("空查询返回空", () => {
		expect(searchAssets("")).toHaveLength(0);
	});
});

describe("工具注册链（Phase 10）", () => {
	test("assetIndexTools 包含 3 个工具", () => {
		const names = assetIndexTools.map((t) => t.name);
		expect(names).toContain("index_asset");
		expect(names).toContain("search_assets");
		expect(names).toContain("list_asset_index");
	});

	test("getAllTools 已注册 assetIndexTools", () => {
		const names = getAllTools().map((t) => t.name);
		expect(names).toContain("index_asset");
		expect(names).toContain("search_assets");
		expect(names).toContain("list_asset_index");
	});

	test("search_assets 无视觉成本（纯索引查询）", () => {
		const tool = assetIndexTools.find((t) => t.name === "search_assets")!;
		expect(tool.requiresConfirmation).toBeUndefined();
	});
});
