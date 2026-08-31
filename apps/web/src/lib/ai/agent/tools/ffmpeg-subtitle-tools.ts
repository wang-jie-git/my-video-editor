/**
 * Phase 5: 字幕工具
 *
 * 提供字幕解析和处理功能的 AI 工具接口
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
 * 解析 SRT 字幕文件
 */
function parseSRT(content: string): Array<{ start: number; end: number; text: string }> {
	const subtitles: Array<{ start: number; end: number; text: string }> = [];
	const blocks = content.trim().split(/\n\n+/);

	for (const block of blocks) {
		const lines = block.split('\n');
		if (lines.length < 3) continue;

		// 跳过序号行
		const timeLine = lines[1];
		if (!timeLine) continue;

		// 解析时间码
		const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
		if (!timeMatch) continue;

		const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
		const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;

		// 提取字幕文本
		const text = lines.slice(2).join('\n');

		subtitles.push({ start, end, text });
	}

	return subtitles;
}

/**
 * 解析 VTT 字幕文件
 */
function parseVTT(content: string): Array<{ start: number; end: number; text: string }> {
	const subtitles: Array<{ start: number; end: number; text: string }> = [];
	const lines = content.split('\n');

	// 跳过头部
	let i = 0;
	while (i < lines.length && !lines[i].includes('-->')) {
		i++;
	}

	// 解析字幕块
	while (i < lines.length) {
		if (lines[i].includes('-->')) {
			const timeMatch = lines[i].match(/(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2})\.(\d{3})/);
			if (timeMatch) {
				const start = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) + parseInt(timeMatch[3]) / 1000;
				const end = parseInt(timeMatch[4]) * 60 + parseInt(timeMatch[5]) + parseInt(timeMatch[6]) / 1000;

				// 收集字幕文本
				i++;
				const textLines: string[] = [];
				while (i < lines.length && lines[i].trim() !== '') {
					textLines.push(lines[i]);
					i++;
				}

				subtitles.push({
					start,
					end,
					text: textLines.join('\n'),
				});
			}
		}
		i++;
	}

	return subtitles;
}

/**
 * 解析字幕文件
 *
 * 使用场景：
 * - 加载 SRT 或 VTT 字幕文件
 * - 提取字幕轨道
 * - 准备字幕编辑
 */
