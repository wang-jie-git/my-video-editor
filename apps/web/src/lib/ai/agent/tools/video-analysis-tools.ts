/**
 * 视频理解分析工具（video_probe / video_analyze / video_ask）
 *
 * 移植自 dsh-video-lens（dundunhan/dsh-video-lens v0.3.1），由 Node/ffmpeg CLI
 * 适配为浏览器环境：HTMLVideoElement + canvas 抽帧替代系统 ffmpeg，
 * 视觉调用复用 agent 配置（可指向 agnes-2.5-flash 等 OpenAI 兼容视觉端点）。
 *
 * - video_probe   ：读取项目内视频资产元数据（时长/分辨率/比值/fps）
 * - video_analyze ：场景检测 → 按场景抽帧 → 多帧视觉分析 → 结构化证据 JSON
 *                   （整体总结 / 时间线 / 画面文字 / 动作 / 显著时刻），可选 ASR 语音转写
 * - video_ask     ：时间锚定问答（中文时间解析 + 关键词匹配 → 窗口抽帧 → 视觉问答）
 */

import { EditorCore } from "@/core";
import type { MediaAsset } from "@/types/assets";
import {
	analyzeFramesWithVision,
	stripJsonFences,
	type VisionFrameInput,
} from "@/lib/ai/vision";
import { encodeWav } from "@/lib/ai/wav-encoder";
import { decodeAudioToFloat32 } from "@/lib/media/audio";
import { transcriptionService } from "@/services/transcription/service";

import type { AgentTool } from "./types";

// ---------------------------------------------------------------------------
// 媒体资产解析（浏览器：assetId → File → objectURL）
// ---------------------------------------------------------------------------

function resolveAsset(assetId: string): MediaAsset | undefined {
	const editor = EditorCore.getInstance();
	return editor.media
		.getAssets()
		.find((a) => a.id === assetId || a.name === assetId);
}

async function assetToObjectUrl(asset: MediaAsset): Promise<string> {
	if (asset.url) return asset.url;
	if (asset.file) return URL.createObjectURL(asset.file);
	throw new Error(
		`Media asset '${asset.name}' has no file/blob available`,
	);
}

// ---------------------------------------------------------------------------
// 视频元数据探测（HTMLVideoElement，替代 ffprobe）
// ---------------------------------------------------------------------------

async function loadVideoMeta(url: string): Promise<{
	durationSec: number;
	width: number;
	height: number;
	fps: number | null;
}> {
	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		video.preload = "metadata";
		video.muted = true;
		video.playsInline = true;
		video.src = url;
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error("Timed out loading video metadata"));
		}, 15_000);
		function cleanup() {
			clearTimeout(timeout);
			video.removeAttribute("src");
			video.load();
		}
		video.onloadedmetadata = () => {
			cleanup();
			const fps = video.getVideoPlaybackQuality?.() == null ? null : null; // no direct fps in browser
			resolve({
				durationSec: Number.isFinite(video.duration) ? video.duration : 0,
				width: video.videoWidth || 0,
				height: video.videoHeight || 0,
				fps,
			});
		};
		video.onerror = () => {
			cleanup();
			reject(new Error(`Failed to load video metadata: ${video.error?.message ?? "unknown"}`));
		};
	});
}

// ---------------------------------------------------------------------------
// 帧采样（HTMLVideoElement + canvas，替代 ffmpeg extractFrame）
// ---------------------------------------------------------------------------

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const onSeeked = () => {
			video.removeEventListener("seeked", onSeeked);
			video.removeEventListener("error", onError);
			resolve();
		};
		const onError = () => {
			video.removeEventListener("seeked", onSeeked);
			video.removeEventListener("error", onError);
			reject(new Error("Video seek failed"));
		};
		video.addEventListener("seeked", onSeeked);
		video.addEventListener("error", onError);
		try {
			video.currentTime = Math.min(Math.max(0, timeSec), video.duration || timeSec);
		} catch (err) {
			onError();
		}
	});
}

