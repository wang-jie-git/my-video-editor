export const EXPORT_QUALITY_VALUES = [
	"low",
	"medium",
	"high",
	"very_high",
] as const;

export const EXPORT_FORMAT_VALUES = ["mp4", "webm"] as const;

export const VIDEO_CODEC_VALUES = {
	mp4: ["libx264", "libx265"],
	webm: ["libvpx-vp9", "libvpx"],
} as const;

export type ExportFormat = (typeof EXPORT_FORMAT_VALUES)[number];
export type ExportQuality = (typeof EXPORT_QUALITY_VALUES)[number];
export type VideoCodec = (typeof VIDEO_CODEC_VALUES)[keyof typeof VIDEO_CODEC_VALUES][number];

export interface VideoEncodingOptions {
	/** 视频编码器 */
	codec?: VideoCodec;
	/** 恒定质量因子（0-51，越小质量越高，推荐 23-28） */
	crf?: number;
	/** 编码预设（速度 vs 压缩率的权衡） */
	preset?: "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow" | "slower" | "veryslow";
	/** 目标比特率（如果指定，将忽略 CRF） */
	bitrate?: string;
	/** 像素格式 */
	pixelFormat?: "yuv420p" | "yuv422p" | "yuv444p";
}

export interface ExportOptions extends VideoEncodingOptions {
	format: ExportFormat;
	quality: ExportQuality;
	fps?: number;
	includeAudio?: boolean;
	audioBitrate?: string;
	onProgress?: ({ progress }: { progress: number }) => void;
	onCancel?: () => boolean;
}

export interface ExportResult {
	success: boolean;
	buffer?: ArrayBuffer;
	error?: string;
	cancelled?: boolean;
}
