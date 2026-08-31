/**
 * VideoTrimPanel - 视频裁剪面板
 *
 * 提供视频裁剪的 UI 界面
 */

import { useTranslations } from "next-intl";
import { useState, useCallback, useEffect } from "react";
import type { VideoListEntry } from "./types";

export interface VideoTrimPanelProps {
  /** 裁剪完成回调 */
  onTrimComplete?: (result: {
    success: boolean;
    outputFile?: string;
    error?: string;
  }) => void;
  /** 视频列表（可选，从外部传入） */
  videos?: VideoListEntry[];
  /** 选择视频回调 */
  onSelectVideo?: (video: VideoListEntry) => void;
}

/**
 * VideoTrimPanel 组件
 */
export function VideoTrimPanel({
  onTrimComplete,
  videos: externalVideos,
  onSelectVideo,
}: VideoTrimPanelProps) {
  const t = useTranslations("videoComposer");

  // 状态
  const [videos] = useState<VideoListEntry[]>(externalVideos || []);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [outputFile, setOutputFile] = useState("");
  const [outputFormat, setOutputFormat] = useState<"mp4" | "webm">("mp4");
  const [reencode, setReencode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ phase: "idle", value: 0 });

  // 选中的视频
  const selectedVideo = videos.find((v) => v.id === selectedVideoId);

  // 当选择视频时更新输出文件名
  useEffect(() => {
    if (selectedVideo) {
      const baseName = selectedVideo.fileName.replace(/\.[^/.]+$/, "");
      setOutputFile(`${baseName}_trimmed.${outputFormat}`);
      setEndTime(selectedVideo.duration);
    }
  }, [selectedVideo, outputFormat]);

  // 处理视频选择
  const handleVideoSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const videoId = e.target.value;
      setSelectedVideoId(videoId || null);
      const video = videos.find((v) => v.id === videoId);
      if (video) {
        onSelectVideo?.(video);
      }
    },
    [videos, onSelectVideo],
  );

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // 处理开始时间变化
  const handleStartTimeChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setStartTime(num);
    }
  };

  // 处理结束时间变化
  const handleEndTimeChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setEndTime(num);
    }
  };

  // 快速裁剪预设
  const handleQuickTrim = useCallback(
    (preset: "start" | "end" | "middle") => {
      if (!selectedVideo) return;

      const duration = selectedVideo.duration;
      switch (preset) {
        case "start":
          // 裁剪前 10%
          setStartTime(0);
          setEndTime(duration * 0.1);
          break;
        case "end":
          // 裁剪后 10%
          setStartTime(duration * 0.9);
          setEndTime(duration);
          break;
        case "middle":
          // 裁剪中间 50%
          setStartTime(duration * 0.25);
          setEndTime(duration * 0.75);
          break;
      }
    },
    [selectedVideo],
  );

  // 处理裁剪
  const handleTrim = useCallback(async () => {
    if (!selectedVideo) return;

    if (endTime <= startTime) {
      return;
    }

    if (endTime - startTime < 0.1) {
      return;
    }

    setIsProcessing(true);
    setProgress({ phase: "preparing", value: 0 });

    try {
      // TODO: 调用 VideoComposer.trimVideo()
      // 模拟进度
      setProgress({ phase: "trimming", value: 0.3 });
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress({ phase: "trimming", value: 0.6 });
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress({ phase: "complete", value: 1 });

      onTrimComplete?.({
        success: true,
        outputFile,
      });
    } catch (error) {
      setProgress({ phase: "error", value: 0 });
      onTrimComplete?.({
        success: false,
        error: error instanceof Error ? error.message : "裁剪失败",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedVideo, startTime, endTime, outputFile, onTrimComplete]);

  // 预览裁剪时长
  const trimDuration =
    selectedVideo && endTime > startTime ? endTime - startTime : 0;

  return (
    <div className="video-trim-panel">
      <div className="panel-header">
        <h3>{t("trimTitle") || "视频裁剪"}</h3>
        <p className="panel-description">
          {t("trimDescription") || "裁剪视频的开始或结束部分"}
        </p>
      </div>

      <div className="panel-content">
        {/* 视频选择 */}
        <div className="form-group">
          <label htmlFor="video-select">{t("selectVideo") || "选择视频"}</label>
          <select
            id="video-select"
            value={selectedVideoId || ""}
            onChange={handleVideoSelect}
            className="select-input"
            disabled={isProcessing}
          >
            <option value="">
              {t("selectVideoPlaceholder") || "请选择视频..."}
            </option>
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.fileName} ({formatTime(video.duration)})
              </option>
            ))}
          </select>
        </div>

        {/* 时间范围选择 */}
        {selectedVideo && (
          <>
            <div className="form-group">
              <label>{t("trimRange") || "裁剪范围"}</label>
              <div className="time-range">
                <div className="time-input-group">
                  <label htmlFor="start-time">
                    {t("startTime") || "开始时间"}
                  </label>
                  <div className="time-input-wrapper">
                    <input
                      id="start-time"
                      type="number"
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      min="0"
                      max={selectedVideo.duration}
                      step="0.1"
                      className="time-input"
                      disabled={isProcessing}
                    />
                    <span className="time-unit">秒</span>
                  </div>
                </div>

                <div className="time-separator">→</div>

                <div className="time-input-group">
                  <label htmlFor="end-time">{t("endTime") || "结束时间"}</label>
                  <div className="time-input-wrapper">
                    <input
                      id="end-time"
                      type="number"
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      min="0.1"
                      max={selectedVideo.duration}
                      step="0.1"
                      className="time-input"
                      disabled={isProcessing}
                    />
                    <span className="time-unit">秒</span>
                  </div>
                </div>
              </div>
              <div className="time-preview">
                {t("videoDuration") || "视频总时长"}:{" "}
                {formatTime(selectedVideo.duration)} |
                {t("trimmedDuration") || "裁剪时长"}: {formatTime(trimDuration)}
              </div>
            </div>

            {/* 快速裁剪预设 */}
            <div className="form-group">
              <label>{t("quickTrim") || "快速裁剪"}</label>
              <div className="quick-trim-buttons">
                <button
                  onClick={() => handleQuickTrim("start")}
                  disabled={isProcessing}
                  className="btn-quick"
                >
                  {t("trimStart") || "裁剪开头"}
                </button>
                <button
                  onClick={() => handleQuickTrim("end")}
                  disabled={isProcessing}
                  className="btn-quick"
                >
                  {t("trimEnd") || "裁剪结尾"}
                </button>
                <button
                  onClick={() => handleQuickTrim("middle")}
                  disabled={isProcessing}
                  className="btn-quick"
                >
                  {t("trimMiddle") || "裁剪中间"}
                </button>
              </div>
            </div>

            {/* 输出设置 */}
            <div className="form-group">
              <label htmlFor="output-file">
                {t("outputFile") || "输出文件名"}
              </label>
              <input
                id="output-file"
                type="text"
                value={outputFile}
                onChange={(e) => setOutputFile(e.target.value)}
                className="text-input"
                disabled={isProcessing}
              />
            </div>

            <div className="form-group">
              <label htmlFor="output-format">
                {t("outputFormat") || "输出格式"}
              </label>
              <select
                id="output-format"
                value={outputFormat}
                onChange={(e) =>
                  setOutputFormat(e.target.value as "mp4" | "webm")
                }
                className="select-input"
                disabled={isProcessing}
              >
                <option value="mp4">MP4 (H.264)</option>
                <option value="webm">WebM (VP9)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={reencode}
                  onChange={(e) => setReencode(e.target.checked)}
                  disabled={isProcessing}
                />
                <span>{t("reencode") || "重新编码（更精确但更慢）"}</span>
              </label>
            </div>
          </>
        )}

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
            onClick={handleTrim}
            disabled={!selectedVideo || endTime <= startTime || isProcessing}
            className="btn-primary"
          >
            {isProcessing
              ? t("trimming") || "裁剪中..."
              : t("trim") || "裁剪视频"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .video-trim-panel {
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

        .select-input,
        .text-input {
          padding: 8px 12px;
          background: var(--surface-elevated);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .time-range {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .time-input-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .time-input-group label {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .time-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .time-input {
          flex: 1;
          padding: 8px 12px;
          background: var(--surface-elevated);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .time-unit {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .time-separator {
          font-size: 20px;
          color: var(--text-secondary);
          padding-top: 20px;
        }

        .time-preview {
          font-size: 12px;
          color: var(--text-secondary);
          padding: 8px 12px;
          background: var(--surface-elevated);
          border-radius: 6px;
        }

        .quick-trim-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-quick {
          flex: 1;
          padding: 8px 12px;
          background: var(--surface-elevated);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-quick:hover:not(:disabled) {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }

        .btn-quick:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        .btn-primary {
          flex: 1;
          padding: 10px 16px;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--accent-primary-hover);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