async function extractFramesAt(
	url: string,
	timestamps: number[],
	maxWidth = 768,
	quality = 0.8,
): Promise<VisionFrameInput[]> {
	const video = document.createElement("video");
	video.muted = true;
	video.playsInline = true;
	video.src = url;
	await new Promise<void>((res, rej) => {
		video.onloadedmetadata = () => res();
		video.onerror = () => rej(new Error("Failed to load video for frame extraction"));
	});

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("Canvas 2D context unavailable");

	const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
	canvas.width = Math.max(1, Math.round((video.videoWidth || maxWidth) * scale));
	canvas.height = Math.max(1, Math.round((video.videoHeight || maxWidth) * scale));

	const frames: VisionFrameInput[] = [];
	for (const ts of timestamps) {
		try {
			await seekVideo(video, ts);
		} catch {
			continue;
		}
		// 让浏览器完成一帧渲染后再绘制
		await new Promise((r) => requestAnimationFrame(r));
		await new Promise((r) => requestAnimationFrame(r));
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		frames.push({
			dataUrl: canvas.toDataURL("image/jpeg", quality),
			timestampSec: Math.round(ts * 100) / 100,
		});
	}
	video.removeAttribute("src");
	video.load();
	return frames;
}

// ---------------------------------------------------------------------------
// 场景检测（canvas 像素差分，替代 ffmpeg scdet）
// ---------------------------------------------------------------------------
// 浏览器无 scdet filter，用均匀采样低清帧做相邻帧平均像素差近似镜头边界。
// 返回边界时间戳数组（可空 → 调用方回退均匀采样）。

const SCENE_THRESHOLD = 18; // 平均 RGB 差阈值（0-255）
const SCENE_SAMPLE_MAX = 40; // 差分采样上限（控制 seek 成本）

async function detectScenes(
	url: string,
	durationSec: number,
	threshold = SCENE_THRESHOLD,
): Promise<number[]> {
	if (!Number.isFinite(durationSec) || durationSec <= 0) return [];

	const step = Math.max(0.5, durationSec / SCENE_SAMPLE_MAX);
	const sampleTimestamps: number[] = [];
	for (let t = 0; t < durationSec; t += step) sampleTimestamps.push(Math.round(t * 100) / 100);
	if (sampleTimestamps.length === 0) return [];

	const video = document.createElement("video");
	video.muted = true;
	video.playsInline = true;
	video.src = url;
	try {
		await new Promise<void>((res, rej) => {
			video.onloadedmetadata = () => res();
			video.onerror = () => rej(new Error("Failed to load video for scene detection"));
		});
	} catch (err) {
		return [];
	}

	const canvas = document.createElement("canvas");
	canvas.width = 96;
	canvas.height = Math.max(1, Math.round((96 * (video.videoHeight || 96)) / (video.videoWidth || 96)));
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return [];

	const boundaries: number[] = [];
	let prev: Uint8ClampedArray | null = null;

	for (const ts of sampleTimestamps) {
		try {
			await seekVideo(video, ts);
		} catch {
			continue;
		}
		await new Promise((r) => requestAnimationFrame(r));
		await new Promise((r) => requestAnimationFrame(r));
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

		if (prev) {
			let sum = 0;
			const n = data.length;
			for (let i = 0; i < n; i += 4) {
				sum += Math.abs(data[i] - prev[i]);
				sum += Math.abs(data[i + 1] - prev[i + 1]);
				sum += Math.abs(data[i + 2] - prev[i + 2]);
			}
			const avgDiff = sum / ((n / 4) * 3);
			if (avgDiff > threshold) boundaries.push(ts);
		}
		prev = new Uint8ClampedArray(data);
	}

	video.removeAttribute("src");
	video.load();
	return boundaries;
}

// ---------------------------------------------------------------------------
// 时间戳规划（移植 frames.js：场景感知 + 均匀回退）
// ---------------------------------------------------------------------------

function planUniformTimestamps(durationSec: number, count: number): number[] {
	if (!Number.isFinite(durationSec) || durationSec <= 0) return [0];
	const n = Math.max(1, Math.floor(count));
	return Array.from({ length: n }, (_, i) => Math.round(((i + 0.5) / n) * durationSec * 100) / 100);
}