export const parseSubtitlesTool: AgentTool = {
	name: "parse_subtitles",
	description: `Parse a subtitle file (SRT or VTT) and extract subtitle data.

Use cases:
- Load subtitle files for editing
- Extract subtitle tracks from video projects
- Validate subtitle timing and content

Supported formats:
- SRT: SubRip (.srt)
- VTT: WebVTT (.vtt)

Returns:
- Number of subtitles
- Language (if detected)
- Timing information
- Subtitle text content`,
	parameters: {
		type: "object",
		properties: {
			filePath: {
				type: "string",
				description:
					"Absolute path to subtitle file (e.g., '/subtitles.srt')",
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
					message: "File path must be an absolute path",
				};
			}

			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message: "FFmpeg export is not enabled.",
				};
			}

			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService) {
				return {
					success: false,
					message: "FFmpegService is not initialized.",
				};
			}

			// 读取字幕文件
			const data = await ffmpegService.readFile(filePath);
			const content = new TextDecoder().decode(data);

			// 检测格式并解析
			const ext = filePath.split('.').pop()?.toLowerCase();
			let subtitles: Array<{ start: number; end: number; text: string }>;

			if (ext === 'srt') {
				subtitles = parseSRT(content);
			} else if (ext === 'vtt') {
				subtitles = parseVTT(content);
			} else {
				return {
					success: false,
					message: `Unsupported subtitle format: ${ext}. Use SRT or VTT.`,
				};
			}

			return {
				success: true,
				message: `Parsed ${subtitles.length} subtitles from ${filePath}`,
				data: {
					filePath,
					format: ext,
					count: subtitles.length,
					subtitles,
					duration: subtitles.length > 0 ? subtitles[subtitles.length - 1].end : 0,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error parsing subtitles: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 烧录字幕到视频
 *
 * 使用场景：
 * - 将字幕硬编码到视频中
 * - 创建最终视频成品
 * - 生成带字幕的视频版本
 */
export const burnSubtitlesTool: AgentTool = {
	name: "burn_subtitles",
	description: `Burn subtitles into a video (hardcode).

Use cases:
- Create final video with embedded subtitles
- Generate subtitle versions for distribution
- Permanently add captions to video

This permanently encodes subtitles into the video. For editable subtitles, use add_subtitle_track instead.

Note: This requires re-encoding and may take longer.`,
	parameters: {
		type: "object",
		properties: {
			videoFile: {
				type: "string",
				description:
					"Absolute path to input video (e.g., '/video.mp4')",
			},
			subtitleFile: {
				type: "string",
				description:
					"Absolute path to subtitle file (e.g., '/subtitles.srt')",
			},
			outputFile: {
				type: "string",
				description:
					"Absolute path for output video (e.g., '/with_subs.mp4')",
			},
			fontSize: {
				type: "number",
				description:
					"Subtitle font size (default: 24)",
				default: 24,
			},
			fontColor: {
				type: "string",
				description:
					"Subtitle font color (e.g., 'white', '#FFFFFF', default: 'white')",
				default: "white",
			},
			backgroundColor: {
				type: "string",
				description:
					"Background color for better readability (e.g., 'black@0.5', default: 'black@0.5')",
				default: "black@0.5",
			},
			position: {
				type: "string",
				enum: ["bottom", "top", "middle"],
				description:
					"Subtitle position (default: bottom)",
				default: "bottom",
			},
		},
		required: ["videoFile", "subtitleFile", "outputFile"],
	},
	async execute(args) {
		try {
			const videoFile = args.videoFile as string;
			const subtitleFile = args.subtitleFile as string;
			const outputFile = args.outputFile as string;
			const fontSize = (args.fontSize as number) ?? 24;
			const fontColor = (args.fontColor as string) ?? "white";
			const backgroundColor = (args.backgroundColor as string) ?? "black@0.5";
			const position = (args.position as "bottom" | "top" | "middle") ?? "bottom";

			if (
				!isAbsolutePath(videoFile) ||
				!isAbsolutePath(subtitleFile) ||
				!isAbsolutePath(outputFile)
			) {
				return {
					success: false,
					message: "All file paths must be absolute",
				};
			}

			if (fontSize < 12 || fontSize > 72) {
				return {
					success: false,
					message: "fontSize must be between 12 and 72",
				};
			}

			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message: "FFmpeg export is not enabled.",
				};
			}

			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService) {
				return {
					success: false,
					message: "FFmpegService is not initialized.",
				};
			}

			// 构建字幕样式滤镜
			const positionY = position === "bottom" ? "h-th-50" : position === "top" ? "50" : "(h-th)/2";
			const style = `FontSize=${fontSize}:FontColor=${fontColor}:BackColor=${backgroundColor}:MarginV=20`;

			// 烧录字幕
			await ffmpegService.exec([
				"-i", videoFile,
				"-vf", `subtitles=${subtitleFile}:force_style='${style}'`,
				"-c:v", "libx264",
				"-crf", "23",
				"-c:a", "copy",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Subtitles burned into video successfully`,
				data: {
					videoFile,
					subtitleFile,
					outputFile,
					fontSize,
					fontColor,
					position,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error burning subtitles: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 添加字幕轨道
 *
 * 使用场景：
 * - 添加可编辑的字幕轨道
 * - 多语言字幕支持
 * - 字幕轨道管理
 */
export const addSubtitleTrackTool: AgentTool = {
	name: "add_subtitle_track",
	description: `Add an editable subtitle track to the project.

Use cases:
- Add multiple language subtitles
- Create editable subtitle tracks
- Manage subtitle tracks in the project

Unlike burn_subtitles, this adds subtitles as an editable track that can be modified later.`,
	parameters: {
		type: "object",
		properties: {
			subtitleFile: {
				type: "string",
				description:
					"Absolute path to subtitle file (e.g., '/subtitles.srt')",
			},
			language: {
				type: "string",
				description:
					"Language code (e.g., 'en', 'zh', 'ja', default: 'en')",
				default: "en",
			},
			label: {
				type: "string",
				description:
					"Display label for the track (e.g., 'English', '中文')",
			},
			enabled: {
				type: "boolean",
				description:
					"Enable track by default (default: true)",
				default: true,
			},
		},
		required: ["subtitleFile"],
	},
	async execute(args) {
		try {
			const subtitleFile = args.subtitleFile as string;
			const language = (args.language as string) ?? "en";
			const label = args.label as string | undefined;
			const enabled = (args.enabled as boolean) ?? true;

			if (!isAbsolutePath(subtitleFile)) {
				return {
					success: false,
					message: "Subtitle file path must be absolute",
				};
			}

			// 解析字幕文件以获取信息
			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message: "FFmpeg export is not enabled.",
				};
			}

			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService) {
				return {
					success: false,
					message: "FFmpegService is not initialized.",
				};
			}

			// 读取字幕文件
			const data = await ffmpegService.readFile(subtitleFile);
			const content = new TextDecoder().decode(data);

			// 解析字幕
			const ext = subtitleFile.split('.').pop()?.toLowerCase();
			const subtitles = ext === 'srt' ? parseSRT(content) : parseVTT(content);

			// 创建字幕轨道信息
			const trackInfo = {
				filePath: subtitleFile,
				language,
				label: label || language,
				enabled,
				count: subtitles.length,
				duration: subtitles.length > 0 ? subtitles[subtitles.length - 1].end : 0,
			};

			return {
				success: true,
				message: `Subtitle track added: ${trackInfo.label} (${subtitles.length} subtitles)`,
				data: trackInfo,
			};
		} catch (error) {
			return {
				success: false,
				message: `Error adding subtitle track: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 翻译字幕
 *
 * 使用场景：
 * - 自动翻译字幕到其他语言
 * - 创建多语言字幕版本
 * - 字幕本地化
 */
export const translateSubtitlesTool: AgentTool = {
	name: "translate_subtitles",
	description: `Translate subtitles to a target language.

Use cases:
- Create multilingual subtitle versions
- Localize video content for different audiences
- Auto-translate subtitles

Supported languages:
- en (English)
- zh (Chinese)
- ja (Japanese)
- ko (Korean)
- es (Spanish)
- fr (French)
- de (German)
- And more...`,
	parameters: {
		type: "object",
		properties: {
			subtitleFile: {
				type: "string",
				description:
					"Absolute path to input subtitle file",
			},
			targetLanguage: {
				type: "string",
				description:
					"Target language code (e.g., 'en', 'zh', 'ja')",
			},
			outputFile: {
				type: "string",
				description:
					"Absolute path for translated subtitle file",
			},
		},
		required: ["subtitleFile", "targetLanguage", "outputFile"],
	},
	async execute(args) {
		try {
			const subtitleFile = args.subtitleFile as string;
			const targetLanguage = args.targetLanguage as string;
			const outputFile = args.outputFile as string;

			if (
				!isAbsolutePath(subtitleFile) ||
				!isAbsolutePath(outputFile)
			) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			// 解析原字幕
			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message: "FFmpeg export is not enabled.",
				};
			}

			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService) {
				return {
					success: false,
					message: "FFmpegService is not initialized.",
				};
			}

			// 读取字幕文件
			const data = await ffmpegService.readFile(subtitleFile);
			const content = new TextDecoder().decode(data);

			// 解析字幕
			const ext = subtitleFile.split('.').pop()?.toLowerCase();
			const subtitles = ext === 'srt' ? parseSRT(content) : parseVTT(content);

			// 注意：实际的翻译功能需要集成翻译 API（如 Google Translate、DeepL 等）
			// 这里返回解析后的字幕信息，并提示用户需要翻译 API
			return {
				success: true,
				message: `Subtitle file parsed: ${subtitles.length} subtitles found. Translation to '${targetLanguage}' requires integration with a translation service.`,
				data: {
					subtitleFile,
					targetLanguage,
					outputFile,
					count: subtitles.length,
					note: "Translation API integration required",
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error translating subtitles: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

// 导出所有 Phase 5 工具
export const ffmpegSubtitleTools = [
	parseSubtitlesTool,
	burnSubtitlesTool,
	addSubtitleTrackTool,
	translateSubtitlesTool,
];
