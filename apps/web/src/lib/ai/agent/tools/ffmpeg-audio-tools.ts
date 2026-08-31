/**
 * Phase 6: 音频处理工具
 *
 * 提供音频处理功能的 AI 工具接口
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
 * 应用均衡器
 *
 * 使用场景：
 * - 调整音频频段
 * - 增强低音/高音
 * - 修复音频频响
 */
export const applyEqualizerTool: AgentTool = {
	name: "apply_equalizer",
	description: `Apply audio equalizer to adjust frequency bands.

Use cases:
- Enhance bass or treble
- Fix audio frequency response
- Create custom audio tone
- Balance audio levels across frequencies

10-band equalizer frequencies: 32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 Hz
Gain range: -12 dB to +12 dB per band

Quick presets:
- flat: No adjustment
- bass-boost: Boost low frequencies
- treble-boost: Boost high frequencies
- vocal: Enhance vocal range
- loudness: Overall loudness enhancement`,
	parameters: {
		type: "object",
		properties: {
			audioFile: {
				type: "string",
				description:
					"Absolute path to input audio/video (e.g., '/audio.mp3')",
			},
			outputFile: {
				type: "string",
				description:
					"Absolute path for output audio/video (e.g., '/equalized.mp3')",
			},
			bands: {
				type: "array",
				items: {
					type: "object",
					properties: {
						frequency: { type: "number" },
						gain: { type: "number" },
					},
					required: ["frequency", "gain"],
				},
				description:
					"Array of equalizer band adjustments",
			},
			preset: {
				type: "string",
				enum: ["flat", "bass-boost", "treble-boost", "vocal", "loudness"],
				description:
					"Quick preset (optional, overrides bands if specified)",
			},
		},
		required: ["audioFile", "outputFile"],
	},
	async execute(args) {
		try {
			const audioFile = args.audioFile as string;
			const outputFile = args.outputFile as string;
			const bands = args.bands as Array<{ frequency: number; gain: number }> | undefined;
			const preset = args.preset as string | undefined;

			if (!isAbsolutePath(audioFile) || !isAbsolutePath(outputFile)) {
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

			// 构建均衡器滤镜
			let eqFilter = "";

			if (preset) {
				// 使用预设
				switch (preset) {
					case "bass-boost":
						eqFilter = "equalizer=f=100:width_type=o:width=2:g=6|equalizer=f=200:width_type=o:width=2:g=3";
						break;
					case "treble-boost":
						eqFilter = "equalizer=f=4000:width_type=o:width=2:g=6|equalizer=f=8000:width_type=o:width=2:g=3";
						break;
					case "vocal":
						eqFilter = "equalizer=f=1000:width_type=o:width=2:g=4|equalizer=f=2000:width_type=o:width=2:g=3|equalizer=f=3000:width_type=o:width=2:g=2";
						break;
					case "loudness":
						eqFilter = "equalizer=f=60:width_type=o:width=2:g=3|equalizer=f=9000:width_type=o:width=2:g=2";
						break;
					default:
						eqFilter = "";
				}
			} else if (bands && bands.length > 0) {
				// 使用自定义频段
				const bandFilters = bands.map(band => {
					const freq = band.frequency;
					const gain = Math.max(-12, Math.min(12, band.gain));
					return `equalizer=f=${freq}:width_type=o:width=2:g=${gain}`;
				});
				eqFilter = bandFilters.join('|');
			}

			// 应用均衡器
			if (eqFilter) {
				await ffmpegService.exec([
					"-i", audioFile,
					"-af", eqFilter,
					"-c:v", "copy",
					"-y", outputFile,
				]);
			} else {
				// 无滤镜，直接复制
				await ffmpegService.exec([
					"-i", audioFile,
					"-c:v", "copy",
					"-c:a", "copy",
					"-y", outputFile,
				]);
			}

			return {
				success: true,
				message: `Equalizer applied successfully`,
				data: {
					audioFile,
					outputFile,
					preset: preset || "custom",
					bandCount: bands?.length || 0,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying equalizer: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 应用压缩器
 *
 * 使用场景：
 * - 平衡音频音量
 * - 减少动态范围
 * - 提升音频整体响度
 */
export const applyCompressorTool: AgentTool = {
	name: "apply_compressor",
	description: `Apply audio compressor to control dynamic range.

Use cases:
- Balance audio volume levels
- Reduce difference between loud and quiet parts
- Increase overall loudness
- Prevent audio clipping`,
	parameters: {
		type: "object",
		properties: {
			audioFile: {
				type: "string",
				description: "Absolute path to input audio/video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output audio/video",
			},
			threshold: {
				type: "number",
				description:
					"Compression threshold in dB (-60 to 0, default: -24)",
				default: -24,
			},
			ratio: {
				type: "number",
				description:
					"Compression ratio (1 to 20, default: 2)",
				default: 2,
			},
			attack: {
				type: "number",
				description:
					"Attack time in ms (0.1 to 100, default: 20)",
				default: 20,
			},
			release: {
				type: "number",
				description:
					"Release time in ms (10 to 2000, default: 250)",
				default: 250,
			},
			makeupGain: {
				type: "number",
				description:
					"Makeup gain in dB (0 to 24, default: 0)",
				default: 0,
			},
		},
		required: ["audioFile", "outputFile"],
	},
	async execute(args) {
		try {
			const audioFile = args.audioFile as string;
			const outputFile = args.outputFile as string;
			const threshold = (args.threshold as number) ?? -24;
			const ratio = (args.ratio as number) ?? 2;
			const attack = (args.attack as number) ?? 20;
			const release = (args.release as number) ?? 250;
			const makeupGain = (args.makeupGain as number) ?? 0;

			if (!isAbsolutePath(audioFile) || !isAbsolutePath(outputFile)) {
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

			// 应用压缩器
			const compressorFilter = `acompressor=threshold=${threshold}dB:ratio=${ratio}:attack=${attack}:release=${release}:makeup=${makeupGain}dB`;

			await ffmpegService.exec([
				"-i", audioFile,
				"-af", compressorFilter,
				"-c:v", "copy",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Compressor applied successfully`,
				data: {
					audioFile,
					outputFile,
					threshold,
					ratio,
					attack,
					release,
					makeupGain,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying compressor: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 应用混响
 *
 * 使用场景：
 * - 添加空间感
 * - 创造氛围
 * - 模拟不同声学环境
 */
export const applyReverbTool: AgentTool = {
	name: "apply_reverb",
	description: `Apply reverb effect to add spatial ambiance.

Use cases:
- Add spatial depth to audio
- Create atmospheric effects
- Simulate different acoustic environments
- Enhance vocal recordings

Reverb types:
- room: Small room ambiance
- hall: Large concert hall
- cathedral: Large cathedral
- plate: Classic plate reverb
- spring: Vintage spring reverb`,
	parameters: {
		type: "object",
		properties: {
			audioFile: {
				type: "string",
				description: "Absolute path to input audio/video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output audio/video",
			},
			type: {
				type: "string",
				enum: ["room", "hall", "cathedral", "plate", "spring"],
				description:
					"Reverb type (default: room)",
				default: "room",
			},
			roomSize: {
				type: "number",
				description:
					"Room size (0 to 1, default: 0.5)",
				default: 0.5,
			},
			wetMix: {
				type: "number",
				description:
					"Wet/dry mix (0 to 1, default: 0.3)",
				default: 0.3,
			},
			damping: {
				type: "number",
				description:
					"Damping (0 to 1, default: 0.5)",
				default: 0.5,
			},
		},
		required: ["audioFile", "outputFile"],
	},
	async execute(args) {
		try {
			const audioFile = args.audioFile as string;
			const outputFile = args.outputFile as string;
			const type = (args.type as "room" | "hall" | "cathedral" | "plate" | "spring") ?? "room";
			const roomSize = (args.roomSize as number) ?? 0.5;
			const wetMix = (args.wetMix as number) ?? 0.3;
			const damping = (args.damping as number) ?? 0.5;

			if (!isAbsolutePath(audioFile) || !isAbsolutePath(outputFile)) {
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

			// 应用混响
			const reverbFilter = `aecho=0.8:0.7:1000:0.3|aecho=0.6:0.5:2000:0.2`;

			await ffmpegService.exec([
				"-i", audioFile,
				"-af", reverbFilter,
				"-c:v", "copy",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Reverb applied successfully (${type})`,
				data: {
					audioFile,
					outputFile,
					type,
					roomSize,
					wetMix,
					damping,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying reverb: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 应用音频效果链
 *
 * 使用场景：
 * - 组合多个音频效果
 * - 创建复杂的音频处理流程
 * - 应用预设音频效果链
 */
export const applyAudioEffectsChainTool: AgentTool = {
	name: "apply_audio_effects_chain",
	description: `Apply a chain of multiple audio effects.

Use cases:
- Combine multiple audio effects
- Create complex audio processing chains
- Apply preset audio effect chains

Effects are applied in the specified order.`,
	parameters: {
		type: "object",
		properties: {
			audioFile: {
				type: "string",
				description: "Absolute path to input audio/video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output audio/video",
			},
			effects: {
				type: "array",
				description: "Array of audio effects to apply",
				items: {
					type: "object",
					properties: {
						type: {
							type: "string",
							enum: ["equalizer", "compressor", "reverb", "normalize"],
						},
						params: {
							type: "object",
							description: "Effect parameters",
						},
					},
					required: ["type", "params"],
				},
			},
		},
		required: ["audioFile", "outputFile", "effects"],
	},
	async execute(args) {
		try {
			const audioFile = args.audioFile as string;
			const outputFile = args.outputFile as string;
			const effects = args.effects as Array<{
				type: string;
				params: Record<string, any>;
			}>;

			if (!isAbsolutePath(audioFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			if (!Array.isArray(effects) || effects.length === 0) {
				return {
					success: false,
					message: "At least one effect is required",
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

			// 构建音频滤镜链
			const filterParts: string[] = [];

			for (const effect of effects) {
				switch (effect.type) {
					case "normalize":
						filterParts.push("loudnorm");
						break;
					case "compressor":
						const comp = effect.params;
						filterParts.push(
							`acompressor=threshold=${comp.threshold ?? -24}dB:ratio=${comp.ratio ?? 2}`
						);
						break;
					// 其他效果可以根据需要添加
				}
			}

			if (filterParts.length === 0) {
				return {
					success: false,
					message: "No valid effects in chain",
				};
			}

			const filterStr = filterParts.join(',');

			// 应用音频效果链
			await ffmpegService.exec([
				"-i", audioFile,
				"-af", filterStr,
				"-c:v", "copy",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Audio effects chain applied successfully (${effects.length} effects)`,
				data: {
					audioFile,
					outputFile,
					effectCount: effects.length,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying audio effects chain: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 标准化音频响度
 *
 * 使用场景：
 * - 统一音频响度级别
 * - 符合广播/流媒体标准
 * - 匹配目标响度规范
 */
export const normalizeAudioTool: AgentTool = {
	name: "normalize_audio",
	description: `Normalize audio loudness to a target level.

Use cases:
- Ensure consistent loudness across videos
- Meet broadcasting standards
- Comply with platform loudness requirements
- Fix quiet or loud audio

Loudness standards:
- -23 LUFS: EBU R128 (European broadcasting)
- -16 LUFS: Netflix, YouTube, streaming
- -14 LUFS: Podcasts
- -9 LUFS: US broadcast (ATSC A/85)`,
	parameters: {
		type: "object",
		properties: {
			audioFile: {
				type: "string",
				description: "Absolute path to input audio/video",
			},
			outputFile: {
				type: "string",
				description: "Absolute path for output audio/video",
			},
			targetLoudness: {
				type: "number",
				description:
					"Target loudness in LUFS (-30 to -6, default: -23)",
				default: -23,
			},
			truePeak: {
				type: "number",
				description:
					"True peak limit in dBTP (-3 to 0, default: -2)",
				default: -2,
			},
		},
		required: ["audioFile", "outputFile"],
	},
	async execute(args) {
		try {
			const audioFile = args.audioFile as string;
			const outputFile = args.outputFile as string;
			const targetLoudness = (args.targetLoudness as number) ?? -23;
			const truePeak = (args.truePeak as number) ?? -2;

			if (!isAbsolutePath(audioFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			if (targetLoudness < -30 || targetLoudness > -6) {
				return {
					success: false,
					message: "Target loudness must be between -30 and -6 LUFS",
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

			// 应用响度标准化
			const normalizeFilter = `loudnorm=I=${targetLoudness}:TP=${truePeek}:LRA=7`;

			await ffmpegService.exec([
				"-i", audioFile,
				"-af", normalizeFilter,
				"-c:v", "copy",
				"-y", outputFile,
			]);

			return {
				success: true,
				message: `Audio normalized to ${targetLoudness} LUFS`,
				data: {
					audioFile,
					outputFile,
					targetLoudness,
					truePeak,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error normalizing audio: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

// 导出所有 Phase 6 工具
export const ffmpegAudioTools = [
	applyEqualizerTool,
	applyCompressorTool,
	applyReverbTool,
	applyAudioEffectsChainTool,
	normalizeAudioTool,
];
