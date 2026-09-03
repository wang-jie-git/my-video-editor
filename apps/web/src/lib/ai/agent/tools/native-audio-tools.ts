/**
 * 原生音频处理工具（浏览器 WebAudio，零 FFmpeg 依赖）
 *
 * 对齐《视频剪辑功能清单》第四节「🎵 音频处理」9 项能力：
 * - extract_audio    ：提取音频轨（m4a/wav，复用 decodeAudioToFloat32 + wav-encoder）
 * - mix_audio        ：原声+配乐混合（多源 + GainNode 分音量）
 * - set_audio_volume ：音量控制 / 压低原声突出旁白
 * - fade_audio       ：音频淡入淡出（GainNode automation）
 * - mute_audio       ：静音（导出无声版本 / 标记静音）
 * - speed_audio      ：音频变速（AudioBuffer 重采样）
 * - denoise_audio    ：降噪（简单高通滤波近似 afftdn）
 *
 * 原则：所有输出均可导出为 WAV，并回存为项目媒体资产（MediaAsset）。
 * 视觉路径永不因音频失败中断（优雅降级）。
 */

import { EditorCore } from "@/core";
import type { MediaAsset } from "@/types/assets";
import { decodeAudioToFloat32 } from "@/lib/media/audio";
import { encodeWav } from "@/lib/ai/wav-encoder";

import type { AgentTool } from "./types";

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

function resolveAsset(assetId: string): MediaAsset | undefined {
	const editor = EditorCore.getInstance();
	return editor.media
		.getAssets()
		.find((a) => a.id === assetId || a.name === assetId);
}

