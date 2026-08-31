/**
 * Phase 6: 音频处理工具
 *
 * 提供 AudioProcessor 音频处理功能的 AI 工具接口
 */

import type { AgentTool } from "./types";

/**
 * 验证文件路径
 */
function isAbsolutePath(path: unknown): path is string {
	return typeof path === "string" && path.startsWith("/");

// 继续创建 Phase 6 音频工具
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

10-band equalizer:
- 32 Hz (sub-bass)
- 64 Hz (bass)
- 125 Hz (low-mids)
- 250 Hz (mids)
- 500 Hz (upper-mids)
- 1 kHz (presence)
- 2 kHz (upper presence)
- 4 kHz (brilliance)
- 8 kHz (air)
- 16 kHz (high air)

Gain range: -12 dB to +12 dB per band`,
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
						frequency: {
							type: "number",
							enum: [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
							description: "Frequency in Hz",
						},
						gain: {
							type: "number",
							description: "Gain in dB (-12 to +12)",
							minimum: -12,
							maximum: 12,
						},
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

			if (bands) {
				for (const band of bands) {
					if (band.gain < -12 || band.gain > 12) {
						return {
							success: false,
							message: "Gain must be between -12 and +12 dB",
						};
					}
				}
			}

			// 注意：需要访问 Equalizer
			return {
				success: false,
				message:
					"Equalizer is not yet exposed through the AI tools interface. This feature is coming soon.",
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
- Prevent audio clipping

Parameters:
- threshold: Level above which compression starts (dB)
- ratio: Compression ratio (e.g., 2:1, 4:1)
- attack: How quickly compression starts (ms)
- release: How quickly compression stops (ms)
- makeupGain: Boost output level (dB)`,
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
				minimum: -60,
				maximum: 0,
			},
			ratio: {
				type: "number",
				description:
					"Compression ratio (1 to 20, default: 2)",
				default: 2,
				minimum: 1,
				maximum: 20,
			},
			attack: {
				type: "number",
				description:
					"Attack time in ms (0.1 to 100, default: 20)",
				default: 20,
				minimum: 0.1,
				maximum: 100,
			},
			release: {
				type: "number",
				description:
					"Release time in ms (10 to 2000, default: 250)",
				default: 250,
				minimum: 10,
				maximum: 2000,
			},
			makeupGain: {
				type: "number",
				description:
					"Makeup gain in dB (0 to 24, default: 0)",
				default: 0,
				minimum: 0,
				maximum: 24,
			},
			preset: {
				type: "string",
				enum: ["gentle", "moderate", "aggressive", "mastering"],
				description:
					"Quick preset (optional, overrides other params)",
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
			const preset = args.preset as string | undefined;

			if (!isAbsolutePath(audioFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			// 参数范围验证
			if (threshold < -60 || threshold > 0) {
				return {
					success: false,
					message: "threshold must be between -60 and 0 dB",
				};
			}

			// 注意：需要访问 Compressor
			return {
				success: false,
				message:
					"Compressor is not yet exposed through the AI tools interface. This feature is coming soon.",
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
 * - 模拟不同环境（房间、大厅等）
 * - 增强音频深度
 */
export const applyReverbTool: AgentTool = {
	name: "apply_reverb",
	description: `Apply reverb effect to add spatial depth to audio.

Use cases:
- Add room ambience to vocals
- Create spatial depth in audio
- Simulate different acoustic environments
- Enhance music or voice recordings

Reverb types:
- room: Small room ambience
- hall: Large concert hall
- cathedral: Large sacred space
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
				minimum: 0,
				maximum: 1,
			},
			wetMix: {
				type: "number",
				description:
					"Wet/dry mix (0 to 1, where 0 = dry, 1 = wet, default: 0.3)",
				default: 0.3,
				minimum: 0,
				maximum: 1,
			},
			damping: {
				type: "number",
				description:
					"Damping (0 to 1, default: 0.5)",
				default: 0.5,
				minimum: 0,
				maximum: 1,
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

			// 参数范围验证
			if (roomSize < 0 || roomSize > 1) {
				return {
					success: false,
					message: "roomSize must be between 0 and 1",
				};
			}

			if (wetMix < 0 || wetMix > 1) {
				return {
					success: false,
					message: "wetMix must be between 0 and 1",
				};
			}

			// 注意：需要访问 Reverb
			return {
				success: false,
				message:
					"Reverb is not yet exposed through the AI tools interface. This feature is coming soon.",
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
 * - 同时应用多种音频效果
 * - 创建专业音频处理流程
 * - 保存和应用音频预设
 */
export const applyAudioEffectsChainTool: AgentTool = {
	name: "apply_audio_effects_chain",
	description: `Apply multiple audio effects in sequence.

Use cases:
- Apply multiple effects at once (e.g., EQ + compression + reverb)
- Create professional audio processing chains
- Save and reuse audio presets

Available effects:
- equalizer: 10-band frequency adjustment
- compressor: Dynamic range control
- reverb: Spatial depth enhancement

Effects are applied in the order specified.`,
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
				description:
					"Array of audio effects to apply",
				items: {
					type: "object",
					properties: {
						type: {
							type: "string",
							enum: ["equalizer", "compressor", "reverb"],
						},
						// Equalizer params
						eqBands: {
							type: "array",
							items: {
								type: "object",
								properties: {
									frequency: { type: "number" },
									gain: { type: "number" },
								},
							},
						},
						eqPreset: { type: "string" },
						// Compressor params
						compThreshold: { type: "number" },
						compRatio: { type: "number" },
						compAttack: { type: "number" },
						compRelease: { type: "number" },
						compMakeupGain: { type: "number" },
						compPreset: { type: "string" },
						// Reverb params
						reverbType: { type: "string" },
						reverbRoomSize: { type: "number" },
						reverbWetMix: { type: "number" },
						reverbDamping: { type: "number" },
					},
					required: ["type"],
				},
			},
		},
		required: ["audioFile", "outputFile", "effects"],
	},
	async execute(args) {
		try {
			const audioFile = args.audioFile as string;
			const outputFile = args.outputFile as string;
			const effects = args.effects as unknown[];

			if (!isAbsolutePath(audioFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			if (!Array.isArray(effects) || effects.length === 0) {
				return {
					success: false,
					message: "At least 1 effect is required",
				};
			}

			// 注意：需要访问 AudioProcessor
			return {
				success: false,
				message:
					"Audio effects chain is not yet exposed through the AI tools interface. This feature is coming soon.",
			};
		} catch (error) {
			return {
				success: false,
				message: `Error applying audio effects: ${
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
 * - 统一多段音频的响度
 * - 符合广播标准（LUFS）
 * - 提升音频整体响度
 */
export const normalizeAudioTool: AgentTool = {
	name: "normalize_audio",
	description: `Normalize audio loudness to a target level.

Use cases:
- Ensure consistent volume across multiple clips
- Meet broadcast loudness standards
- Boost quiet audio recordings

Loudness standards:
- -23 LUFS: EBU R128 (European broadcast)
- -16 LUFS: Netflix, YouTube, streaming
- -14 LUFS: Podcasts
- -9 LUFS: US broadcast ATSC A/85`,
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
					"Target loudness in LUFS (default: -16)",
				default: -16,
				minimum: -30,
				maximum: -6,
			},
			truePeak: {
				type: "number",
				description:
					"True peak limit in dBTP (default: -1)",
				default: -1,
				minimum: -3,
				maximum: 0,
			},
		},
		required: ["audioFile", "outputFile"],
	},
	async execute(args) {
		try {
			const audioFile = args.audioFile as string;
			const outputFile = args.outputFile as string;
			const targetLoudness = (args.targetLoudness as number) ?? -16;
			const truePeak = (args.truePeak as number) ?? -1;

			if (!isAbsolutePath(audioFile) || !isAbsolutePath(outputFile)) {
				return {
					success: false,
					message: "File paths must be absolute",
				};
			}

			if (targetLoudness < -30 || targetLoudness > -6) {
				return {
					success: false,
					message: "targetLoudness must be between -30 and -6 LUFS",
				};
			}

			// 注意：这个工具需要自定义实现
			return {
				success: false,
				message:
					"Audio normalization is not yet exposed through the AI tools interface. This feature is coming soon.",
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
