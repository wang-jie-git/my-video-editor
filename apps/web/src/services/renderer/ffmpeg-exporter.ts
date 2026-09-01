/**
 * FFmpeg 视频导出器
 *
 * 使用 FFmpeg.wasm 导出视频，替代 Mediabunny
 * 支持 MP4/WebM 格式，多种质量控制
 */

import type { ExportOptions, ExportResult } from '@/types/export';
import type { TimelineTrack } from '@/types/timeline';
import type { TCanvasSize, TBackground } from '@/types/project';
import type { MediaAsset } from '@/types/assets';
import { FFmpegService } from './ffmpeg/ffmpeg-service';
import { buildScene } from '@/services/renderer/scene-builder';
import { CanvasRenderer } from '@/services/renderer/canvas-renderer';
import { createTimelineAudioBuffer } from '@/lib/media/audio';
import { audioBufferToWavBlob } from '@/lib/media/audio-export';

export class FFmpegExporter {
	private ffmpegService: FFmpegService;
	private isCancelled = false;

	constructor(ffmpegService: FFmpegService) {
		this.ffmpegService = ffmpegService;
	}

	/**
	 * 导出项目为视频
	 */
	async export(params: {
		tracks: TimelineTrack[];
		duration: number;
		canvasSize: TCanvasSize;
		mediaAssets: MediaAsset[];
		fitCanvasSize: TCanvasSize;
		background: TBackground;
		options: ExportOptions;
	}): Promise<ExportResult> {
		const { tracks, duration, canvasSize, mediaAssets, fitCanvasSize, background, options } = params;
		const { format, quality, fps, includeAudio, onProgress, onCancel } = options;

		this.isCancelled = false;

		try {
			// 1. 加载 FFmpeg
			if (!this.ffmpegService.isLoaded()) {
				onProgress?.({ progress: 0 });
				await this.ffmpegService.load();
			}

			// 2. 准备音频（如果需要）
			let audioBuffer: AudioBuffer | null = null;
			if (includeAudio) {
				onProgress?.({ progress: 0.05 });
				audioBuffer = await createTimelineAudioBuffer({
					tracks,
					mediaAssets,
					duration,
				});
			}

			// 3. 构建场景树
			onProgress?.({ progress: 0.1 });
			const scene = buildScene({
				tracks,
				mediaAssets,
				duration,
				canvasSize,
				fitCanvasSize,
				background,
			});

			// 4. 渲染帧为图片
			const frameFiles = await this.renderFramesToImages({
				rootNode: scene,
				fps: fps || 30,
				canvasSize,
				onProgress: (progress) => {
					// 帧渲染占 10% - 50%
					const adjustedProgress = 0.1 + progress * 0.4;
					onProgress?.({ progress: adjustedProgress });
				},
				onCancel,
			});

			if (this.isCancelled) {
				return { success: false, cancelled: true };
			}

			// 5. 编码视频
			const codec = this.getCodec(format, options.codec);
			const bitrate = this.getBitrate(quality, options.bitrate);
			const encodeArgs = this.buildEncodeArgs({
				codec,
				quality,
				format,
				crf: options.crf,
				preset: options.preset,
				bitrate: options.bitrate,
				pixelFormat: options.pixelFormat,
			});

			await this.encodeVideo({
				frameFiles,
				fps: fps || 30,
				encodeArgs,
				codec,
				format,
				onProgress: (progress) => {
					// 编码占 50% - 90%
					const adjustedProgress = 0.5 + progress * 0.4;
					onProgress?.({ progress: adjustedProgress });
				},
				onCancel,
			});

			if (this.isCancelled) {
				return { success: false, cancelled: true };
			}

			// 6. 合并音频（如果需要）
			let outputFile = `output.${format}`;
			if (includeAudio && audioBuffer) {
				outputFile = `output-with-audio.${format}`;

				// 将 AudioBuffer 导出为 WAV 文件
				const audioBlob = audioBufferToWavBlob(audioBuffer);
				const audioData = new Uint8Array(await audioBlob.arrayBuffer());
				await this.ffmpegService.writeFile('audio.wav', audioData);

				await this.mergeAudioVideo({
					videoFile: `output.${format}`,
					audioFile: 'audio.wav',
					outputFile,
					format,
				});
			}

			// 7. 读取结果
			onProgress?.({ progress: 0.95 });
			const data = await this.ffmpegService.readFile(outputFile);
			const buffer = new Uint8Array(data).buffer;

			// 8. 清理临时文件
			await this.cleanup(frameFiles, format);

			onProgress?.({ progress: 1.0 });

			return {
				success: true,
				buffer,
			};
		} catch (error) {
			console.error('[FFmpegExporter] 导出失败:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Export failed',
			};
		}
	}

