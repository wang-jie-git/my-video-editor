/**
 * FFmpeg 视频处理工具
 *
 * 提供视频合并、分割、裁剪、转场等 FFmpeg 视频处理功能
 */

import { EditorCore } from "@/core";
import type { AgentTool } from "./types";

/**
 * 验证文件路径是否为绝对路径
 */
function isAbsolutePath(path: unknown): path is string {
	return typeof path === "string" && path.startsWith("/");
}

/**
 * 合并多个视频文件
 *
 * 使用场景：
 * - 将多个视频片段合并为一个完整视频
 * - 支持流复制（快速）和重新编码模式
 * - 可选是否保留音频
 */
export const mergeVideosTool: AgentTool = {
	name: "merge_videos",
	description: `Merge multiple video files into a single video.

Use cases:
- Combine video clips into one continuous video
- Create compilation videos from multiple segments
- Merge split-screen recordings

Supports two modes:
- Stream copy (fast, default): Quick merging without re-encoding
- Re-encode (slow): Required for adding transitions

Notes:
- Input files must already exist in the project's file system
- At least 2 video files are required
- Output format defaults to MP4`,
	parameters: {
		type: "object",
		properties: {
			inputFiles: {
				type: "array",
				items: {
					type: "string",
				},
				description:
					"Array of absolute paths to input video files (e.g., ['/video1.mp4', '/video2.mp4'])",
			},
			outputFile: {
				type: "string",
				description:
					"Absolute path for the output file (e.g., '/merged.mp4')",
			},
			includeAudio: {
				type: "boolean",
				description:
					"Whether to include audio tracks (default: true)",
				default: true,
			},
			reencode: {
				type: "boolean",
				description:
					"Enable re-encoding mode. Required if you plan to add transitions later (default: false, uses fast stream copy)",
				default: false,
			},
		},
		required: ["inputFiles", "outputFile"],
	},
	async execute(args) {
		try {
			const inputFiles = args.inputFiles as string[];
			const outputFile = args.outputFile as string;
			const includeAudio = (args.includeAudio as boolean) ?? true;
			const reencode = (args.reencode as boolean) ?? false;

			// 验证输入
			if (!Array.isArray(inputFiles) || inputFiles.length < 2) {
				return {
					success: false,
					message:
						"At least 2 input video files are required for merging",
				};
			}

			if (!isAbsolutePath(outputFile)) {
				return {
					success: false,
					message:
						"Output file must be an absolute path (e.g., '/merged.mp4')",
				};
			}

			for (const file of inputFiles) {
				if (!isAbsolutePath(file)) {
					return {
						success: false,
						message:
							"All input files must be absolute paths (e.g., '/video1.mp4')",
					};
				}
			}

			// 调用 VideoComposer
			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message:
						"FFmpeg export is not enabled. Please enable FFmpeg export first.",
				};
			}

			const result = await renderer.mergeVideos(inputFiles, {
				outputFile,
				includeAudio,
				reencode,
			});

			if (result.success) {
				return {
					success: true,
					message: `Successfully merged ${result.videoCount} videos into ${outputFile}`,
					data: {
						outputFile: result.outputFile,
						videoCount: result.videoCount,
						size: result.size,
						duration: result.duration,
					},
				};
			}

			return {
				success: false,
				message: result.error || "Failed to merge videos",
			};
		} catch (error) {
			return {
				success: false,
				message: `Error merging videos: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 带转场效果的视频合并
 *
 * 使用场景：
 * - 创建具有专业转场效果的视频
 * - 支持淡入淡出、滑动、擦除、溶解等转场
 * - 自动为每个视频片段之间添加转场
 */
export const concatWithTransitionsTool: AgentTool = {
	name: "concat_with_transitions",
	description: `Merge multiple videos with transition effects between them.

Use cases:
- Create professional videos with smooth transitions
- Add fade, slide, wipe, or dissolve effects between clips
- Produce polished video compilations

Available transition types:
- fade: Fade to black between clips
- slide: Slide transition
- wipe: Wipe transition
- dissolve: Dissolve/mix transition

Note: This requires re-encoding and is slower than merge_videos.`,
	parameters: {
		type: "object",
		properties: {
			inputFiles: {
				type: "array",
				items: {
					type: "string",
				},
				description:
					"Array of absolute paths to input video files",
			},
			outputFile: {
				type: "string",
				description:
					"Absolute path for the output file (e.g., '/merged_with_transitions.mp4')",
			},
			transitions: {
				type: "array",
				description:
					"Array of transition objects. Must have (inputFiles.length - 1) transitions",
				items: {
					type: "object",
					properties: {
						type: {
							type: "string",
							enum: ["fade", "slide", "wipe", "dissolve"],
							description:
								"Transition type (default: fade)",
						},
						duration: {
							type: "number",
							description:
								"Transition duration in seconds (default: 1.0)",
						},
					},
				},
			},
		},
		required: ["inputFiles", "outputFile", "transitions"],
	},
	async execute(args) {
		try {
			const inputFiles = args.inputFiles as string[];
			const outputFile = args.outputFile as string;
			const transitions = args.transitions as Array<{
				type?: string;
				duration?: number;
			}>;

			// 验证输入
			if (!Array.isArray(inputFiles) || inputFiles.length < 2) {
				return {
					success: false,
					message:
						"At least 2 input video files are required",
				};
			}

			if (!isAbsolutePath(outputFile)) {
				return {
					success: false,
					message:
						"Output file must be an absolute path",
				};
			}

			if (
				!Array.isArray(transitions) ||
				transitions.length !== inputFiles.length - 1
			) {
				return {
					success: false,
					message: `Need exactly ${inputFiles.length - 1} transitions for ${inputFiles.length} videos`,
				};
			}

			// 调用 VideoComposer
			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message:
						"FFmpeg export is not enabled. Please enable FFmpeg export first.",
				};
			}

			const result = await renderer.concatWithTransitions(
				inputFiles,
				{
					outputFile,
					transitions: transitions.map((t) => ({
						type: (t.type || "fade") as
							| "fade"
							| "slide"
							| "wipe"
							| "dissolve",
						duration: t.duration ?? 1.0,
					})),
				},
			);

			if (result.success) {
				return {
					success: true,
					message: `Successfully merged ${result.videoCount} videos with transitions`,
					data: {
						outputFile: result.outputFile,
						videoCount: result.videoCount,
					},
				};
			}

			return {
				success: false,
				message: result.error || "Failed to merge videos with transitions",
			};
		} catch (error) {
			return {
				success: false,
				message: `Error merging with transitions: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 按时间点分割视频
 *
 * 使用场景：
 * - 将长视频分割成多个短片段
 * - 按场景、章节或时间点分割
 * - 批量提取视频片段
 */
export const splitVideoTool: AgentTool = {
	name: "split_video",
	description: `Split a video file at specified time points.

Use cases:
- Split a long video into multiple shorter clips
- Extract scenes or chapters
- Batch process video segments

How it works:
- Provide split points in seconds (e.g., [10, 30, 60])
- Creates (splitPoints.length + 1) output segments
- Segment 1: 0 to splitPoints[0]
- Segment 2: splitPoints[0] to splitPoints[1]
- And so on...
- Last segment: splitPoints[last] to end

Uses fast stream copy mode (no re-encoding).`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description:
					"Absolute path to the input video file (e.g., '/video.mp4')",
			},
			splitPoints: {
				type: "array",
				items: {
					type: "number",
				},
				description:
					"Array of split points in seconds (e.g., [10, 30, 60]). Must be sorted in ascending order.",
			},
			outputPrefix: {
				type: "string",
				description:
					"Prefix for output files. Files will be named as '{prefix}_1.mp4', '{prefix}_2.mp4', etc. (e.g., 'segment')",
			},
		},
		required: ["inputFile", "splitPoints", "outputPrefix"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const splitPoints = args.splitPoints as number[];
			const outputPrefix = args.outputPrefix as string;

			// 验证输入
			if (!isAbsolutePath(inputFile)) {
				return {
					success: false,
					message:
						"Input file must be an absolute path",
				};
			}

			if (!Array.isArray(splitPoints) || splitPoints.length === 0) {
				return {
					success: false,
					message:
						"At least 1 split point is required",
				};
			}

			// 验证分割点是否排序
			for (let i = 1; i < splitPoints.length; i++) {
				if (splitPoints[i] <= splitPoints[i - 1]) {
					return {
						success: false,
						message:
							"Split points must be sorted in ascending order (e.g., [10, 30, 60])",
					};
				}
			}

			// 调用 VideoComposer
			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message:
						"FFmpeg export is not enabled. Please enable FFmpeg export first.",
				};
			}

			const result = await renderer.splitVideo(inputFile, {
				splitPoints,
				outputPrefix,
			});

			if (result.success) {
				return {
					success: true,
					message: `Successfully split video into ${result.segmentCount} segments`,
					data: {
						outputFiles: result.outputFiles,
						segmentCount: result.segmentCount,
					},
				};
			}

			return {
				success: false,
				message: result.error || "Failed to split video",
			};
		} catch (error) {
			return {
				success: false,
				message: `Error splitting video: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 裁剪视频的开始/结束部分
 *
 * 使用场景：
 * - 裁剪视频的开头（trim start）
 * - 裁剪视频的结尾（trim end）
 * - 精确提取视频片段
 */
export const trimVideoTool: AgentTool = {
	name: "trim_video",
	description: `Trim a video by specifying a time range to keep.

Use cases:
- Remove intro/outro from a video
- Extract a specific segment from a longer video
- Crop the beginning or end of a video

Parameters:
- startTime: Beginning of the segment to keep (in seconds)
- endTime: End of the segment to keep (in seconds)
- The output will be (endTime - startTime) seconds long

Example:
- To keep only the middle section from 10s to 50s:
  startTime=10, endTime=50
  Result: 40-second video

Uses fast stream copy mode by default. Enable reencode for frame-accurate trimming.`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description:
					"Absolute path to the input video file (e.g., '/video.mp4')",
			},
			startTime: {
				type: "number",
				description:
					"Start time in seconds (e.g., 10 for 10 seconds). Must be >= 0.",
			},
			endTime: {
				type: "number",
				description:
					"End time in seconds (e.g., 50 for 50 seconds). Must be > startTime.",
			},
			outputFile: {
				type: "string",
				description:
					"Absolute path for the output file (e.g., '/trimmed.mp4')",
			},
			reencode: {
				type: "boolean",
				description:
					"Enable re-encoding for frame-accurate trimming (default: false, uses fast stream copy)",
				default: false,
			},
		},
		required: ["inputFile", "startTime", "endTime", "outputFile"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const startTime = args.startTime as number;
			const endTime = args.endTime as number;
			const outputFile = args.outputFile as string;
			const reencode = (args.reencode as boolean) ?? false;

			// 验证输入
			if (!isAbsolutePath(inputFile)) {
				return {
					success: false,
					message: "Input file must be an absolute path",
				};
			}

			if (!isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "Output file must be an absolute path",
				};
			}

			if (typeof startTime !== "number" || startTime < 0) {
				return {
					success: false,
					message:
						"startTime must be a non-negative number",
				};
			}

			if (
				typeof endTime !== "number" ||
				endTime <= startTime
			) {
				return {
					success: false,
					message:
						"endTime must be greater than startTime",
				};
			}

			// 调用 VideoComposer
			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message:
						"FFmpeg export is not enabled. Please enable FFmpeg export first.",
				};
			}

			const result = await renderer.trimVideo(inputFile, {
				startTime,
				endTime,
				outputFile,
				reencode,
			});

			if (result.success) {
				return {
					success: true,
					message: `Successfully trimmed video to ${result.duration?.toFixed(2)}s`,
					data: {
						outputFile: result.outputFile,
						duration: result.duration,
						size: result.size,
					},
				};
			}

			return {
				success: false,
				message: result.error || "Failed to trim video",
			};
		} catch (error) {
			return {
				success: false,
				message: `Error trimming video: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

// 导出所有 FFmpeg 视频工具
export const ffmpegVideoTools = [
	mergeVideosTool,
	concatWithTransitionsTool,
	splitVideoTool,
	trimVideoTool,
];
