/**
 * Phase 2: 视频导出工具
 *
 * 提供 FFmpegExporter 视频导出功能的 AI 工具接口
 */

import { EditorCore } from "@/core";
import type { AgentTool } from "./types";

/**
 * 验证文件路径
 */
function isAbsolutePath(path: unknown): path is string {
	return typeof path === "string" && path.startsWith("/");
}

/**
 * 导出视频
 *
 * 使用场景：
 * - 将项目导出为 MP4 或 WebM 视频
 * - 控制视频质量和编码参数
 * - 添加水印或品牌标识
 */
export const exportVideoTool: AgentTool = {
	name: "export_video",
	description: `Export the current project timeline as a video file.

Use cases:
- Export the complete project for sharing
- Create video in different formats (MP4/WebM)
- Control quality settings (resolution, bitrate, CRF)
- Add watermark or branding

Quality presets:
- low: Fast export, larger file size
- medium: Balanced quality and size (recommended)
- high: Best quality, slower export
- max: Best possible quality

Output formats:
- mp4: H.264/AAC (most compatible)
- webm: VP9/Opus (smaller file size)`,
	parameters: {
		type: "object",
		properties: {
			outputFile: {
				type: "string",
				description:
					"Absolute path for the output video (e.g., '/export.mp4')",
			},
			format: {
				type: "string",
				enum: ["mp4", "webm"],
				description:
					"Output format (default: mp4)",
				default: "mp4",
			},
			quality: {
				type: "string",
				enum: ["low", "medium", "high", "max"],
				description:
					"Quality preset (default: medium)",
				default: "medium",
			},
			resolution: {
				type: "string",
				description:
					"Target resolution (e.g., '1920x1080', '1280x720'). Defaults to project resolution.",
			},
			frameRate: {
				type: "number",
				description:
					"Target frame rate (e.g., 24, 30, 60). Defaults to project frame rate.",
			},
			includeAudio: {
				type: "boolean",
				description:
					"Include audio track (default: true)",
				default: true,
			},
			watermark: {
				type: "string",
				description:
					"Path to watermark image (optional, e.g., '/watermark.png')",
			},
		},
		required: ["outputFile"],
	},
	async execute(args) {
		try {
			const outputFile = args.outputFile as string;
			const format = (args.format as "mp4" | "webm") ?? "mp4";
			const quality = (args.quality as "low" | "medium" | "high" | "max") ?? "medium";
			const resolution = args.resolution as string | undefined;
			const frameRate = args.frameRate as number | undefined;
			const includeAudio = (args.includeAudio as boolean) ?? true;
			const watermark = args.watermark as string | undefined;

			if (!isAbsolutePath(outputFile)) {
				return {
					success: false,
					message:
						"Output file must be an absolute path (e.g., '/export.mp4')",
				};
			}

			if (watermark && !isAbsolutePath(watermark)) {
				return {
					success: false,
					message:
						"Watermark path must be an absolute path",
				};
			}

			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message:
						"FFmpeg export is not enabled. Please enable FFmpeg export first.",
				};
			}

			// 注意：目前需要直接访问 FFmpegExporter
			// 未来会通过 RendererManager 暴露
			return {
				success: false,
				message:
					"Video export is not yet fully exposed through the AI tools interface. This feature is coming soon.",
			};
		} catch (error) {
			return {
				success: false,
				message: `Error exporting video: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 获取视频信息
 *
 * 使用场景：
 * - 获取视频文件的详细信息
 * - 检查视频分辨率和时长
 * - 验证视频文件
 */
export const getVideoInfoTool: AgentTool = {
	name: "get_video_info",
	description: `Get detailed information about a video file.

Use cases:
- Check video resolution, frame rate, duration
- Verify video file before processing
- Get video metadata (codec, bitrate, etc.)

Returns:
- Resolution (width x height)
- Duration in seconds
- Frame rate
- File size
- Video codec
- Audio codec (if present)`,
	parameters: {
		type: "object",
		properties: {
			filePath: {
				type: "string",
				description:
					"Absolute path to the video file (e.g., '/video.mp4')",
			},
		},
		required: ["filePath"],
	},
	async execute(args) {
		try {
			const filePath = args.filePath as string;

			if (!isAbsolutePath(filePath)) {
				return {
					success: false,
					message:
						"File path must be an absolute path",
				};
			}

			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message:
						"FFmpeg export is not enabled. Please enable FFmpeg export first.",
				};
			}

			const info = await renderer.getVideoInfo(filePath);

			if (!info) {
				return {
					success: false,
					message: `Failed to get video info for ${filePath}`,
				};
			}

			return {
				success: true,
				message: `Video info: ${info.width}x${info.height}, ${info.duration.toFixed(2)}s, ${info.frameRate} fps`,
				data: {
					fileName: info.fileName,
					width: info.width,
					height: info.height,
					duration: info.duration,
					frameRate: info.frameRate,
					codec: info.codec,
					bitrate: info.bitrate,
					fileSize: info.fileSize,
					hasAudio: info.hasAudio,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error getting video info: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 获取视频时长
 *
 * 使用场景：
 * - 快速获取视频时长（比 get_video_info 更轻量）
 * - 计算视频总时长
 * - 视频时长验证
 */
export const getVideoDurationTool: AgentTool = {
	name: "get_video_duration",
	description: `Get the duration of a video file in seconds.

Use cases:
- Quick duration check without full metadata
- Calculate total video length
- Validate video length before processing

This is faster than get_video_info as it only retrieves duration.`,
	parameters: {
		type: "object",
		properties: {
			filePath: {
				type: "string",
				description:
					"Absolute path to the video file (e.g., '/video.mp4')",
			},
		},
		required: ["filePath"],
	},
	async execute(args) {
		try {
			const filePath = args.filePath as string;

			if (!isAbsolutePath(filePath)) {
				return {
					success: false,
					message:
						"File path must be an absolute path",
				};
			}

			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message:
						"FFmpeg export is not enabled. Please enable FFmpeg export first.",
				};
			}

			const duration = await renderer.getVideoDuration(filePath);

			return {
				success: true,
				message: `Video duration: ${duration.toFixed(2)} seconds`,
				data: { duration },
			};
		} catch (error) {
			return {
				success: false,
				message: `Error getting video duration: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 生成缩略图
 *
 * 使用场景：
 * - 为视频生成缩略图
 * - 提取视频帧作为预览图
 * - 创建视频封面
 */
export const generateThumbnailTool: AgentTool = {
	name: "generate_thumbnail",
	description: `Generate a thumbnail image from a video at a specific time.

Use cases:
- Create video preview images
- Extract key frames for thumbnails
- Generate video cover images

The thumbnail is captured at the specified timestamp and saved as a PNG image.`,
	parameters: {
		type: "object",
		properties: {
			filePath: {
				type: "string",
				description:
					"Absolute path to the video file (e.g., '/video.mp4')",
			},
			outputFile: {
				type: "string",
				description:
					"Absolute path for the thumbnail image (e.g., '/thumbnail.png')",
			},
			time: {
				type: "number",
				description:
					"Timestamp in seconds to capture (default: 1.0 = 1 second)",
				default: 1.0,
			},
			width: {
				type: "number",
				description:
					"Thumbnail width in pixels (default: 320)",
				default: 320,
			},
			height: {
				type: "number",
				description:
					"Thumbnail height in pixels (default: 180)",
				default: 180,
			},
		},
		required: ["filePath", "outputFile"],
	},
	async execute(args) {
		try {
			const filePath = args.filePath as string;
			const outputFile = args.outputFile as string;
			const time = (args.time as number) ?? 1.0;
			const width = (args.width as number) ?? 320;
			const height = (args.height as number) ?? 180;

			if (!isAbsolutePath(filePath)) {
				return {
					success: false,
					message:
						"File path must be an absolute path",
				};
			}

			if (!isAbsolutePath(outputFile)) {
				return {
					success: false,
					message:
						"Output file must be an absolute path",
				};
			}

			if (time < 0) {
				return {
					success: false,
					message:
						"Time must be >= 0",
				};
			}

			// 注意：这个工具需要直接访问 FFmpegExporter 或自定义实现
			return {
				success: false,
				message:
					"Thumbnail generation is not yet exposed through the AI tools interface. This feature is coming soon.",
			};
		} catch (error) {
			return {
				success: false,
				message: `Error generating thumbnail: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

// 导出所有 Phase 2 工具
export const ffmpegVideoToolsPhase2 = [
	exportVideoTool,
	getVideoInfoTool,
	getVideoDurationTool,
	generateThumbnailTool,
];