	/**
	 * 渲染帧为图片序列
	 */
	private async renderFramesToImages(params: {
		rootNode: any; // RootNode
		fps: number;
		canvasSize: TCanvasSize;
		onProgress: (progress: number) => void;
		onCancel?: () => boolean;
	}): Promise<string[]> {
		const { rootNode, fps, canvasSize, onProgress, onCancel } = params;
		const frameCount = Math.ceil(rootNode.duration * fps);
		const frameFiles: string[] = [];

		// 创建 CanvasRenderer
		const renderer = new CanvasRenderer({
			width: canvasSize.width,
			height: canvasSize.height,
			fps,
		});

		for (let i = 0; i < frameCount; i++) {
			// 检查取消
			if (this.isCancelled) {
				throw new Error('Cancelled');
			}

			// 检查取消回调
			if (onCancel?.()) {
				this.isCancelled = true;
				throw new Error('Cancelled');
			}

			const time = i / fps;

			// 渲染帧
			await renderer.render({ node: rootNode, time });

			// 转换为 Blob
			const blob = await new Promise<Blob>((resolve) => {
				(renderer.canvas as OffscreenCanvas).convertToBlob({ type: 'image/png' }).then(resolve);
			});

			// 写入 FFmpeg 虚拟文件系统
			const frameName = `frame-${String(i).padStart(6, '0')}.png`;
			const data = await blob.arrayBuffer();
			await this.ffmpegService.writeFile(frameName, new Uint8Array(data));

			frameFiles.push(frameName);

			// 进度回调
			onProgress(i / frameCount);
		}

		return frameFiles;
	}

	/**
	 * 编码视频
	 */
	private async encodeVideo(params: {
		frameFiles: string[];
		fps: number;
		encodeArgs: string[];
		codec: string;
		format: string;
		onProgress: (progress: number) => void;
		onCancel?: () => boolean;
	}): Promise<void> {
		const { frameFiles, fps, encodeArgs, codec, format, onProgress, onCancel } = params;

		// 执行编码
		await this.ffmpegService.exec(encodeArgs, {
			onProgress: ({ progress }) => {
				onProgress(progress)
			},
		});
	}

	/**
	 * 合并音视频
	 */
	private async mergeAudioVideo(params: {
		videoFile: string;
		audioFile: string;
		outputFile: string;
		format: string;
	}): Promise<void> {
		const { videoFile, audioFile, outputFile, format } = params;

		// 根据格式选择音频编码器
		const audioCodec = format === 'webm' ? 'libopus' : 'aac';

		const args = [
			'-i',
			videoFile,
			'-i',
			audioFile,
			'-c:v',
			'copy', // 不重新编码视频
			'-c:a',
			audioCodec,
			'-b:a',
			'128k', // 音频比特率
			'-shortest', // 以较短的流为准
			'-y',
			outputFile,
		];

		await this.ffmpegService.exec(args);
	}

	/**
	 * 获取编码器
	 */
	private getCodec(format: string, codec?: string): string {
		// 如果指定了 codec，直接使用
		if (codec) return codec;

		// 否则根据 format 选择默认编码器
		switch (format) {
			case 'mp4':
				return 'libx264';
			case 'webm':
				return 'libvpx-vp9';
			default:
				return 'libx264';
		}
	}

	/**
	 * 获取比特率
	 */
	private getBitrate(quality: string, customBitrate?: string): string {
		// 如果指定了自定义比特率，直接使用
		if (customBitrate) return customBitrate;

		switch (quality) {
			case 'low':
				return '1M';
			case 'medium':
				return '3M';
			case 'high':
				return '5M';
			case 'very_high':
				return '10M';
			default:
				return '3M';
		}
	}

	/**
	 * 构建编码参数
	 */
	private buildEncodeArgs(params: {
		codec: string;
		quality: string;
		format: string;
		crf?: number;
		preset?: string;
		bitrate?: string;
		pixelFormat?: string;
	}): string[] {
		const { codec, quality, format, crf, preset, bitrate, pixelFormat } = params;

		const args: string[] = [
			'-framerate', '30',
			'-i', 'frame-%06d.png',
		];

		// 视频编码器
		args.push('-c:v', codec);

		// 质量控制
		if (codec === 'libx264' || codec === 'libx265') {
			// H.264/H.265 使用 CRF
			if (crf !== undefined) {
				args.push('-crf', String(crf));
			} else {
				// 根据质量预设 CRF
				const crfMap: Record<string, number> = {
					low: 28,
					medium: 23,
					high: 18,
					very_high: 15,
				};
				args.push('-crf', String(crfMap[quality] || 23));
			}

			// 预设
			if (preset) {
				args.push('-preset', preset);
			}
		} else if (codec === 'libvpx-vp9' || codec === 'libvpx') {
			// VP9 使用 CRF
			if (crf !== undefined) {
				args.push('-crf', String(crf));
				args.push('-b:v', '0'); // 使用 CQ 模式
			} else {
				const crfMap: Record<string, number> = {
					low: 34,
					medium: 30,
					high: 25,
					very_high: 20,
				};
				args.push('-crf', String(crfMap[quality] || 30));
				args.push('-b:v', '0');
			}

			// 预设
			if (preset) {
				args.push('-cpu-used', preset === 'slow' ? '2' : preset === 'fast' ? '4' : '3');
			}
		}

		// 像素格式
		if (pixelFormat) {
			args.push('-pix_fmt', pixelFormat);
		} else {
			args.push('-pix_fmt', 'yuv420p');
		}

		args.push('-y');
		args.push(`output.${format}`);

		return args;
	}

	/**
	 * 清理临时文件
	 */
	private async cleanup(frameFiles: string[], format?: string): Promise<void> {
		const filesToDelete = [
			'output.mp4',
			'output.webm',
			'output-with-audio.mp4',
			'output-with-audio.webm',
			'audio.wav',
			...frameFiles,
		];

		await Promise.all(
			filesToDelete.map((file) =>
				this.ffmpegService.deleteFile(file).catch(() => {})
			)
		);
	}

	/**
	 * 取消导出
	 */
	cancel(): void {
		this.isCancelled = true;
	}
}
