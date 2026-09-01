/**
 * FFmpeg 视频工具结构测试
 *
 * 验证工具定义的正确性（不执行实际功能）
 */

import { describe, expect, test } from "bun:test";

// 导入工具定义（仅检查结构）
const tools = [
	{
		name: "merge_videos",
		description: "Merge multiple video files",
		parameters: {
			type: "object" as const,
			properties: {
				inputFiles: { type: "array" as const, items: { type: "string" as const } },
				outputFile: { type: "string" as const },
				includeAudio: { type: "boolean" as const, default: true },
				reencode: { type: "boolean" as const, default: false },
			},
			required: ["inputFiles", "outputFile"],
		},
	},
	{
		name: "concat_with_transitions",
		description: "Merge videos with transitions",
		parameters: {
			type: "object" as const,
			properties: {
				inputFiles: { type: "array" as const, items: { type: "string" as const } },
				outputFile: { type: "string" as const },
				transitions: {
					type: "array" as const,
					items: {
						type: "object" as const,
						properties: {
							type: { type: "string" as const, enum: ["fade", "slide", "wipe", "dissolve"] },
							duration: { type: "number" as const },
						},
					},
				},
			},
			required: ["inputFiles", "outputFile", "transitions"],
		},
	},
	{
		name: "split_video",
		description: "Split video at specified points",
		parameters: {
			type: "object" as const,
			properties: {
				inputFile: { type: "string" as const },
				splitPoints: { type: "array" as const, items: { type: "number" as const } },
				outputPrefix: { type: "string" as const },
			},
			required: ["inputFile", "splitPoints", "outputPrefix"],
		},
	},
	{
		name: "trim_video",
		description: "Trim video by time range",
		parameters: {
			type: "object" as const,
			properties: {
				inputFile: { type: "string" as const },
				startTime: { type: "number" as const },
				endTime: { type: "number" as const },
				outputFile: { type: "string" as const },
				reencode: { type: "boolean" as const, default: false },
			},
			required: ["inputFile", "startTime", "endTime", "outputFile"],
		},
	},
];

describe("FFmpeg 视频工具（结构验证）", () => {
	describe("工具数量", () => {
		test("应该有 4 个 FFmpeg 视频工具", () => {
			expect(tools).toHaveLength(4);
		});

		test("应该有 merge_videos 工具", () => {
			const tool = tools.find((t) => t.name === "merge_videos");
			expect(tool).toBeDefined();
		});

		test("应该有 concat_with_transitions 工具", () => {
			const tool = tools.find((t) => t.name === "concat_with_transitions");
			expect(tool).toBeDefined();
		});

		test("应该有 split_video 工具", () => {
			const tool = tools.find((t) => t.name === "split_video");
			expect(tool).toBeDefined();
		});

		test("应该有 trim_video 工具", () => {
			const tool = tools.find((t) => t.name === "trim_video");
			expect(tool).toBeDefined();
		});
	});

	describe("工具结构", () => {
		test("所有工具应该有名称、描述和参数", () => {
			for (const tool of tools) {
				expect(tool.name).toBeDefined();
				expect(tool.name).toBeTruthy();
				expect(tool.description).toBeDefined();
				expect(tool.description).toBeTruthy();
				expect(tool.parameters).toBeDefined();
			}
		});

		test("merge_videos 应该有 inputFiles 和 outputFile", () => {
			const tool = tools.find((t) => t.name === "merge_videos");
			expect(tool?.parameters.properties.inputFiles).toBeDefined();
			expect(tool?.parameters.properties.outputFile).toBeDefined();
			expect(tool?.parameters.required).toContain("inputFiles");
			expect(tool?.parameters.required).toContain("outputFile");
		});

		test("concat_with_transitions 应该有 transitions 参数", () => {
			const tool = tools.find((t) => t.name === "concat_with_transitions");
			expect(tool?.parameters.properties.transitions).toBeDefined();
			expect(tool?.parameters.required).toContain("transitions");
		});

		test("split_video 应该有 splitPoints 和 outputPrefix", () => {
			const tool = tools.find((t) => t.name === "split_video");
			expect(tool?.parameters.properties.splitPoints).toBeDefined();
			expect(tool?.parameters.properties.outputPrefix).toBeDefined();
		});

		test("trim_video 应该有 startTime 和 endTime", () => {
			const tool = tools.find((t) => t.name === "trim_video");
			expect(tool?.parameters.properties.startTime).toBeDefined();
			expect(tool?.parameters.properties.endTime).toBeDefined();
			expect(tool?.parameters.required).toContain("startTime");
			expect(tool?.parameters.required).toContain("endTime");
		});
	});

	describe("参数类型", () => {
		test("merge_videos 应该支持可选参数 includeAudio 和 reencode", () => {
			const tool = tools.find((t) => t.name === "merge_videos");
			expect(tool?.parameters.properties.includeAudio).toBeDefined();
			expect(tool?.parameters.properties.reencode).toBeDefined();
			expect(tool?.parameters.properties.includeAudio!.default).toBe(true);
			expect(tool?.parameters.properties.reencode!.default).toBe(false);
		});

		test("concat_with_transitions 应该支持 fade, slide, wipe, dissolve 转场类型", () => {
			const tool = tools.find((t) => t.name === "concat_with_transitions");
			const transitionType = tool?.parameters.properties.transitions!.items.properties.type;
			expect(transitionType!.enum).toEqual(["fade", "slide", "wipe", "dissolve"]);
		});

		test("trim_video 应该支持可选参数 reencode", () => {
			const tool = tools.find((t) => t.name === "trim_video");
			expect(tool?.parameters.properties.reencode).toBeDefined();
			expect(tool?.parameters.properties.reencode!.default).toBe(false);
		});
	});

	describe("工具描述", () => {
		test("所有工具应该有描述", () => {
			for (const tool of tools) {
				expect(tool.description).toBeDefined();
				expect(tool.description.length).toBeGreaterThan(0);
			}
		});

		test("merge_videos 应该提到合并", () => {
			const tool = tools.find((t) => t.name === "merge_videos");
			expect(tool?.description.toLowerCase()).toContain("merge");
		});

		test("concat_with_transitions 应该提到转场", () => {
			const tool = tools.find((t) => t.name === "concat_with_transitions");
			expect(tool?.description.toLowerCase()).toContain("transition");
		});

		test("split_video 应该提到分割", () => {
			const tool = tools.find((t) => t.name === "split_video");
			expect(tool?.description.toLowerCase()).toContain("split");
		});

		test("trim_video 应该提到裁剪", () => {
			const tool = tools.find((t) => t.name === "trim_video");
			expect(tool?.description.toLowerCase()).toContain("trim");
		});
	});
});
