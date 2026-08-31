/**
 * VideoMergePanel - 视频合并面板
 *
 * 提供视频合并的 UI 界面
 */

import { useTranslations } from "next-intl";
import { useState, useCallback } from "react";
import { TransitionSelector } from "./transition-selector";
import type { VideoListEntry } from "./types";

export interface VideoMergePanelProps {
  /** 合并完成回调 */
  onMergeComplete?: (result: {
    success: boolean;
    outputFile?: string;
    error?: string;
  }) => void;
  /** 视频列表（可选，从外部传入） */
  videos?: VideoListEntry[];
  /** 添加视频回调 */
  onAddVideo?: (video: VideoListEntry) => void;
  /** 移除视频回调 */
  onRemoveVideo?: (videoId: string) => void;
}

/**
 * VideoMergePanel 组件
 */
export function VideoMergePanel({
  onMergeComplete,
  videos: externalVideos,
  onAddVideo,
  onRemoveVideo,
}: VideoMergePanelProps) {
  const t = useTranslations("videoComposer");

  // 状态
  const [videos, setVideos] = useState<VideoListEntry[]>(externalVideos || []);
  const [outputFormat, setOutputFormat] = useState<"mp4" | "webm">("mp4");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [useTransitions, setUseTransitions] = useState(false);
  const [transitionType, setTransitionType] = useState<
    "fade" | "slide" | "wipe" | "dissolve"
  >("fade");
  const [transitionDuration, setTransitionDuration] = useState(1.0);
  const [reencode, setReencode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ phase: "idle", value: 0 });

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 创建视频项
      const video: VideoListEntry = {
        id: `video-${Date.now()}`,
        fileName: file.name,
        duration: 0, // TODO: 获取真实时长
        size: file.size,
        hasAudio: true,
      };

      const newVideos = [...videos, video];
      setVideos(newVideos);
      onAddVideo?.(video);
    },
    [videos, onAddVideo],
  );

  // 移除视频
  const handleRemoveVideo = useCallback(
    (videoId: string) => {
      const newVideos = videos.filter((v) => v.id !== videoId);
      setVideos(newVideos);
      onRemoveVideo?.(videoId);
    },
    [videos, onRemoveVideo],
  );

  // 移动视频
  const handleMoveVideo = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newVideos = [...videos];
      const [removed] = newVideos.splice(fromIndex, 1);
      newVideos.splice(toIndex, 0, removed);
      setVideos(newVideos);
    },
    [videos],
  );

  // 处理合并
  const handleMerge = useCallback(async () => {
    if (videos.length < 2) {
      return;
    }

    setIsProcessing(true);
    setProgress({ phase: "preparing", value: 0 });

    try {
      // TODO: 调用 VideoComposer.mergeVideos()
      // 模拟进度
      setProgress({ phase: "merging", value: 0.3 });
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress({ phase: "merging", value: 0.6 });
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress({ phase: "complete", value: 1 });

      // 通知完成
      onMergeComplete?.({
        success: true,
        outputFile: `merged.${outputFormat}`,
      });
    } catch (error) {
      setProgress({
        phase: "error",
        value: 0,
      });
      onMergeComplete?.({
        success: false,
        error: error instanceof Error ? error.message : "合并失败",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [videos, outputFormat, onMergeComplete]);

  // 重置
  const handleReset = useCallback(() => {
    setVideos([]);
    setProgress({ phase: "idle", value: 0 });
  }, []);

  return (
    <div className="video-merge-panel">
      <div className="panel-header">
        <h3>{t("mergeTitle") || "视频合并"}</h3>
        <p className="panel-description">
          {t("mergeDescription") || "将多个视频合并为一个"}
        </p>
      </div>

      <div className="panel-content">
        {/* 视频列表 */}
        <div className="form-group">
          <label>
            {t("videoList") || "视频列表"} ({videos.length})
          </label>
          <div className="video-list">
            {videos.length === 0 ? (
              <div className="empty-list">{t("noVideos") || "暂无视频"}</div>
            ) : (
              videos.map((video, index) => (
                <div key={video.id} className="video-item">
                  <span className="video-index">{index + 1}</span>
                  <span className="video-name">{video.fileName}</span>
                  <span className="video-duration">
                    {Math.floor(video.duration / 60)}:
                    {String(Math.floor(video.duration % 60)).padStart(2, "0")}
                  </span>
                  <button
                    onClick={() => handleRemoveVideo(video.id)}
                    className="btn-remove"
                    disabled={isProcessing}
                    aria-label={t("removeVideo") || "移除视频"}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="file-input"
            disabled={isProcessing}
          />
        </div>

        {/* 转场选项 */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useTransitions}
              onChange={(e) => setUseTransitions(e.target.checked)}
              disabled={isProcessing}
            />
            <span>{t("useTransitions") || "添加转场效果"}</span>
          </label>

          {useTransitions && (
            <div className="transition-options">
              <TransitionSelector
                value={transitionType}
                duration={transitionDuration}
                onChange={({ type, duration }) => {
                  setTransitionType(type);
                  setTransitionDuration(duration);
                }}
              />
            </div>
          )}
        </div>

        {/* 输出格式 */}
        <div className="form-group">
          <label htmlFor="output-format">
            {t("outputFormat") || "输出格式"}
          </label>
          <select
            id="output-format"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as "mp4" | "webm")}
            className="select-input"
            disabled={isProcessing}
          >
            <option value="mp4">MP4 (H.264)</option>
            <option value="webm">WebM (VP9)</option>
          </select>
        </div>

        {/* 音频选项 */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
              disabled={isProcessing}
            />
            <span>{t("includeAudio") || "包含音频"}</span>
          </label>
        </div>

        {/* 重新编码选项 */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={reencode}
              onChange={(e) => setReencode(e.target.checked)}
              disabled={isProcessing}
            />
            <span>{t("reencode") || "重新编码（支持转场效果）"}</span>
          </label>
          <p className="help-text">
            {t("reencodeHelp") || "重新编码会降低速度但支持转场效果"}
          </p>
        </div>

        {/* 进度显示 */}
        {progress.phase !== "idle" && (
          <div className="form-group">
            <label>{t("progress") || "进度"}</label>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.value * 100}%` }}
              />
            </div>
            <span className="progress-text">
              {progress.phase === "complete"
                ? t("complete") || "完成"
                : progress.phase === "error"
                  ? t("error") || "错误"
                  : t("processing") || "处理中..."}
            </span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="action-buttons">
          <button
            onClick={handleMerge}
            disabled={videos.length < 2 || isProcessing}
            className="btn-primary"
          >
            {isProcessing
              ? t("merging") || "合并中..."
              : t("merge") || "合并视频"}
          </button>

          <button
            onClick={handleReset}
            disabled={isProcessing || videos.length === 0}
            className="btn-secondary"
          >
            {t("reset") || "重置"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .video-merge-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          background: var(--surface-primary);
          border-radius: 12px;
        }

        .panel-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .panel-description {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .panel-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .video-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
          padding: 8px;
          background: var(--surface-elevated);
          border: 1px solid var(--border-default);
          border-radius: 8px;
        }

        .empty-list {
          padding: 24px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .video-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: var(--surface-primary);
          border-radius: 6px;
        }

        .video-index {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: var(--accent-primary);
          color: white;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
        }

        .video-name {
          flex: 1;
          font-size: 14px;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .video-duration {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .btn-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: var(--danger);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 18px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .btn-remove:hover:not(:disabled) {
          opacity: 0.8;
        }

        .btn-remove:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .file-input {
          padding: 8px 12px;
          background: var(--surface-elevated);
          border: 1px dashed var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          cursor: pointer;
        }

        .transition-options {
          margin-top: 8px;
        }

        .select-input {
          padding: 8px 12px;
          background: var(--surface-elevated);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .help-text {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .progress-bar {
          height: 8px;
          background: var(--surface-elevated);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent-primary);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          color: var(--text-secondary);
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: var(--accent-primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--accent-primary-hover);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--surface-elevated);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--surface-muted);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
