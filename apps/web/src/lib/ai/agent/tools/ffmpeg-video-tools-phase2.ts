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
 * 获取导出所需的基本参数
 */
function getExportParams() {
	const editor = EditorCore.getInstance();
	const activeProject = editor.project.getActive();
	const tracks = editor.timeline.getTracks();
	const duration = editor.timeline.getTotalDuration();

	if (!activeProject) {
		throw new Error("No active project");
	}

	return {
		tracks,
		duration,
		canvasSize: activeProject.settings.canvasSize,
		fitCanvasSize:
			activeProject.settings.originalCanvasSize ??
			activeProject.settings.canvasSize,
		background: activeProject.settings.background,
		mediaAssets: editor.media.getAssets(),
	};
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
		},
		required: ["outputFile"],
	},
	async execute(args) {
		try {
			const outputFile = args.outputFile as string;
			const format = (args.format as "mp4" | "webm") ?? "mp4";
			const quality = (args.quality as "low" | "medium" | "high" | "max") ?? "medium";
			const frameRate = args.frameRate as number | undefined;
			const includeAudio = (args.includeAudio as boolean) ?? true;

			if (!isAbsolutePath(outputFile)) {
				return {
					success: false,
					message:
						"Output file must be an absolute path (e.g., '/export.mp4')",
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

			// 检查是否有 FFmpegExporter
			const ffmpegExporter = (renderer as any).ffmpegExporter;
			if (!ffmpegExporter) {
				return {
					success: false,
					message: "FFmpegExporter is not initialized. Please enable FFmpeg export first.",
				};
			}

			// 获取导出参数
			let params;
			try {
				params = getExportParams();
			} catch (error) {
				return {
					success: false,
					message: error instanceof Error ? error.message : "Failed to get export parameters",
				};
			}

			// 检查项目是否为空
			if (params.duration === 0) {
				return {
					success: false,
					message: "Project is empty. Please add clips to the timeline before exporting.",
				};
			}

			// 构建导出选项
			const options = {
				format,
				quality: quality as "low" | "medium" | "high" | "max",
				fps: frameRate,
				includeAudio,
				onProgress: (progress: { progress: number }) => {
					console.log(`[export_video] Progress: ${(progress.progress * 100).toFixed(1)}%`);
				},
			};

			// 执行导出
			const result = await ffmpegExporter.export({
				tracks: params.tracks,
				duration: params.duration,
				canvasSize: params.canvasSize,
				fitCanvasSize: params.fitCanvasSize,
				background: params.background,
				mediaAssets: params.mediaAssets,
				options,
			});

			if (!result.success) {
				return {
					success: false,
					message: result.error || "Export failed",
				};
			}

			return {
				success: true,
				message: `Video exported successfully to ${outputFile}`,
				data: {
					outputFile,
					format,
					quality,
					duration: params.duration,
				},
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

			// FFmpeg.wasm 在浏览器构建（Turbopack）下无法加载；
			// 此时优雅降级：引导改用浏览器原生的 video_probe 工具（读 MediaAsset 元数据）
			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService || !ffmpegService.isLoaded()) {
				return {
					success: false,
					message:
						"FFmpeg is not loaded in this build (FFmpeg.wasm unavailable under Turbopack). To get video info without FFmpeg, use the `video_probe` tool with a media assetId (first call `list_media_assets` to find asset IDs), or enable FFmpeg export if available.",
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
				message: `Video info: ${info.width}x${info.height}, ${info.duration.toFixed(2)}s, ${info.fps} fps`,
				data: {
					fileName: info.fileName,
					width: info.width,
					height: info.height,
					duration: info.duration,
					fps: info.fps,
					codec: info.videoCodec,
					audioCodec: info.audioCodec,
					fileSize: info.size,
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

			// FFmpeg.wasm 在浏览器构建下不可用 → 优雅降级，引导使用 video_probe
			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService || !ffmpegService.isLoaded()) {
				return {
					success: false,
					message:
						"FFmpeg is not loaded in this build. Use `video_probe` with a media assetId (after `list_media_assets`) to get duration without FFmpeg.",
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

			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message:
						"FFmpeg export is not enabled. Please enable FFmpeg export first.",
				};
			}

			// 获取 FFmpegService
			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService) {
				return {
					success: false,
					message: "FFmpegService is not initialized.",
				};
			}
			if (!ffmpegService.isLoaded()) {
				return {
					success: false,
					message:
						"FFmpeg is not loaded in this build. Thumbnails via FFmpeg are unavailable; use `inspect_frame` (browser-native) or `video_analyze` to capture visual frames instead.",
				};
			}

			// 使用 FFmpeg 生成缩略图
			// ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 -s 320x180 output.png
			const timeStr = formatTime(time);
			const sizeFilter = `${width}x${height}`;

			await ffmpegService.exec([
				"-i", filePath,
				"-ss", timeStr,
				"-vframes", "1",
				"-s", sizeFilter,
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Thumbnail generated successfully at ${time}s`,
				data: {
					outputFile,
					time,
					width,
					height,
				},
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

/**
 * 格式化时间（秒 -> HH:MM:SS 或 MM:SS）
 */
function formatTime(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	if (h > 0) {
		return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	}
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// 导出所有 Phase 2 工具
export const ffmpegVideoToolsPhase2 = [
	exportVideoTool,
	getVideoInfoTool,
	getVideoDurationTool,
	generateThumbnailTool,
];
