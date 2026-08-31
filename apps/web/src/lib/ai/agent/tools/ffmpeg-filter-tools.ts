/**
 * Phase 4: 视频滤镜工具
 *
 * 提供 FilterPipeline 视频滤镜功能的 AI 工具接口
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
 * 构建颜色校正滤镜字符串
 */
function buildColorCorrectionFilter(brightness: number, contrast: number, saturation: number, hue: number): string {
	const filters: string[] = [];

	if (brightness !== 0) {
		filters.push(`brightness=${1 + brightness}`);
	}
	if (contrast !== 1) {
		filters.push(`contrast=${contrast}`);
	}
	if (saturation !== 1) {
		filters.push(`saturation=${saturation}`);
	}
	if (hue !== 0) {
		filters.push(`hue=${hue}`);
	}

	return filters.join(',');
}

/**
 * 应用颜色校正
 *
 * 使用场景：
 * - 调整视频亮度和对比度
 * - 增强或降低饱和度
 * - 调整色相
 */
export const applyColorCorrectionTool: AgentTool = {
	name: "apply_color_correction",
	description: `Apply color correction adjustments to a video.

Use cases:
- Adjust brightness and contrast
- Enhance or reduce color saturation
- Shift hue for creative effects
- Fix underexposed or overexposed footage

Parameters:
- brightness: -1 to 1 (0 = no change)
- contrast: 0 to 2 (1 = no change)
- saturation: 0 to 2 (1 = no change)
- hue: -180 to 180 (0 = no change)

Example: Brighten a dark video
brightness=0.2, contrast=1.1, saturation=1.0, hue=0`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description:
					"Absolute path to input video (e.g., '/video.mp4')",
			},
			outputFile: {
				type: "string",
				description:
					"Absolute path for output video (e.g., '/corrected.mp4')",
			},
			brightness: {
				type: "number",
				description:
					"Brightness adjustment (-1 to 1, default: 0)",
				default: 0,
			},
			contrast: {
				type: "number",
				description:
					"Contrast adjustment (0 to 2, default: 1)",
				default: 1,
			},
			saturation: {
				type: "number",
				description:
					"Saturation adjustment (0 to 2, default: 1)",
				default: 1,
			},
			hue: {
				type: "number",
				description:
					"Hue shift (-180 to 180 degrees, default: 0)",
				default: 0,
			},
		},
		required: ["inputFile", "outputFile"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const outputFile = args.outputFile as string;
			const brightness = (args.brightness as number) ?? 0;
			const contrast = (args.contrast as number) ?? 1;
			const saturation = (args.saturation as number) ?? 1;
			const hue = (args.hue as number) ?? 0;

			if (!isAbsolutePath(inputFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
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

			// 构建滤镜字符串
			const filterStr = buildColorCorrectionFilter(brightness, contrast, saturation, hue);

			if (!filterStr) {
				// 没有滤镜，直接复制
				await ffmpegService.exec([
					"-i", inputFile,
					"-c:v", "copy",
					"-y", outputFile,
				]);
			} else {
				// 应用颜色校正滤镜
				await ffmpegService.exec([
					"-i", inputFile,
					"-vf", filterStr,
					"-c:v", "libx264",
					"-crf", "23",
					"-pix_fmt", "yuv420p",
					"-y", outputFile,
				]);
			}

			return {
				success: true,
				message: `Color correction applied successfully`,
				data: {
					inputFile,
					outputFile,
					brightness,
					contrast,
					saturation,
					hue,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying color correction: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 应用模糊效果
 *
 * 使用场景：
 * - 柔化视频画面
 * - 创建艺术效果
 * - 隐藏敏感信息
 */
export const applyBlurTool: AgentTool = {
	name: "apply_blur",
	description: `Apply blur effect to a video.

Use cases:
- Soften video frames
- Create dreamy or artistic effects
- Blur sensitive information
- Add motion blur simulation

Blur types:
- gaussian: Smooth, natural blur (default)
- box: Simple, fast blur
- motion: Directional motion blur`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description: "Absolute path to input video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output video",
			},
			strength: {
				type: "number",
				description:
					"Blur strength (0 to 20, default: 5)",
				default: 5,
			},
			blurType: {
				type: "string",
				enum: ["gaussian", "box", "motion"],
				description:
					"Blur algorithm (default: gaussian)",
				default: "gaussian",
			},
		},
		required: ["inputFile", "outputFile"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const outputFile = args.outputFile as string;
			const strength = (args.strength as number) ?? 5;
			const blurType = (args.blurType as "gaussian" | "box" | "motion") ?? "gaussian";

			if (!isAbsolutePath(inputFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			if (strength < 0 || strength > 20) {
				return {
					success: false,
					message: "Blur strength must be between 0 and 20",
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

			// 构建模糊滤镜
			let filterStr: string;
			switch (blurType) {
				case "gaussian":
					filterStr = `gblur=sigma=${strength}`;
					break;
				case "box":
					filterStr = `boxblur=${strength}:${strength}`;
					break;
				case "motion":
					filterStr = `minterpolate=fps=12:mi_mode=mci:mc_mode=aobmc:me=epzs:vsbmc=1`;
					break;
				default:
					filterStr = `gblur=sigma=${strength}`;
			}

			// 应用模糊滤镜
			await ffmpegService.exec([
				"-i", inputFile,
				"-vf", filterStr,
				"-c:v", "libx264",
				"-crf", "23",
				"-pix_fmt", "yuv420p",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Blur effect applied successfully (${blurType}, strength: ${strength})`,
				data: {
					inputFile,
					outputFile,
					blurType,
					strength,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying blur: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 应用锐化效果
 *
 * 使用场景：
 * - 增强视频清晰度
 * - 修复轻微模糊
 * - 提升细节表现
 */
export const applySharpenTool: AgentTool = {
	name: "apply_sharpen",
	description: `Apply sharpening effect to a video.

Use cases:
- Enhance video clarity
- Fix slightly blurry footage
- Improve detail definition
- Counteract soft video from compression

Parameters:
- amount: Sharpening strength (0 to 2, default: 1)
- radius: Sharpening radius (1 to 5, default: 1)`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description: "Absolute path to input video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output video",
			},
			amount: {
				type: "number",
				description: "Sharpening strength (0 to 2, default: 1)",
				default: 1,
			},
			radius: {
				type: "number",
				description: "Sharpening radius (1 to 5, default: 1)",
				default: 1,
			},
		},
		required: ["inputFile", "outputFile"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const outputFile = args.outputFile as string;
			const amount = (args.amount as number) ?? 1;
			const radius = (args.radius as number) ?? 1;

			if (!isAbsolutePath(inputFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			if (amount < 0 || amount > 2) {
				return {
					success: false,
					message: "Amount must be between 0 and 2",
				};
			}

			if (radius < 1 || radius > 5) {
				return {
					success: false,
					message: "Radius must be between 1 and 5",
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

			// 应用锐化滤镜
			const filterStr = `unsharp=lx=${radius}:ly=${radius}:la=${amount}`;

			await ffmpegService.exec([
				"-i", inputFile,
				"-vf", filterStr,
				"-c:v", "libx264",
				"-crf", "23",
				"-pix_fmt", "yuv420p",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Sharpen effect applied successfully`,
				data: {
					inputFile,
					outputFile,
					amount,
					radius,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying sharpen effect: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 应用 3D LUT 调色
 *
 * 使用场景：
 * - 应用电影级色彩风格
 * - 专业调色预设
 * - 统一视频色调
 */
export const applyLutTool: AgentTool = {
	name: "apply_lut",
	description: `Apply 3D LUT (Look-Up Table) color grading to a video.

Use cases:
- Apply cinematic color grading presets
- Match footage from different cameras
- Create consistent color style across clips
- Apply professional color grading looks

The LUT file should be a .cube format 3D LUT file.`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description: "Absolute path to input video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output video",
			},
			lutData: {
				type: "string",
				description: "Base64-encoded .cube LUT file content",
			},
			intensity: {
				type: "number",
				description: "LUT intensity (0 to 1, default: 1)",
				default: 1,
			},
		},
		required: ["inputFile", "outputFile", "lutData"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const outputFile = args.outputFile as string;
			const lutData = args.lutData as string;
			const intensity = (args.intensity as number) ?? 1;

			if (!isAbsolutePath(inputFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			if (!lutData || typeof lutData !== "string") {
				return {
					success: false,
					message: "LUT data is required (Base64-encoded .cube file)",
				};
			}

			if (intensity < 0 || intensity > 1) {
				return {
					success: false,
					message: "Intensity must be between 0 and 1",
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

			// 写入 LUT 文件到虚拟文件系统
			const lutFileName = "/lut.cube";
			const lutBuffer = Uint8Array.from(atob(lutData), c => c.charCodeAt(0));
			await ffmpegService.writeFile(lutFileName, lutBuffer);

			// 应用 LUT 滤镜
			const filterStr = `lut3d=${lutFileName}:interp=tetra`;

			await ffmpegService.exec([
				"-i", inputFile,
				"-vf", filterStr,
				"-c:v", "libx264",
				"-crf", "23",
				"-pix_fmt", "yuv420p",
				"-y", outputFile,
			]);

			// 清理 LUT 文件
			await ffmpegService.deleteFile(lutFileName).catch(() => {});

			return {
				success: true,
				message: `LUT applied successfully (intensity: ${intensity})`,
				data: {
					inputFile,
					outputFile,
					intensity,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying LUT: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 应用滤镜链
 *
 * 使用场景：
 * - 组合多个滤镜效果
 * - 创建复杂的视觉风格
 * - 应用预设滤镜链
 */
export const applyFilterChainTool: AgentTool = {
	name: "apply_filter_chain",
	description: `Apply a chain of multiple filters to a video.

Use cases:
- Combine multiple filter effects
- Create complex visual styles
- Apply preset filter chains
- Apply filters in specific order

The filters are applied in the order specified in the chain.`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description: "Absolute path to input video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output video",
			},
			filters: {
				type: "array",
				description: "Array of filter objects to apply",
				items: {
					type: "object",
					properties: {
						type: {
							type: "string",
							enum: ["color_correction", "blur", "sharpen", "lut"],
						},
						params: {
							type: "object",
							description: "Filter parameters (varies by type)",
						},
					},
					required: ["type", "params"],
				},
			},
		},
		required: ["inputFile", "outputFile", "filters"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const outputFile = args.outputFile as string;
			const filters = args.filters as Array<{
				type: string;
				params: Record<string, any>;
			}>;

			if (!isAbsolutePath(inputFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			if (!Array.isArray(filters) || filters.length === 0) {
				return {
					success: false,
					message: "At least one filter is required",
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

			// 构建滤镜链
			const filterParts: string[] = [];

			for (const filter of filters) {
				switch (filter.type) {
					case "color_correction":
						const cc = filter.params;
						const ccFilter = buildColorCorrectionFilter(
							cc.brightness ?? 0,
							cc.contrast ?? 1,
							cc.saturation ?? 1,
							cc.hue ?? 0
						);
						if (ccFilter) filterParts.push(ccFilter);
						break;

					case "blur":
						const blur = filter.params;
						const blurStrength = blur.strength ?? 5;
						const blurType = blur.blurType ?? "gaussian";
						if (blurType === "gaussian") {
							filterParts.push(`gblur=sigma=${blurStrength}`);
						} else if (blurType === "box") {
							filterParts.push(`boxblur=${blurStrength}:${blurStrength}`);
						}
						break;

					case "sharpen":
						const sharp = filter.params;
						filterParts.push(
							`unsharp=lx=${sharp.radius ?? 1}:ly=${sharp.radius ?? 1}:la=${sharp.amount ?? 1}`
						);
						break;

					case "lut":
						const lut = filter.params;
						if (lut.lutData) {
							const lutFileName = "/chain_lut.cube";
							const lutBuffer = Uint8Array.from(atob(lut.lutData), c => c.charCodeAt(0));
							await ffmpegService.writeFile(lutFileName, lutBuffer);
							filterParts.push(`lut3d=${lutFileName}:interp=tetra`);
						}
						break;
				}
			}

			if (filterParts.length === 0) {
				return {
					success: false,
					message: "No valid filters in chain",
				};
			}

			const filterStr = filterParts.join(',');

			// 应用滤镜链
			await ffmpegService.exec([
				"-i", inputFile,
				"-vf", filterStr,
				"-c:v", "libx264",
				"-crf", "23",
				"-pix_fmt", "yuv420p",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Filter chain applied successfully (${filters.length} filters)`,
				data: {
					inputFile,
					outputFile,
					filterCount: filters.length,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying filter chain: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 调整视频速度
 *
 * 使用场景：
 * - 创建慢动作效果
 * - 加速视频
 * - 调整视频节奏
 */
export const adjustVideoSpeedTool: AgentTool = {
	name: "adjust_video_speed",
	description: `Adjust the playback speed of a video.

Use cases:
- Create slow-motion effects
- Speed up timelapse videos
- Adjust video pacing
- Create fast-forward or rewind effects

Speed factors:
- 0.25 = 4x slow motion
- 0.5 = 2x slow motion
- 1 = Normal speed
- 2 = 2x fast forward
- 4 = 4x fast forward`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description: "Absolute path to input video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output video",
			},
			speedFactor: {
				type: "number",
				description: "Speed multiplier (0.25 to 4, 1 = normal speed)",
			},
			preserveAudioPitch: {
				type: "boolean",
				description: "Preserve audio pitch when changing speed (default: true)",
				default: true,
			},
		},
		required: ["inputFile", "outputFile", "speedFactor"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const outputFile = args.outputFile as string;
			const speedFactor = args.speedFactor as number;
			const preserveAudioPitch = (args.preserveAudioPitch as boolean) ?? true;

			if (!isAbsolutePath(inputFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			if (speedFactor < 0.25 || speedFactor > 4) {
				return {
					success: false,
					message: "Speed factor must be between 0.25 and 4",
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

			// 构建速度调整滤镜
			const videoFilter = `setpts=${1 / speedFactor}*PTS`;
			const audioFilter = preserveAudioPitch
				? `atempo=${Math.min(speedFactor, 2)}`
				: `atempo=${speedFactor}`;

			// 注意：如果 speedFactor > 2，需要链式 atempo
			const audioFilterFinal = speedFactor > 2
				? `atempo=2,atempo=${speedFactor / 2}`
				: speedFactor < 0.5
					? `atempo=0.5,atempo=${speedFactor * 2}`
					: audioFilter;

			await ffmpegService.exec([
				"-i", inputFile,
				"-filter_complex", `[0:v]${videoFilter}[v];[0:a]${audioFilterFinal}[a]`,
				"-map", "[v]",
				"-map", "[a]",
				"-c:v", "libx264",
				"-crf", "23",
				"-c:a", "aac",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Video speed adjusted to ${speedFactor}x`,
				data: {
					inputFile,
					outputFile,
					speedFactor,
					preserveAudioPitch,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error adjusting video speed: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 反转视频
 *
 * 使用场景：
 * - 创建倒放效果
 * - 创意视频编辑
 * - 制作倒序动画
 */
export const reverseVideoTool: AgentTool = {
	name: "reverse_video",
	description: `Reverse a video (play backwards).

Use cases:
- Create reverse playback effects
- Creative video editing
- Make rewind animations
- Create mystery or surprise effects

Note: This requires re-encoding the video.`,
	parameters: {
		type: "object",
		properties: {
			inputFile: {
				type: "string",
				description: "Absolute path to input video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output video",
			},
		},
		required: ["inputFile", "outputFile"],
	},
	async execute(args) {
		try {
			const inputFile = args.inputFile as string;
			const outputFile = args.outputFile as string;

			if (!isAbsolutePath(inputFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
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

			// 反转视频和音频
			await ffmpegService.exec([
				"-i", inputFile,
				"-filter_complex", "[0:v]reverse[v];[0:a]areverse[a]",
				"-map", "[v]",
				"-map", "[a]",
				"-c:v", "libx264",
				"-crf", "23",
				"-c:a", "aac",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Video reversed successfully`,
				data: {
					inputFile,
					outputFile,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error reversing video: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

// 导出所有 Phase 4 工具
export const ffmpegFilterTools = [
	applyColorCorrectionTool,
	applyBlurTool,
	applySharpenTool,
	applyLutTool,
	applyFilterChainTool,
	adjustVideoSpeedTool,
	reverseVideoTool,
];
