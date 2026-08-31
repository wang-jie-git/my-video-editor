/**
 * Phase 3: 格式转换工具
 *
 * 提供 FormatConverter 视频格式转换功能的 AI 工具接口
 */

import type { AgentTool } from "./types";

/**
 * 验证文件路径
 */
function isAbsolutePath(path: unknown): path is string {
	return typeof path === "string" && path.startsWith("/");
}

/**
 * 转换视频格式
 *
 * 使用场景：
 * - 将视频转换为不同的容器格式
 * - 批量格式转换
 * - 兼容性转换
 */
export const convertVideoFormatTool: AgentTool = {
	name: "convert_video_format",
	description: `Convert a video file to a different format.

Use cases:
- Convert MOV/AVI/MKV to MP4 for better compatibility
- Convert to WebM for web optimization
- Batch convert multiple files

Supported conversions:
- MOV → MP4/WebM
- AVI → MP4/WebM
- MKV → MP4/WebM
- FLV → MP4/WebM
- WMV → MP4/WebM
- MP4 → WebM (re-encode)
- WebM → MP4 (re-encode)

Quality presets:
- low: Fast conversion, larger file
- medium: Balanced (recommended)
- high: Better quality, slower
- max: Best quality, slowest`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description:
					"Absolute path to input video (e.g., '/video.mov')",
			},
			outputFile: {
				type: "string",
				description:
					"Absolute path for output video (e.g., '/video.mp4')",
			},
			outputFormat: {
				type: "string",
				enum: ["mp4", "webm", "mov", "avi", "mkv", "flv", "wmv"],
				description:
					"Target format (inferred from outputFile extension if not specified)",
			},
			quality: {
				type: "string",
				enum: ["low", "medium", "high", "max"],
				description:
					"Quality preset (default: medium)",
				default: "medium",
			},
			includeAudio: {
				type: "boolean",
				description:
					"Include audio track (default: true)",
				default: true,
			},
		},
		required: ["inputFile", "outputFile"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const outputFile = args.outputFile as string;
			const outputFormat = args.outputFormat as string | undefined;
			const quality = (args.quality as "low" | "medium" | "high" | "max") ?? "medium";
			const includeAudio = (args.includeAudio as boolean) ?? true;

			if (!isAbsolutePath(inputFile)) {
				return {
					success: false,
					message:
						"Input file must be an absolute path",
				};
			}

			if (!isAbsolutePath(outputFile)) {
				return {
					success: false,
					message:
						"Output file must be an absolute path",
				};
			}

			// 注意：这个工具需要直接访问 FormatConverter
			// 未来会通过 RendererManager 暴露
			return {
				success: false,
				message:
					"Format conversion is not yet exposed through the AI tools interface. This feature is coming soon.",
			};
		} catch (error) {
			return {
				success: false,
				message: `Error converting video format: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 批量转换格式
 *
 * 使用场景：
 * - 批量转换多个视频文件
 * - 统一项目中的所有视频格式
 * - 自动化格式标准化
 */
export const batchConvertFormatTool: AgentTool = {
	name: "batch_convert_format",
	description: `Convert multiple video files to a target format.

Use cases:
- Batch convert all project videos to MP4
- Standardize video formats across a project
- Convert multiple files at once

Note: This processes files sequentially. Large batches may take significant time.`,
	parameters: {
		type: "object",
		properties: {
			inputFiles: {
				type: "array",
				items: { type: "string" },
				description:
					"Array of absolute paths to input videos",
			},
			outputFormat: {
				type: "string",
				enum: ["mp4", "webm", "mov", "avi", "mkv"],
				description:
					"Target format for all files",
			},
			outputDirectory: {
				type: "string",
				description:
					"Directory for output files (e.g., '/converted/'). Files will be named {original_name}.{format}",
			},
			quality: {
				type: "string",
				enum: ["low", "medium", "high", "max"],
				description:
					"Quality preset (default: medium)",
				default: "medium",
			},
			includeAudio: {
				type: "boolean",
				description:
					"Include audio track (default: true)",
				default: true,
			},
		},
		required: ["inputFiles", "outputFormat", "outputDirectory"],
	},
	async execute(args) {
		try {
			const inputFiles = args.inputFiles as string[];
			const outputFormat = args.outputFormat as string;
			const outputDirectory = args.outputDirectory as string;
			const quality = (args.quality as "low" | "medium" | "high" | "max") ?? "medium";
			const includeAudio = (args.includeAudio as boolean) ?? true;

			if (!Array.isArray(inputFiles) || inputFiles.length === 0) {
				return {
					success: false,
					message:
						"At least 1 input file is required",
				};
			}

			for (const file of inputFiles) {
				if (!isAbsolutePath(file)) {
					return {
						success: false,
						message:
							"All input files must be absolute paths",
					};
				}
			}

			if (!isAbsolutePath(outputDirectory)) {
				return {
					success: false,
					message:
						"Output directory must be an absolute path",
				};
			}

			// 注意：这个工具需要直接访问 FormatConverter
			return {
				success: false,
				message:
					"Batch format conversion is not yet exposed through the AI tools interface. This feature is coming soon.",
			};
		} catch (error) {
			return {
				success: false,
				message: `Error in batch conversion: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

// 导出所有 Phase 3 工具
export const ffmpegFormatTools = [
	convertVideoFormatTool,
	batchConvertFormatTool,
];
