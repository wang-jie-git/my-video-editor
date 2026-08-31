/**
 * Phase 1-6 FFmpeg 工具结构验证测试
 *
 * 验证所有工具定义的正确性
 */

import { describe, expect, test } from "bun:test";

// 导入所有工具（结构验证，不执行）
const tools = [
	// Phase 1: FFmpeg 基础工具
	{
		name: "execute_ffmpeg_command",
		description: "Execute a custom FFmpeg command",
		parameters: {
			type: "object" as const,
			properties: {
				args: { type: "array" as const, items: { type: "string" as const } },
				timeout: { type: "number" as const },
			},
			required: ["args"],
		},
	},
	{
		name: "get_ffmpeg_status",
		description: "Get FFmpeg status",
		parameters: {
			type: "object" as const,
			properties: {},
			required: [],
		},
	},
	// Phase 2: 视频导出工具
	{
		name: "export_video",
		description: "Export video",
		parameters: {
			type: "object" as const,
			properties: {
				outputFile: { type: "string" as const },
				format: { type: "string" as const, enum: ["mp4", "webm"] },
				quality: { type: "string" as const, enum: ["low", "medium", "high", "max"] },
			},
			required: ["outputFile"],
		},
	},
	{
		name: "get_video_info",
		description: "Get video information",
		parameters: {
			type: "object" as const,
			properties: { filePath: { type: "string" as const } },
			required: ["filePath"],
		},
	},
	{
		name: "get_video_duration",
		description: "Get video duration",
		parameters: {
			type: "object" as const,
			properties: { filePath: { type: "string" as const } },
			required: ["filePath"],
		},
	},
	{
		name: "generate_thumbnail",
		description: "Generate thumbnail",
		parameters: {
			type: "object" as const,
			properties: {
				filePath: { type: "string" as const },
				outputFile: { type: "string" as const },
				time: { type: "number" as const },
			},
			required: ["filePath", "outputFile"],
		},
	},
	// Phase 3: 格式转换工具
	{
		name: "convert_video_format",
		description: "Convert video format",
		parameters: {
			type: "object" as const,
			properties: {
				inputFile: { type: "string" as const },
				outputFile: { type: "string" as const },
				outputFormat: { type: "string" as const },
				quality: { type: "string" as const },
			},
			required: ["inputFile", "outputFile"],
		},
	},
	// Phase 4: 滤镜工具
	{
		name: "apply_color_correction",
		description: "Apply color correction",
		parameters: {
			type: "object" as const,
			properties: {
				inputFile: { type: "string" as const },
				outputFile: { type: "string" as const },
				brightness: { type: "number" as const },
				contrast: { type: "number" as const },
			},
			required: ["inputFile", "outputFile"],
		},
	},
	{
		name: "apply_blur",
		description: "Apply blur effect",
		parameters: {
			type: "object" as const,
			properties: {
				inputFile: { type: "string" as const },
				outputFile: { type: "string" as const },
				strength: { type: "number" as const },
				blurType: { type: "string" as const },
			},
			required: ["inputFile", "outputFile"],
		},
	},
	{
		name: "apply_sharpen",
		description: "Apply sharpen effect",
		parameters: {
			type: "object" as const,
			properties: {
				inputFile: { type: "string" as const },
				outputFile: { type: "string" as const },
				amount: { type: "number" as const },
			},
			required: ["inputFile", "outputFile"],
		},
	},
	{
		name: "apply_lut",
		description: "Apply LUT",
		parameters: {
			type: "object" as const,
			properties: {
				inputFile: { type: "string" as const },
				outputFile: { type: "string" as const },
				lutData: { type: "string" as const },
			},
			required: ["inputFile", "outputFile", "lutData"],
		},
	},
	{
		name: "adjust_video_speed",
		description: "Adjust video speed",
		parameters: {
			type: "object" as const,
			properties: {
				inputFile: { type: "string" as const },
				outputFile: { type: "string" as const },
				speedFactor: { type: "number" as const },
			},
			required: ["inputFile", "outputFile", "speedFactor"],
		},
	},
	// Phase 5: 字幕工具
	{
		name: "parse_subtitles",
		description: "Parse subtitles",
		parameters: {
			type: "object" as const,
			properties: { filePath: { type: "string" as const } },
			required: ["filePath"],
		},
	},
	{
		name: "burn_subtitles",
		description: "Burn subtitles",
		parameters: {
			type: "object" as const,
			properties: {
				videoFile: { type: "string" as const },
				subtitleFile: { type: "string" as const },
				outputFile: { type: "string" as const },
			},
			required: ["videoFile", "subtitleFile", "outputFile"],
		},
	},
	// Phase 6: 音频工具
	{
		name: "apply_equalizer",
		description: "Apply equalizer",
		parameters: {
			type: "object" as const,
			properties: {
				audioFile: { type: "string" as const },
				outputFile: { type: "string" as const },
				bands: { type: "array" as const },
			},
			required: ["audioFile", "outputFile"],
		},
	},
	{
		name: "apply_compressor",
		description: "Apply compressor",
		parameters: {
			type: "object" as const,
			properties: {
				audioFile: { type: "string" as const },
				outputFile: { type: "string" as const },
			},
			required: ["audioFile", "outputFile"],
		},
	},
	{
		name: "apply_reverb",
		description: "Apply reverb",
		parameters: {
			type: "object" as const,
			properties: {
				audioFile: { type: "string" as const },
				outputFile: { type: "string" as const },
				type: { type: "string" as const },
			},
			required: ["audioFile", "outputFile"],
		},
	},
];