function planShotTimestamps(durationSec: number, shots: number[], count: number): number[] {
	const n = Math.max(1, Math.floor(count));
	if (!Number.isFinite(durationSec) || durationSec <= 0) return [0];
	if (!Array.isArray(shots) || shots.length === 0) return planUniformTimestamps(durationSec, n);

	const bounds = shots.filter((t) => t > 0 && t < durationSec).sort((a, b) => a - b);
	const segments: Array<[number, number]> = [];
	let prev = 0;
	for (const b of bounds) {
		if (b > prev) segments.push([prev, b]);
		prev = b;
	}
	if (prev < durationSec) segments.push([prev, durationSec]);
	const m = segments.length;

	if (m >= n) {
		const midpoints = segments.map(([a, b]) => (a + b) / 2);
		const step = midpoints.length / n;
		const picks: number[] = [];
		for (let i = 0; i < n; i++) {
			picks.push(midpoints[Math.min(midpoints.length - 1, Math.floor(i * step))]);
		}
		return picks.map((t) => Math.round(t * 100) / 100);
	}

	const totalLen = segments.reduce((s, [a, b]) => s + (b - a), 0);
	const raw = segments.map(([a, b]) => (n * (b - a)) / totalLen);
	const counts = raw.map((c) => Math.max(1, Math.floor(c)));
	let deficit = n - counts.reduce((s, c) => s + c, 0);
	if (deficit > 0) {
		const order = raw
			.map((_, i) => i)
			.sort((x, y) => raw[y] - Math.floor(raw[y]) - (raw[x] - Math.floor(raw[x])));
		for (let i = 0; deficit > 0; i++, deficit--) counts[order[i % order.length]]++;
	}
	while (deficit < 0) {
		const idx = counts.findIndex((c) => c > 1);
		if (idx === -1) break;
		counts[idx]--;
		deficit++;
	}
	const picks: number[] = [];
	segments.forEach(([a, b], i) => {
		const k = counts[i];
		for (let j = 0; j < k; j++) picks.push(a + ((j + 0.5) / k) * (b - a));
	});
	return picks.map((t) => Math.round(t * 100) / 100);
}

function autoFrameBudget(durationSec: number, cap: number): number {
	if (!Number.isFinite(durationSec) || durationSec <= 0) return Math.min(cap, 4);
	return Math.min(cap, Math.max(4, Math.ceil(durationSec / 30)));
}

function adaptiveFrameWidth(frameCount: number, maxWidth: number): number {
	if (frameCount >= 9) return Math.min(512, maxWidth);
	if (frameCount >= 6) return Math.min(640, maxWidth);
	return maxWidth;
}

// ---------------------------------------------------------------------------
// 提示词构建（移植 vlm.js：buildAnalysisPrompt / buildAskPrompt）
// ---------------------------------------------------------------------------

const TRANSCRIPT_CHAR_BUDGET = 6000;

export interface TranscriptData {
	text: string;
	segments?: Array<{ start: number; end?: number; text: string }>;
}

