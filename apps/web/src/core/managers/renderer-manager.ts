import type { EditorCore } from "@/core";
import type { RootNode } from "@/services/renderer/nodes/root-node";
import type { ExportOptions, ExportResult } from "@/types/export";
import { SceneExporter } from "@/services/renderer/scene-exporter";
import { FFmpegService } from "@/services/renderer/ffmpeg/ffmpeg-service";
import { FFmpegExporter } from "@/services/renderer/ffmpeg-exporter";
import { buildScene } from "@/services/renderer/scene-builder";
import { createTimelineAudioBuffer } from "@/lib/media/audio";
import { getSelectedVideoClip } from "@/lib/export";
import type { TimelineTrack } from "@/types/timeline";

export class RendererManager {
	private renderTree: RootNode | null = null;
	private listeners = new Set<() => void>();
	private sceneExporter: SceneExporter | null = null;
	private ffmpegService: FFmpegService | null = null;
	private ffmpegExporter: FFmpegExporter | null = null;
	private useFFmpeg = false;

	constructor(private editor: EditorCore) {}

	/**
	 * 切换到 FFmpeg 导出引擎
	 * @param enabled 是否启用 FFmpeg
	 * @param wasmPath FFmpeg.wasm 文件路径（相对 public/）- 暂未支持
	 */
	async enableFFmpegExport(enabled: boolean, _wasmPath?: string): Promise<void> {
		this.useFFmpeg = enabled;

		if (enabled) {
			// 初始化 FFmpeg 服务
			if (!this.ffmpegService) {
				this.ffmpegService = new FFmpegService();
			}

			// 预加载 FFmpeg（可选）
			if (this.ffmpegService) {
				try {
					await this.ffmpegService.load();
				} catch (error) {
					console.error('[RendererManager] FFmpeg 预加载失败:', error);
					// 不抛出错误，延迟到导出时再加载
				}
			}

			// 初始化 FFmpegExporter
			if (this.ffmpegService && !this.ffmpegExporter) {
				this.ffmpegExporter = new FFmpegExporter(this.ffmpegService);
			}
		} else {
			// 切换回 SceneExporter
			this.ffmpegService = null;
			this.ffmpegExporter = null;
		}
	}

	/**
	 * 是否使用 FFmpeg 导出
	 */
	isUsingFFmpeg(): boolean {
		return this.useFFmpeg;
	}

	/**
	 * 获取 SceneExporter 实例
	 */
	getSceneExporter(): SceneExporter {
		if (!this.sceneExporter) {
			// SceneExporter 需要完整的导出参数，这里不能直接创建空实例
			// 如果需要使用 SceneExporter，应该在 exportTracks 中创建
			throw new Error('SceneExporter should be created in exportTracks with proper parameters');
		}
		return this.sceneExporter;
	}

	setRenderTree({ renderTree }: { renderTree: RootNode | null }): void {
		this.renderTree = renderTree;
		this.notify();
	}

	getRenderTree(): RootNode | null {
		return this.renderTree;
	}

	async exportProject({
		options,
	}: {
		options: ExportOptions;
	}): Promise<ExportResult> {
		return this.exportTracks({
			tracks: this.editor.timeline.getTracks(),
			duration: this.editor.timeline.getTotalDuration(),
			emptyError: "Project is empty",
			options,
		});
	}

	async exportSelectedClip({
		selection,
		options,
	}: {
		selection: { trackId: string; elementId: string };
		options: ExportOptions;
	}): Promise<ExportResult> {
		const clip = getSelectedVideoClip({
			tracks: this.editor.timeline.getTracks(),
			selection,
		});
		if (!clip) {
			return { success: false, error: "Selected element is not a video" };
		}

		return this.exportTracks({
			tracks: clip.tracks,
			duration: clip.duration,
			emptyError: "Selected clip is empty",
			options,
		});
	}

	private async exportTracks({
		tracks,
		duration,
		emptyError,
		options,
	}: {
		tracks: TimelineTrack[];
		duration: number;
		emptyError: string;
		options: ExportOptions;
	}): Promise<ExportResult> {
		const { format, quality, fps, includeAudio, onProgress, onCancel } =
			options;

		try {
			const mediaAssets = this.editor.media.getAssets();
			const activeProject = this.editor.project.getActive();

			if (!activeProject) {
				return { success: false, error: "No active project" };
			}

			if (duration === 0) {
				return { success: false, error: emptyError };
			}

			// 如果启用 FFmpeg，使用 FFmpegExporter
			if (this.useFFmpeg && this.ffmpegExporter) {
				const canvasSize = activeProject.settings.canvasSize;

				return this.ffmpegExporter.export({
					tracks,
					duration,
					canvasSize,
					options,
				});
			}

			// 否则使用传统的 SceneExporter
			const exportFps = fps || activeProject.settings.fps;
			const canvasSize = activeProject.settings.canvasSize;

			let audioBuffer: AudioBuffer | null = null;
			if (includeAudio) {
				onProgress?.({ progress: 0.05 });
				audioBuffer = await createTimelineAudioBuffer({
					tracks,
					mediaAssets,
					duration,
				});
			}

			const scene = buildScene({
				tracks,
				mediaAssets,
				duration,
				canvasSize,
				fitCanvasSize:
					activeProject.settings.originalCanvasSize ?? canvasSize,
				background: activeProject.settings.background,
			});

			const exporter = new SceneExporter({
				width: canvasSize.width,
				height: canvasSize.height,
				fps: exportFps,
				format,
				quality,
				shouldIncludeAudio: !!includeAudio,
				audioBuffer: audioBuffer || undefined,
			});

			exporter.on("progress", (progress) => {
				const adjustedProgress = includeAudio
					? 0.05 + progress * 0.95
					: progress;
				onProgress?.({ progress: adjustedProgress });
			});

			let cancelled = false;
			const checkCancel = () => {
				if (onCancel?.()) {
					cancelled = true;
					exporter.cancel();
				}
			};

			const cancelInterval = setInterval(checkCancel, 100);

			try {
				const buffer = await exporter.export({ rootNode: scene });
				clearInterval(cancelInterval);

				if (cancelled) {
					return { success: false, cancelled: true };
				}

				if (!buffer) {
					return { success: false, error: "Export failed to produce buffer" };
				}

				return {
					success: true,
					buffer,
				};
			} finally {
				clearInterval(cancelInterval);
			}
		} catch (error) {
			console.error("Export failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown export error",
			};
		}
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => fn());
	}
}