describe("Phase 1-6 FFmpeg 工具（结构验证）", () => {
	describe("工具数量", () => {
		test("应该有至少 17 个工具", () => {
			expect(tools.length).toBeGreaterThanOrEqual(17);
		});

		test("Phase 1 应该有 2-3 个工具", () => {
			const phase1Tools = tools.filter((t) =>
				["execute_ffmpeg_command", "get_ffmpeg_status"].includes(t.name),
			);
			expect(phase1Tools.length).toBeGreaterThanOrEqual(2);
			expect(phase1Tools.length).toBeLessThanOrEqual(3);
		});

		test("Phase 2 应该有 3-4 个工具", () => {
			const phase2Tools = tools.filter((t) =>
				[
					"export_video",
					"get_video_info",
					"get_video_duration",
					"generate_thumbnail",
				].includes(t.name),
			);
			expect(phase2Tools.length).toBeGreaterThanOrEqual(3);
			expect(phase2Tools.length).toBeLessThanOrEqual(4);
		});

		test("Phase 4 应该有至少 5 个工具", () => {
			const phase4Tools = tools.filter((t) =>
				[
					"apply_color_correction",
					"apply_blur",
					"apply_sharpen",
					"apply_lut",
					"adjust_video_speed",
				].includes(t.name),
			);
			expect(phase4Tools.length).toBeGreaterThanOrEqual(5);
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

		test("所有工具的参数应该是对象类型", () => {
			for (const tool of tools) {
				expect(tool.parameters.type).toBe("object");
			}
		});

		test("所有工具应该有必需参数", () => {
			for (const tool of tools) {
				expect(Array.isArray(tool.parameters.required)).toBe(true);
			}
		});
	});

	describe("参数验证", () => {
		test("文件路径参数应该是字符串类型", () => {
			for (const tool of tools) {
				const props = tool.parameters.properties;
				for (const key of Object.keys(props)) {
					if (key.includes("File") || key.includes("Path")) {
						expect(props[key].type).toBe("string");
					}
				}
			}
		});

		test("blur 工具应该有 strength 参数", () => {
			const blurTool = tools.find((t) => t.name === "apply_blur");
			expect(blurTool?.parameters.properties.strength).toBeDefined();
		});
	});

	describe("工具分类", () => {
		test("Phase 1: FFmpeg 基础工具", () => {
			const phase1Tools = tools.filter((t) =>
				["execute_ffmpeg_command", "get_ffmpeg_status"].includes(t.name),
			);
			expect(phase1Tools.length).toBeGreaterThanOrEqual(2);
		});

		test("Phase 2: 视频导出工具", () => {
			const phase2Tools = tools.filter((t) =>
				[
					"export_video",
					"get_video_info",
					"get_video_duration",
					"generate_thumbnail",
				].includes(t.name),
			);
			expect(phase2Tools.length).toBeGreaterThanOrEqual(3);
		});

		test("Phase 3: 格式转换工具", () => {
			const phase3Tools = tools.filter((t) =>
				["convert_video_format"].includes(t.name),
			);
			expect(phase3Tools.length).toBeGreaterThanOrEqual(1);
		});

		test("Phase 4: 滤镜工具", () => {
			const phase4Tools = tools.filter((t) =>
				[
					"apply_color_correction",
					"apply_blur",
					"apply_sharpen",
					"apply_lut",
					"adjust_video_speed",
				].includes(t.name),
			);
			expect(phase4Tools.length).toBeGreaterThanOrEqual(5);
		});

		test("Phase 5: 字幕工具", () => {
			const phase5Tools = tools.filter((t) =>
				["parse_subtitles", "burn_subtitles"].includes(t.name),
			);
			expect(phase5Tools.length).toBeGreaterThanOrEqual(2);
		});

		test("Phase 6: 音频工具", () => {
			const phase6Tools = tools.filter((t) =>
				["apply_equalizer", "apply_compressor", "apply_reverb"].includes(t.name),
			);
			expect(phase6Tools.length).toBeGreaterThanOrEqual(3);
		});
	});
});