function buildAnalysisPrompt({
	metadata,
	frames,
	transcript,
	question,
}: {
	metadata: Record<string, unknown>;
	frames: VisionFrameInput[];
	transcript?: TranscriptData | null;
	question?: string;
}): string {
	const timestamps = frames.map((f) => `${f.timestampSec}s`).join(", ");
	const lines = [
		"You are a video understanding engine. Analyze the frames sampled from a video.",
		"",
		`Video metadata: ${JSON.stringify(metadata)}`,
		"",
		`You are given ${frames.length} frame(s) sampled across the timeline (scene-aware), in chronological order.`,
		`Frame timestamps: ${timestamps}.`,
	];

	if (transcript?.text) {
		const segs = Array.isArray(transcript.segments) ? transcript.segments : [];
		const hasSegs = segs.length > 0 && segs.some((s) => s.end != null);
		const excerpt = hasSegs
			? segs.map((s) => `[${s.start.toFixed(1)}s-${s.end?.toFixed(1)}s] ${s.text}`).join("\n")
			: transcript.text;
		lines.push(
			"",
			`Transcript (speech${hasSegs ? ", timestamped" : ""}; use it to answer what is SAID, not just what is shown):`,
			"",
			excerpt.slice(0, TRANSCRIPT_CHAR_BUDGET),
		);
	}

	lines.push(
		"",
		"Respond with STRICT JSON only, no markdown fences, matching exactly this shape:",
		"{",
		'  "overall_summary": "one-paragraph summary of what this video shows and says",',
		'  "timeline": [{"timestamp_sec": <number>, "description": "what is visible in this frame"}],',
		'  "on_screen_text": "any text visible across frames (OCR), empty string if none",',
		'  "visual_style": "brief note on visual style, setting, quality",',
		'  "notable_moments": "anything unusual or noteworthy, empty string if none"',
		"}",
	);

	if (question) lines.push("", `Pay special attention to: ${question}`);

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// ASR（ffmpeg.wasm 抽音频 → OpenAI 兼容 /audio/transcriptions）
// ---------------------------------------------------------------------------

export interface AsrConfig {
	baseUrl: string;
	apiKey: string;
	model: string;
}

const ASR_CONFIG_KEY = "video-lens-asr-config";

export function getAsrConfig(): AsrConfig | null {
	try {
		const raw = localStorage.getItem(ASR_CONFIG_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<AsrConfig>;
		if (!parsed.baseUrl || !parsed.apiKey || !parsed.model) return null;
		return parsed as AsrConfig;
	} catch {
		return null;
	}
}

export function setAsrConfig(config: AsrConfig | null): void {
	if (config) localStorage.setItem(ASR_CONFIG_KEY, JSON.stringify(config));
	else localStorage.removeItem(ASR_CONFIG_KEY);
}

/**
 * 用浏览器原生 AudioContext 从视频文件提取 16kHz 单声道 WAV。
 * 无需 FFmpeg（ffmpeg-loader 在 Next.js/Turbopack 下动态 import 不可用），
 * 浏览器可直接解码视频容器内的音轨。
 */
async function extractWavFromFile(file: File): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	// 尝试主要音频解码路径
	try {
		const audioCtx = new AudioContext({ sampleRate: 16000 });
		try {
			const decoded = await audioCtx.decodeAudioData(arrayBuffer);
			return encodeWav(decoded, 16000);
		} finally {
			void audioCtx.close().catch(() => {});
		}
	} catch (primaryErr) {
		// decodeAudioData 对部分容器需先剥离视频流：退回 <video> + MediaElementSource 实时录音
		// 捕获内部, 若失败则给出明确错误
		throw new Error(
			`ASR audio extraction failed: ${
				primaryErr instanceof Error ? primaryErr.message : String(primaryErr)
			}. The browser could not decode audio from this video container.`,
		);
	}
}

/**
 * 浏览器内置 whisper 转写（零成本，模型在本地跑）。
 * 使用项目自带的 TranscriptionService（@huggingface/transformers whisper pipeline）。
 * 返回与 API 通道一致的 TranscriptData（text + timestamped segments）。
 */
async function transcribeWithWhisper(asset: MediaAsset): Promise<TranscriptData> {
	if (!asset.file) throw new Error("Asset has no File object for ASR extraction");

	// 提取 16kHz Float32Array（与 captions 面板共用逻辑）
	const { samples } = await decodeAudioToFloat32({
		audioBlob: asset.file,
		targetSampleRate: 16000,
	});

	const result = await transcriptionService.transcribe({
		audioData: samples,
		language: "auto",
		subtask: "transcribe",
	});

	const segments = (result.segments ?? []).map((seg) => ({
		start: seg.start,
		end: seg.end,
		text: seg.text,
	}));

	return {
		text: result.text,
		segments: segments.length > 0 ? segments : undefined,
	};
}

async function transcribeApi(
	asset: MediaAsset,
	config: AsrConfig,
): Promise<TranscriptData> {
	if (!asset.file) throw new Error("Asset has no File object for ASR extraction");

	const blob = await extractWavFromFile(asset.file);
	const form = new FormData();
	form.append("file", blob, "audio.wav");
	form.append("model", config.model);

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 120_000);
	try {
		const res = await fetch(
			`${config.baseUrl.replace(/\/+$/, "")}/audio/transcriptions`,
			{
				method: "POST",
				headers: { Authorization: `Bearer ${config.apiKey}` },
				body: form,
				signal: controller.signal,
			},
		);
		if (!res.ok) {
			throw new Error(`ASR HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
		}
		const data = (await res.json()) as TranscriptData;
		return data;
	} finally {
		clearTimeout(timeout);
	}
}

// ---------------------------------------------------------------------------
// video_ask 辅助（移植 ask.js：时间解析 / 术语提取 / 窗口规划）
// ---------------------------------------------------------------------------

function parseTimeQuery(question: string): { start: number; end: number } | null {
	const patterns: Array<{ re: RegExp; to: (m: RegExpMatchArray) => { start: number; end: number } }> = [
		{ re: /(\d+)\s*分\s*(\d+)\s*秒/, to: (m) => ({ start: Number(m[1]) * 60 + Number(m[2]), end: Number(m[1]) * 60 + Number(m[2]) + 10 }) },
		{ re: /(\d+)\s*分钟/, to: (m) => ({ start: Number(m[1]) * 60, end: (Number(m[1]) + 1) * 60 }) },
		{ re: /(\d+)\s*分/, to: (m) => ({ start: Number(m[1]) * 60, end: (Number(m[1]) + 1) * 60 }) },
		{ re: /(\d+):(\d{2})/, to: (m) => ({ start: Number(m[1]) * 60 + Number(m[2]), end: Number(m[1]) * 60 + Number(m[2]) + 10 }) },
		{ re: /(\d+)\s*秒/, to: (m) => ({ start: Math.max(0, Number(m[1]) - 5), end: Number(m[1]) + 5 }) },
		{ re: /(\d+)\s*(?:minutes?|min)\b/, to: (m) => ({ start: Number(m[1]) * 60, end: (Number(m[1]) + 1) * 60 }) },
		{ re: /(\d+)\s*(?:seconds?|sec)\b/, to: (m) => ({ start: Math.max(0, Number(m[1]) - 5), end: Number(m[1]) + 5 }) },
	];
	for (const { re, to } of patterns) {
		const m = question.match(re);
		if (m) return to(m);
	}
	return null;
}

function extractQueryTerms(question: string): string[] {
	const terms = new Set<string>();
	const en = question.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
	for (const w of en) {
		const lower = w.toLowerCase();
		if (!["the","a","an","is","are","was","were","do","does","did","of","in","on","at","to","for","with","and","or","but","what","when","where","who","how","why","this","that","video","about","tell","say","said","says","mention","mentions","mentioned","please","can","you","me","it","its","he","she","they","we","i","my","your"].includes(lower) && lower.length >= 2) {
			terms.add(lower);
		}
	}
	const han = (question.match(/[\u4e00-\u9fff]+/g) ?? []).join("");
	if (han.length >= 3) for (let i = 0; i + 3 <= han.length; i++) terms.add(han.slice(i, i + 3));
	if (han.length >= 2) for (let i = 0; i + 2 <= han.length; i++) terms.add(han.slice(i, i + 2));
	return [...terms];
}

function matchSegments(
	segments: Array<{ start: number; end?: number; text: string }>,
	terms: string[],
): Array<{ segment: { start: number; end?: number; text: string }; score: number }> {
	if (!segments.length || !terms.length) return [];
	const scored: Array<{ segment: { start: number; end?: number; text: string }; score: number }> = [];
	for (const segment of segments) {
		const hits = terms.filter((t) => (segment.text ?? "").includes(t));
		const score = hits.reduce((sum, t) => sum + (t.length - 1), 0);
		if (score > 0) scored.push({ segment, score });
	}
	return scored.sort((a, b) => b.score - a.score);
}

function buildWindows(
	matched: Array<{ segment: { start: number; end?: number; text: string } }>,
	paddingSec = 2,
	durationSec?: number,
): Array<{ start: number; end: number }> {
	const spans = matched
		.map(({ segment }) => ({
			start: Math.max(0, (segment.start ?? 0) - paddingSec),
			end: Math.min(durationSec ?? Infinity, (segment.end ?? segment.start ?? 0) + paddingSec),
		}))
		.sort((a, b) => a.start - b.start);
	const merged: Array<{ start: number; end: number }> = [];
	for (const s of spans) {
		const last = merged[merged.length - 1];
		if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
		else merged.push({ ...s });
	}
	return merged;
}

function askFrameBudget(windowSeconds: number, explicitFrames?: number): number {
	if (typeof explicitFrames === "number" && Number.isFinite(explicitFrames) && explicitFrames > 0) {
		return Math.floor(explicitFrames);
	}
	return Math.min(Math.max(2, Math.ceil(windowSeconds / 3)), 12);
}

function planWindowTimestamps(
	windows: Array<{ start: number; end: number }>,
	totalFrames: number,
): Array<{ start: number; end: number; timestamps: number[] }> {
	const n = Math.max(1, Math.floor(totalFrames));
	if (!windows.length) return [];
	const totalLen = windows.reduce((s, w) => s + (w.end - w.start), 0);
	if (totalLen <= 0) {
		return windows.map((w) => ({
			...w,
			timestamps: [Math.round(w.start * 100) / 100],
		}));
	}
	const raw = windows.map((w) => (n * (w.end - w.start)) / totalLen);
	const counts = raw.map((c) => Math.max(1, Math.floor(c)));
	let deficit = n - counts.reduce((s, c) => s + c, 0);
	if (deficit > 0) {
		const order = raw
			.map((_, i) => i)
			.sort((x, y) => raw[y] - Math.floor(raw[y]) - (raw[x] - Math.floor(raw[x])));
		for (let i = 0; deficit > 0; i++, deficit--) counts[order[i % order.length]]++;
	}
	while (deficit < 0) {
		const idx = counts.findIndex((c) => c > 1);
		if (idx === -1) break;
		counts[idx]--;
		deficit++;
	}
	return windows.map((w, i) => ({
		start: w.start,
		end: w.end,
		timestamps: planUniformTimestamps(w.end - w.start, counts[i]).map(
			(t) => Math.round((w.start + t) * 100) / 100,
		),
	}));
}

function buildAskPrompt({
	metadata,
	frames,
	question,
	matchedSegments = [],
	transcriptAvailable = false,
}: {
	metadata: Record<string, unknown>;
	frames: VisionFrameInput[];
	question: string;
	matchedSegments?: Array<{ segment: { start: number; end?: number; text: string } }>;
	transcriptAvailable?: boolean;
}): string {
	const timestamps = frames.map((f) => `${f.timestampSec}s`).join(", ");
	const lines = [
		"You are a video question-answering engine. Answer the user's question about a video, grounded ONLY in the provided frames and transcript.",
		"",
		`Question: ${question}`,
		"",
		`Video metadata: ${JSON.stringify(metadata)}`,
		"",
		`You are given ${frames.length} frame(s) sampled from relevant time windows, in chronological order.`,
		`Frame timestamps: ${timestamps}.`,
	];

	if (matchedSegments.length > 0) {
		const excerpt = matchedSegments
			.map((m) => `[${(m.segment?.start ?? 0).toFixed(1)}s-${(m.segment?.end ?? 0).toFixed(1)}s] ${m.segment?.text ?? ""}`)
			.join("\n")
			.slice(0, TRANSCRIPT_CHAR_BUDGET);
		lines.push("", "Relevant transcript segments (speech, timestamped):", "", excerpt);
	} else if (!transcriptAvailable) {
		lines.push("", "Note: no speech transcript is available for this video; answer from the frames alone if possible.");
	} else {
		lines.push("", "Note: no transcript segment matched the question; answer from the frames alone, and say so in notes.");
	}

	lines.push(
		"",
		"Respond with STRICT JSON only, no markdown fences, matching exactly this shape:",
		"{",
		'  "answer": "direct, concise answer to the question",',
		'  "supporting_timestamps": [<numbers: times the answer is based on>],',
		'  "confidence": "high|medium|low",',
		'  "notes": "what you based the answer on, and what remains uncertain"',
		"}",
	);
	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 工具定义
// ---------------------------------------------------------------------------

const MAX_FRAMES = 12;
const FRAME_MAX_WIDTH = 768;

export const videoProbeTool: AgentTool = {
	name: "video_probe",
	description:
		"Inspect a video asset in the current project and return its metadata as JSON: duration, resolution, frame count ratio, fps. Use this first when asked anything about a video asset, before deeper analysis.",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name (video asset to inspect).",
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
			const url = await assetToObjectUrl(asset);
			const meta = await loadVideoMeta(url);

			const probe = {
				name: asset.name,
				type: asset.type,
				sizeBytes: asset.file?.size ?? null,
				container: asset.name.split(".").pop()?.toLowerCase() ?? null,
				durationSec: meta.durationSec,
				resolution: meta.width && meta.height ? { width: meta.width, height: meta.height } : null,
				aspectRatio:
					meta.width && meta.height
						? `${(meta.width / meta.height).toFixed(3)}:1`
						: null,
				fps: meta.fps ?? null,
				storedMeta: {
					duration: asset.duration,
					width: asset.width,
					height: asset.height,
					fps: asset.fps,
				},
			};

			return {
				success: true,
				message: `Probed video '${asset.name}'`,
				data: probe,
			};
		} catch (error) {
			return {
				success: false,
				message: error instanceof Error ? error.message : "Failed to probe video",
			};
		}
	},
};

export const videoAnalyzeTool: AgentTool = {
	name: "video_analyze",
	description:
		"Understand the CONTENT of a video asset: detects scene changes, samples representative frames, optionally transcribes speech (ASR), and returns structured evidence JSON (overall summary, per-frame timeline, on-screen text, notable moments). Use after video_probe when the user asks what HAPPENS in a video, what is said, or what text appears.",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name (video asset to analyze).",
			},
			maxFrames: {
				type: "number",
				description: `Frames to sample (1-${MAX_FRAMES}; default: duration-adaptive, denser for short videos). More frames = better temporal coverage but slower and costlier.`,
			},
			question: {
				type: "string",
				description: "Optional focus: what to pay attention to while analyzing.",
			},
			withTranscript: {
				type: "boolean",
				description:
					"Whether to include ASR speech transcript (default false). Uses the project's built-in browser whisper by default (free, local); falls back to set_asr_config API if whisper is unavailable.",
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

		const url = await assetToObjectUrl(asset).catch((e) => {
			throw e;
		});

		// 1. 探测元数据
		const meta = await loadVideoMeta(url);
		const durationSec = meta.durationSec || asset.duration || 0;
		const metadata = {
			name: asset.name,
			durationSec,
			resolution: meta.width && meta.height ? `${meta.width}x${meta.height}` : undefined,
		};

		// 2. 时长自适应帧预算
		const frameCount = Math.min(
			Math.max(1, Math.floor(Number(args.maxFrames) || autoFrameBudget(durationSec, MAX_FRAMES))),
			MAX_FRAMES,
		);
		const frameWidth = adaptiveFrameWidth(frameCount, FRAME_MAX_WIDTH);

		// 3. 场景检测 → 代表帧时间戳
		const shots = await detectScenes(url, durationSec);
		const timestamps = planShotTimestamps(durationSec, shots, frameCount);

		// 4. 抽帧
		const frames = await extractFramesAt(url, timestamps, frameWidth);
		if (frames.length === 0) {
			return { success: false, message: "Failed to extract frames - the video may be unreadable." };
		}

		// 5. 可选 ASR（优先浏览器内置 whisper，失败回退 API 配置 → 优雅降级，视觉路径总能完成）
		let transcript: TranscriptData | null = null;
		let transcriptError: string | null = null;
		if (args.withTranscript) {
			// 优先：项目内置浏览器 whisper（零成本，模型本地跑）
			try {
				transcript = await transcribeWithWhisper(asset);
			} catch (whisperErr) {
				transcriptError = `Browser whisper failed: ${
					whisperErr instanceof Error ? whisperErr.message : String(whisperErr)
				}`;
				// 回退：API 通道（若用户配了 set_asr_config）
				const asrConfig = getAsrConfig();
				if (asrConfig) {
					try {
						transcript = await transcribeApi(asset, asrConfig);
						transcriptError = null;
					} catch (apiErr) {
						transcriptError += `; API fallback failed: ${
							apiErr instanceof Error ? apiErr.message : String(apiErr)
						}`;
					}
				} else {
					transcriptError +=
						". Provide ASR config via set_asr_config or check browser whisper availability.";
				}
			}
		}

		// 6. 多帧视觉分析
		const prompt = buildAnalysisPrompt({
			metadata,
			frames,
			transcript,
			question: args.question as string | undefined,
		});

		const raw = await analyzeFramesWithVision({
			frames,
			analysisPrompt: prompt,
			maxTokens: 1500,
		});

		// 7. 解析结构化结果（宽容 json fences / 原始文本兜底）
		let analysis: unknown;
		let analysisRaw: string | undefined;
		try {
			analysis = JSON.parse(stripJsonFences(raw));
		} catch {
			analysisRaw = raw;
		}

		const evidence = {
			metadata,
			shotCount: shots.length,
			shots: shots.map((t) => Math.round(t * 100) / 100),
			framesSampled: frames.map((f) => f.timestampSec),
			asr: transcript
				? { text: transcript.text, segments: transcript.segments ?? [] }
				: transcriptError
					? { error: transcriptError }
					: null,
			analysis,
			...(analysisRaw ? { analysisRaw } : {}),
		};

		return {
			success: true,
			message: `Analyzed video '${asset.name}' (${frames.length} frames, ${shots.length} shots)`,
			data: evidence,
		};
	},
};

export const videoAskTool: AgentTool = {
	name: "video_ask",
	description:
		"Answer a question about a video asset, anchored to specific times. Parses Chinese/English time references (e.g. '3分20秒', '2:30', 'around 1 min'), matches transcript keywords, samples frames from the relevant windows, and returns a JSON answer with supporting timestamps and confidence. Use for 'what happens at ...', 'what is said about ...', 'where in the video ...'.",
	parameters: {
		type: "object",
		properties: {
			assetId: {
				type: "string",
				description: "Media asset ID or name (video asset to query).",
			},
			question: {
				type: "string",
				description: "Question about the video content (may include a time reference).",
			},
			maxFrames: {
				type: "number",
				description: `Frames to sample overall (1-${MAX_FRAMES}; default: adaptive 2-12 based on matched windows).`,
			},
		},
		required: ["assetId", "question"],
	},
	requiresConfirmation: false,
	async execute(args) {
		const assetId = args.assetId as string | undefined;
		const question = args.question as string | undefined;
		if (!assetId) return { success: false, message: "assetId is required" };
		if (!question?.trim()) return { success: false, message: "question is required" };

		const asset = resolveAsset(assetId);
		if (!asset) return { success: false, message: `Media asset not found: ${assetId}` };

		const url = await assetToObjectUrl(asset);
		const meta = await loadVideoMeta(url);
		const durationSec = meta.durationSec || asset.duration || 0;
		const metadata = {
			name: asset.name,
			durationSec,
			resolution: meta.width && meta.height ? `${meta.width}x${meta.height}` : undefined,
		};

		// 1. 时间解析
		const timeWindow = parseTimeQuery(question);

		// 2. ASR 匹配（优先浏览器内置 whisper，失败回退 API；用于关键词窗口定位）
		let transcript: TranscriptData | null = null;
		let transcriptAvailable = false;
		try {
			transcript = await transcribeWithWhisper(asset);
			transcriptAvailable = Boolean(transcript?.segments?.length);
		} catch {
			const asrConfig = getAsrConfig();
			if (asrConfig) {
				try {
					transcript = await transcribeApi(asset, asrConfig);
					transcriptAvailable = Boolean(transcript?.segments?.length);
				} catch {
					transcript = null;
				}
			} else {
				transcript = null;
			}
		}

		// 3. 窗口构建：显式时间优先；否则用转录关键词匹配；都没有 → 整片均匀采样
		let windows: Array<{ start: number; end: number }> = [];
		let matchedSegments: Array<{ segment: { start: number; end?: number; text: string } }> = [];

		if (timeWindow) {
			windows = [timeWindow];
		} else if (transcriptAvailable) {
			const terms = extractQueryTerms(question);
			matchedSegments = matchSegments(transcript?.segments ?? [], terms);
			if (matchedSegments.length > 0) {
				windows = buildWindows(matchedSegments, 2, durationSec);
			}
		}

		// 4. 帧预算分配
		let plannedWindows: Array<{ start: number; end: number; timestamps: number[] }>;
		if (windows.length > 0) {
			const windowSeconds = windows.reduce((s, w) => s + (w.end - w.start), 0) || durationSec;
			const budget = askFrameBudget(windowSeconds, Number(args.maxFrames));
			plannedWindows = planWindowTimestamps(windows, budget);
		} else {
			const n = askFrameBudget(durationSec, Number(args.maxFrames));
			plannedWindows = [{ start: 0, end: durationSec, timestamps: planUniformTimestamps(durationSec, n) }];
		}

		// 5. 抽帧（合并窗口时间戳）
		const timestamps = plannedWindows
			.flatMap((w) => w.timestamps)
			.filter((t) => t >= 0 && t <= durationSec)
			.slice(0, MAX_FRAMES);

		const frames = await extractFramesAt(url, timestamps, 640, 0.8);

		// 6. 视觉问答
		const prompt = buildAskPrompt({
			metadata,
			frames,
			question,
			matchedSegments,
			transcriptAvailable,
		});

		const raw = await analyzeFramesWithVision({
			frames,
			analysisPrompt: prompt,
			maxTokens: 1200,
		});

		let answer: unknown;
		let answerRaw: string | undefined;
		try {
			answer = JSON.parse(stripJsonFences(raw));
		} catch {
			answerRaw = raw;
		}

		return {
			success: true,
			message: `Answered question about '${asset.name}'`,
			data: {
				question,
				windows: plannedWindows,
				transcriptAvailable,
				framesSampled: frames.map((f) => f.timestampSec),
				answer,
				...(answerRaw ? { answerRaw } : {}),
			},
		};
	},
};

export const setAsrConfigTool: AgentTool = {
	name: "set_asr_config",
	description:
		"Configure an optional ASR (speech-to-text) API endpoint used only as a fallback by video_analyze and video_ask when the built-in browser whisper is unavailable. Accepts any OpenAI-compatible /audio/transcriptions endpoint (SiliconFlow SenseVoiceSmall, OpenAI Whisper, Groq, etc.). The built-in browser whisper (free, local) is used first, so this is usually not needed.",
	parameters: {
		type: "object",
		properties: {
			baseUrl: {
				type: "string",
				description: "API base URL, e.g. https://api.siliconflow.cn/v1",
			},
			apiKey: {
				type: "string",
				description: "API key for the ASR endpoint",
			},
			model: {
				type: "string",
				description: "ASR model, e.g. FunAudioLLM/SenseVoiceSmall or whisper-1",
			},
		},
		required: ["baseUrl", "apiKey", "model"],
	},
	requiresConfirmation: true,
	async execute(args) {
		const baseUrl = args.baseUrl as string | undefined;
		const apiKey = args.apiKey as string | undefined;
		const model = args.model as string | undefined;
		if (!baseUrl || !apiKey || !model) {
			return { success: false, message: "baseUrl, apiKey and model are all required" };
		}
		setAsrConfig({ baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, model });
		return { success: true, message: "ASR config saved (stored locally)" };
	},
};

export const videoAnalysisTools: AgentTool[] = [
	videoProbeTool,
	videoAnalyzeTool,
	videoAskTool,
	setAsrConfigTool,
];