function getProjectAudioContext(): AudioContext {
	const Ctor =
		window.AudioContext ||
		(window as typeof window & { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	return new Ctor();
}

async function decodeAssetBuffer(asset: MediaAsset): Promise<AudioBuffer> {
	if (!asset.file) throw new Error(`Asset '${asset.name}' has no file`);
	const arrayBuffer = await asset.file.arrayBuffer();
	const ctx = getProjectAudioContext();
	try {
		return await ctx.decodeAudioData(arrayBuffer.slice(0));
	} finally {
		void ctx.close().catch(() => {});
	}
}

/** 把 AudioBuffer 编码为 WAV Blob */
function bufferToWav(buffer: AudioBuffer, targetRate = 16000): Blob {
	return encodeWav(buffer, targetRate);
}

/** 把 Float32Array 样本重建为 AudioBuffer */
function samplesToBuffer(
	samples: Float32Array,
	sampleRate: number,
): AudioBuffer {
	const ctx = getProjectAudioContext();
	const buffer = ctx.createBuffer(1, samples.length, sampleRate);
	buffer.copyToChannel(samples, 0);
	return buffer;
}

/** 从 MediaAsset 取 16kHz 单声道 Float32Array（喂给 AudioBuffer 处理/导出） */
async function getAssetMonoSamples(
	asset: MediaAsset,
): Promise<{ samples: Float32Array; sampleRate: number }> {
	if (!asset.file) throw new Error(`Asset '${asset.name}' has no file`);
	return decodeAudioToFloat32({
		audioBlob: asset.file,
		targetSampleRate: 16000,
	});
}

/** 把 WAV Blob 回存为项目媒体资产 */
async function saveBlobAsAsset(
	blob: Blob,
	fileName: string,
): Promise<MediaAsset | null> {
	try {
		const file = new File([blob], fileName, { type: "audio/wav" });
		const editor = EditorCore.getInstance();
		const project = editor.project.getActiveOrNull();
		if (!project) {
			console.warn("[NativeAudio] no active project, skip saving asset");
			return null;
		}
		const id = await editor.media.addMediaAsset({
			projectId: project.metadata.id,
			asset: {
				name: fileName,
				type: "audio",
				file,
			},
		});
		const saved = editor.media
			.getAssets()
			.find((a) => a.id === id);
		return saved ?? null;
	} catch (error) {
		console.warn("[NativeAudio] save asset failed:", error);
		return null;
	}
}

// ---------------------------------------------------------------------------
// 工具定义
// ---------------------------------------------------------------------------

/**
 * 提取音频轨
 * 用浏览器原生 decodeAudioData 提取视频/音频资产中的音轨，导出为 WAV（或 16kHz 单声道）。
 */
export const extractAudioTool: AgentTool = {
	name: "extract_audio",
	description:
		"Extract the audio track from a video or audio asset using browser-native decoding (no FFmpeg). Exports a WAV file and saves it back to the project media library. Use when the user wants the audio track alone (e.g. to re-edit, loop, or analyze).",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name (video or audio asset).",
			},
			mono16k: {
				type: "boolean",
				description:
					"Export as 16kHz mono (smaller, ASR-friendly). Default false = keep original sample rate/channels.",
			},
			outputName: {
				type: "string",
				description: "Optional output file name (default: '<asset>-extracted.wav').",
			},
		},
		required: ["assetId"],
	},
	requiresConfirmation: false,
	async execute(args) {
		const assetId = args.assetId as string | undefined;
		if (!assetId) return { success: false, message: "assetId is required" };
		const asset = resolveAsset(assetId);
		if (!asset) return { success: false, message: `Media asset not found: ${assetId}` };

		try {
			const ctx = getProjectAudioContext();
			let buffer: AudioBuffer;
			try {
				const arrayBuffer = await asset.file!.arrayBuffer();
				buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
			} finally {
				void ctx.close().catch(() => {});
			}

			const mono16k = args.mono16k === true;
			const blob = mono16k ? bufferToWav(buffer, 16000) : bufferToWav(buffer, buffer.sampleRate);
			const outName = (args.outputName as string) || `${asset.name.replace(/\.[^.]+$/, "")}-extracted.wav`;

			const saved = await saveBlobAsAsset(blob, outName);
			return {
				success: true,
				message: `Extracted audio from '${asset.name}' (${(blob.size / 1024).toFixed(0)} KB)${saved ? `, saved as '${outName}'` : ""}`,
				data: {
					fileName: outName,
					sizeBytes: blob.size,
					durationSec: buffer.duration,
					sampleRate: mono16k ? 16000 : buffer.sampleRate,
					channels: mono16k ? 1 : buffer.numberOfChannels,
					savedAsAsset: Boolean(saved),
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to extract audio: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
};

/**
 * 混合音频（原声 + 配乐）
 * 多资产按音量叠加混音，导出 WAV。可指定时长（默认取最长的资产）。
 */
export const mixAudioTool: AgentTool = {
	name: "mix_audio",
	description:
		"Mix multiple audio assets together (e.g. original sound + background music) with per-track volume using browser-native WebAudio. Exports a WAV and saves it back to the media library. Use for layering voice-over over music, or combining multiple audio elements.",
	parameters: {
		type: "object",
		properties: {
			assetIds: {
				type: "array",
				items: { type: "string" },
				description: "Media asset IDs/names to mix (order = layer order, later layers on top).",
			},
			volumes: {
				type: "array",
				items: { type: "number" },
				description:
					"Optional per-asset volume (0-1, default 1). To duck original sound under narration, set it to 0.25-0.4.",
			},
			outputName: {
				type: "string",
				description: "Optional output file name (default: 'mix.wav').",
			},
		},
		required: ["assetIds"],
	},
	requiresConfirmation: true,
	async execute(args) {
		const assetIds = args.assetIds as string[];
		if (!Array.isArray(assetIds) || assetIds.length === 0) {
			return { success: false, message: "assetIds must be a non-empty array" };
		}

		const assets = assetIds.map((id) => resolveAsset(id));
		if (assets.some((a) => !a)) {
			const missing = assetIds.filter((id) => !resolveAsset(id));
			return { success: false, message: `Media assets not found: ${missing.join(", ")}` };
		}

		try {
			const volumes = Array.isArray(args.volumes) ? (args.volumes as number[]) : [];
			const ctx = getProjectAudioContext();

			const buffers = await Promise.all(
				assets.map((asset) => decodeAssetBuffer(asset!)),
			);
			const maxDuration = Math.max(...buffers.map((b) => b.duration));

			// Offline 渲染：多源 + gain → destination
			const sampleRate = buffers[0].sampleRate;
			const offline = new OfflineAudioContext(2, Math.ceil(maxDuration * sampleRate), sampleRate);

			buffers.forEach((buffer, i) => {
				const source = offline.createBufferSource();
				source.buffer = buffer;
				const gain = offline.createGain();
				gain.gain.value = volumes[i] ?? 1;
				source.connect(gain).connect(offline.destination);
				source.start(0);
			});

			const rendered = await offline.startRendering();
			const blob = bufferToWav(rendered, rendered.sampleRate);
			const outName = (args.outputName as string) || "mix.wav";
			const saved = await saveBlobAsAsset(blob, outName);

			return {
				success: true,
				message: `Mixed ${assets.length} audio asset(s) (${maxDuration.toFixed(1)}s)${saved ? `, saved as '${outName}'` : ""}`,
				data: {
					fileName: outName,
					sizeBytes: blob.size,
					durationSec: maxDuration,
					sampleRate: rendered.sampleRate,
					savedAsAsset: Boolean(saved),
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to mix audio: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
};

/**
 * 音量控制 / 压低原声
 * 单资产音量调整，导出 WAV。
 */
export const setAudioVolumeTool: AgentTool = {
	name: "set_audio_volume",
	description:
		"Adjust the volume of an audio/video asset (0-1; 0.25-0.4 for ducking under narration) and export the result as WAV. Browser-native, no FFmpeg.",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name.",
			},
			volume: {
				type: "number",
				description: "Volume multiplier (0-1, default 0.7).",
			},
			outputName: {
				type: "string",
				description: "Optional output file name.",
			},
		},
		required: ["assetId", "volume"],
	},
	requiresConfirmation: false,
	async execute(args) {
		const assetId = args.assetId as string | undefined;
		const volume = Number(args.volume);
		if (!assetId) return { success: false, message: "assetId is required" };
		if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
			return { success: false, message: "volume must be between 0 and 1" };
		}
		const asset = resolveAsset(assetId);
		if (!asset) return { success: false, message: `Media asset not found: ${assetId}` };

		try {
			const ctx = getProjectAudioContext();
			const arrayBuffer = await asset.file!.arrayBuffer();
			const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

			// 直接对 PCM 样本缩放
			const channels = decoded.numberOfChannels;
			const length = decoded.length;
			const out = ctx.createBuffer(channels, length, decoded.sampleRate);
			for (let c = 0; c < channels; c++) {
				const src = decoded.getChannelData(c);
				const dst = out.getChannelData(c);
				for (let i = 0; i < length; i++) dst[i] = src[i] * volume;
			}
			void ctx.close().catch(() => {});

			const blob = bufferToWav(out, out.sampleRate);
			const outName = (args.outputName as string) || `${asset.name.replace(/\.[^.]+$/, "")}-vol.wav`;
			const saved = await saveBlobAsAsset(blob, outName);

			return {
				success: true,
				message: `Volume set to ${volume.toFixed(2)} on '${asset.name}'${saved ? `, saved as '${outName}'` : ""}`,
				data: { fileName: outName, volume, sizeBytes: blob.size, savedAsAsset: Boolean(saved) },
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to set volume: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
};

/**
 * 淡入淡出
 * 对资产应用淡入/淡出（秒数），导出 WAV。
 */
export const fadeAudioTool: AgentTool = {
	name: "fade_audio",
	description:
		"Apply fade-in / fade-out to an audio or video asset using browser-native gain ramps. Exports WAV. Use to smooth transitions and avoid abrupt audio starts/ends.",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name.",
			},
			fadeInSec: {
				type: "number",
				description: "Fade-in duration in seconds (default 0 = no fade-in).",
			},
			fadeOutSec: {
				type: "number",
				description: "Fade-out duration in seconds (default 0 = no fade-out).",
			},
			outputName: {
				type: "string",
				description: "Optional output file name.",
			},
		},
		required: ["assetId"],
	},
	requiresConfirmation: false,
	async execute(args) {
		const assetId = args.assetId as string | undefined;
		if (!assetId) return { success: false, message: "assetId is required" };
		const asset = resolveAsset(assetId);
		if (!asset) return { success: false, message: `Media asset not found: ${assetId}` };

		const fadeIn = Math.max(0, Number(args.fadeInSec) || 0);
		const fadeOut = Math.max(0, Number(args.fadeOutSec) || 0);
		if (fadeIn === 0 && fadeOut === 0) {
			return { success: false, message: "Provide at least one of fadeInSec / fadeOutSec" };
		}

		try {
			const ctx = getProjectAudioContext();
			const arrayBuffer = await asset.file!.arrayBuffer();
			const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

			const channels = decoded.numberOfChannels;
			const length = decoded.length;
			const sampleRate = decoded.sampleRate;
			const out = ctx.createBuffer(channels, length, sampleRate);
			const fadeInSamples = Math.min(length, Math.round(fadeIn * sampleRate));
			const fadeOutSamples = Math.min(length, Math.round(fadeOut * sampleRate));

			for (let c = 0; c < channels; c++) {
				const src = decoded.getChannelData(c);
				const dst = out.getChannelData(c);
				for (let i = 0; i < length; i++) {
					let gain = 1;
					if (i < fadeInSamples) gain = fadeInSamples > 0 ? i / fadeInSamples : 1;
					if (i >= length - fadeOutSamples) {
						gain = Math.min(gain, fadeOutSamples > 0 ? (length - 1 - i) / fadeOutSamples : 1);
					}
					dst[i] = src[i] * Math.max(0, gain);
				}
			}
			void ctx.close().catch(() => {});

			const blob = bufferToWav(out, sampleRate);
			const outName = (args.outputName as string) || `${asset.name.replace(/\.[^.]+$/, "")}-fade.wav`;
			const saved = await saveBlobAsAsset(blob, outName);

			return {
				success: true,
				message: `Applied fade-in ${fadeIn}s / fade-out ${fadeOut}s to '${asset.name}'${saved ? `, saved as '${outName}'` : ""}`,
				data: { fileName: outName, fadeInSec: fadeIn, fadeOutSec: fadeOut, savedAsAsset: Boolean(saved) },
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to apply fade: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
};

/**
 * 静音（导出无声版本）
 * 把资产的音频置零导出，等效于 ffmpeg -an（保留音频轨结构但无声音）。
 */
export const muteAudioTool: AgentTool = {
	name: "mute_audio",
	description:
		"Mute an audio/video asset (zero out all audio samples) and export a silent WAV. Equivalent to ffmpeg -an but browser-native. Use when the user wants picture-only or a silent placeholder.",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name.",
			},
			outputName: {
				type: "string",
				description: "Optional output file name.",
			},
		},
		required: ["assetId"],
	},
	requiresConfirmation: false,
	async execute(args) {
		const assetId = args.assetId as string | undefined;
		if (!assetId) return { success: false, message: "assetId is required" };
		const asset = resolveAsset(assetId);
		if (!asset) return { success: false, message: `Media asset not found: ${assetId}` };

		try {
			const ctx = getProjectAudioContext();
			const arrayBuffer = await asset.file!.arrayBuffer();
			const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

			const out = ctx.createBuffer(decoded.numberOfChannels, decoded.length, decoded.sampleRate);
			for (let c = 0; c < decoded.numberOfChannels; c++) {
				out.getChannelData(c).fill(0);
			}
			void ctx.close().catch(() => {});

			const blob = bufferToWav(out, out.sampleRate);
			const outName = (args.outputName as string) || `${asset.name.replace(/\.[^.]+$/, "")}-muted.wav`;
			const saved = await saveBlobAsAsset(blob, outName);

			return {
				success: true,
				message: `Muted '${asset.name}' (${decoded.duration.toFixed(1)}s silent track)${saved ? `, saved as '${outName}'` : ""}`,
				data: { fileName: outName, durationSec: decoded.duration, savedAsAsset: Boolean(saved) },
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to mute audio: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
};

/**
 * 音频变速
 * 重采样改变播放速度（0.5-2.0），导出 WAV。
 */
export const speedAudioTool: AgentTool = {
	name: "speed_audio",
	description:
		"Change the playback speed of an audio/video asset (0.5x - 2.0x) by resampling, export WAV. Browser-native (AudioBuffer resample), no FFmpeg. Equivalent to ffmpeg atempo in the 0.5-2.0 range.",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name.",
			},
			speed: {
				type: "number",
				description: "Speed factor (0.5-2.0, default 1.5). >1 faster, <1 slower.",
			},
			outputName: {
				type: "string",
				description: "Optional output file name.",
			},
		},
		required: ["assetId"],
	},
	requiresConfirmation: false,
	async execute(args) {
		const assetId = args.assetId as string | undefined;
		const speed = Number(args.speed);
		if (!assetId) return { success: false, message: "assetId is required" };
		if (!Number.isFinite(speed) || speed < 0.5 || speed > 2) {
			return { success: false, message: "speed must be between 0.5 and 2.0" };
		}
		const asset = resolveAsset(assetId);
		if (!asset) return { success: false, message: `Media asset not found: ${assetId}` };

		try {
			const ctx = getProjectAudioContext();
			const arrayBuffer = await asset.file!.arrayBuffer();
			const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

			const channels = decoded.numberOfChannels;
			const srcLength = decoded.length;
			const srcRate = decoded.sampleRate;
			// 变速 = 重采样到新的样本数（保持时长变化）
			const outLength = Math.max(1, Math.round(srcLength / speed));
			const out = ctx.createBuffer(channels, outLength, srcRate);

			for (let c = 0; c < channels; c++) {
				const src = decoded.getChannelData(c);
				const dst = out.getChannelData(c);
				const ratio = srcLength / outLength;
				for (let i = 0; i < outLength; i++) {
					const pos = i * ratio;
					const i0 = Math.floor(pos);
					const i1 = Math.min(srcLength - 1, i0 + 1);
					const frac = pos - i0;
					dst[i] = src[i0] * (1 - frac) + src[i1] * frac;
				}
			}
			void ctx.close().catch(() => {});

			const blob = bufferToWav(out, srcRate);
			const outName = (args.outputName as string) || `${asset.name.replace(/\.[^.]+$/, "")}-${speed}x.wav`;
			const saved = await saveBlobAsAsset(blob, outName);

			return {
				success: true,
				message: `Speed ${speed}x applied to '${asset.name}' (${decoded.duration.toFixed(1)}s → ${(decoded.duration / speed).toFixed(1)}s)${saved ? `, saved as '${outName}'` : ""}`,
				data: {
					fileName: outName,
					speed,
					originalDurationSec: decoded.duration,
					newDurationSec: decoded.duration / speed,
					savedAsAsset: Boolean(saved),
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to change speed: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
};

/**
 * 降噪（简单高通近似 afftdn）
 * 用双二阶高通滤波去除低频环境噪声；不支持实时预览，导出 WAV。
 */
export const denoiseAudioTool: AgentTool = {
	name: "denoise_audio",
	description:
		"Apply light denoising to an audio asset using a browser-native high-pass filter (approximates ffmpeg afftdn for rumble/hum removal). Exports WAV. Best for removing low-frequency background noise (air conditioning, traffic rumble).",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name.",
			},
			cutoffHz: {
				type: "number",
				description: "High-pass cutoff in Hz (default 80; use 120-200 for stronger low-cut).",
			},
			outputName: {
				type: "string",
				description: "Optional output file name.",
			},
		},
		required: ["assetId"],
	},
	requiresConfirmation: true,
	async execute(args) {
		const assetId = args.assetId as string | undefined;
		if (!assetId) return { success: false, message: "assetId is required" };
		const asset = resolveAsset(assetId);
		if (!asset) return { success: false, message: `Media asset not found: ${assetId}` };

		const cutoff = Number(args.cutoffHz) || 80;

		try {
			const ctx = getProjectAudioContext();
			const arrayBuffer = await asset.file!.arrayBuffer();
			const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

			// 离线渲染高通滤波
			const offline = new OfflineAudioContext(
				decoded.numberOfChannels,
				decoded.length,
				decoded.sampleRate,
			);
			const source = offline.createBufferSource();
			source.buffer = decoded;
			const filter = offline.createBiquadFilter();
			filter.type = "highpass";
			filter.frequency.value = cutoff;
			source.connect(filter).connect(offline.destination);
			source.start(0);

			const rendered = await offline.startRendering();
			const blob = bufferToWav(rendered, rendered.sampleRate);
			const outName = (args.outputName as string) || `${asset.name.replace(/\.[^.]+$/, "")}-denoised.wav`;
			const saved = await saveBlobAsAsset(blob, outName);

			return {
				success: true,
				message: `Denoised '${asset.name}' (high-pass ${cutoff}Hz)${saved ? `, saved as '${outName}'` : ""}`,
				data: { fileName: outName, cutoffHz: cutoff, savedAsAsset: Boolean(saved) },
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to denoise: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
};

export const nativeAudioTools: AgentTool[] = [
	extractAudioTool,
	mixAudioTool,
	setAudioVolumeTool,
	fadeAudioTool,
	muteAudioTool,
	speedAudioTool,
	denoiseAudioTool,
];