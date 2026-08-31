/**
 * VideoSplitPanel - 视频分割面板
 *
 * 提供视频分割的 UI 界面
 */

import { useTranslations } from "next-intl";
import { useState, useCallback } from "react";
import type { VideoListEntry } from "./types";

export interface VideoSplitPanelProps {
  /** 分割完成回调 */
  onSplitComplete?: (result: {
    success: boolean;
    outputFiles?: string[];
    error?: string;
  }) => void;
  /** 视频列表（可选，从外部传入） */
  videos?: VideoListEntry[];
  /** 选择视频回调 */
  onSelectVideo?: (video: VideoListEntry) => void;
}

/**
 * VideoSplitPanel 组件
 */
export function VideoSplitPanel({
  onSplitComplete,
  videos: externalVideos,
  onSelectVideo,
}: VideoSplitPanelProps) {
  const t = useTranslations("videoComposer");

  // 状态
  const [videos] = useState<VideoListEntry[]>(externalVideos || []);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [splitPoints, setSplitPoints] = useState<string>("");
  const [outputPrefix, setOutputPrefix] = useState("segment");
  const [outputFormat, setOutputFormat] = useState<"mp4" | "webm">("mp4");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({
    phase: "idle",
    value: 0,
    current: 0,
    total: 0,
  });

  // 选中的视频
  const selectedVideo = videos.find((v) => v.id === selectedVideoId);

  // 处理视频选择
  const handleVideoSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const videoId = e.target.value;
      setSelectedVideoId(videoId || null);
      const video = videos.find((v) => v.id === videoId);
      if (video) {
        onSelectVideo?.(video);
        // 自动设置输出前缀
        const baseName = video.fileName.replace(/\.[^/.]+$/, "");
        setOutputPrefix(baseName);
      }
    },
    [videos, onSelectVideo],
  );

  // 解析分割点
  const parseSplitPoints = (): number[] => {
    if (!splitPoints.trim()) return [];

    return splitPoints
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);
  };

  // 添加分割点
  const handleAddSplitPoint = useCallback(
    (point: number) => {
      const points = parseSplitPoints();
      if (point > 0 && !points.includes(point)) {
        points.push(point);
        points.sort((a, b) => a - b);
        setSplitPoints(points.join(", "));
      }
    },
    [splitPoints],
  );

  // 移除分割点
  const handleRemoveSplitPoint = useCallback(
    (point: number) => {
      const points = parseSplitPoints().filter((p) => p !== point);
      setSplitPoints(points.join(", "));
    },
    [splitPoints],
  );

  // 快速添加分割点（每隔 N 秒）
  const handleQuickSplit = useCallback(
    (interval: number) => {
      if (!selectedVideo) return;

      const points: number[] = [];
      for (let t = interval; t < selectedVideo.duration; t += interval) {
        points.push(t);
      }
      setSplitPoints(points.join(", "));
    },
    [selectedVideo],
  );

  // 处理分割
  const handleSplit = useCallback(async () => {
    if (!selectedVideo) return;

    const points = parseSplitPoints();
    if (points.length === 0) {
      return;
    }

    setIsProcessing(true);
    setProgress({
      phase: "preparing",
      value: 0,
      current: 0,
      total: points.length + 1,
    });

    try {
      // TODO: 调用 VideoComposer.splitVideo()
      // 模拟进度
      for (let i = 0; i <= points.length; i++) {
        setProgress({
          phase: "splitting",
          value: (i + 1) / (points.length + 1),
          current: i,
          total: points.length + 1,
        });
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setProgress({
        phase: "complete",
        value: 1,
        current: points.length + 1,
        total: points.length + 1,
      });

      // 模拟输出文件
      const outputFiles = points.map(
        (_, index) => `${outputPrefix}_${index + 1}.${outputFormat}`,
      );
      outputFiles.push(`${outputPrefix}_${points.length + 1}.${outputFormat}`);

      onSplitComplete?.({
        success: true,
        outputFiles,
      });
    } catch (error) {
      setProgress({ phase: "error", value: 0, current: 0, total: 0 });
      onSplitComplete?.({
        success: false,
        error: error instanceof Error ? error.message : "分割失败",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedVideo, outputPrefix, outputFormat, onSplitComplete]);

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="video-split-panel">
      <div className="panel-header">
        <h3>{t("splitTitle") || "视频分割"}</h3>
        <p className="panel-description">
          {t("splitDescription") || "将视频分割为多个片段"}
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

        {/* 分割点输入 */}
        {selectedVideo && (
          <>
            <div className="form-group">
              <label htmlFor="split-points">
                {t("splitPoints") || "分割点（秒）"}
              </label>
              <input
                id="split-points"
                type="text"
                value={splitPoints}
                onChange={(e) => setSplitPoints(e.target.value)}
                placeholder="10, 30, 60"
                className="text-input"
                disabled={isProcessing}
              />
              <p className="help-text">
                {t("splitPointsHelp") || "多个分割点用逗号分隔"}
              </p>
            </div>

            {/* 快速分割 */}
            <div className="form-group">
              <label>{t("quickSplit") || "快速分割"}</label>
              <div className="quick-split-buttons">
                <button
                  onClick={() => handleQuickSplit(10)}
                  disabled={isProcessing}
                  className="btn-quick"
                >
                  {t("every") || "每隔"} 10s
                </button>
                <button
                  onClick={() => handleQuickSplit(30)}
                  disabled={isProcessing}
                  className="btn-quick"
                >
                  {t("every") || "每隔"} 30s
                </button>
                <button
                  onClick={() => handleQuickSplit(60)}
                  disabled={isProcessing}
                  className="btn-quick"
                >
                  {t("every") || "每隔"} 60s
                </button>
              </div>
            </div>

            {/* 分割点列表 */}
            {parseSplitPoints().length > 0 && (
              <div className="form-group">
                <label>{t("splitPointsList") || "分割点列表"}</label>
                <div className="split-points-list">
                  {parseSplitPoints().map((point, index) => (
                    <div key={index} className="split-point-item">
                      <span className="split-point-index">{index + 1}</span>
                      <span className="split-point-time">
                        {formatTime(point)}
                      </span>
                      <button
                        onClick={() => handleRemoveSplitPoint(point)}
                        className="btn-remove"
                        disabled={isProcessing}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 输出设置 */}
            <div className="form-group">
              <label htmlFor="output-prefix">
                {t("outputPrefix") || "输出文件前缀"}
              </label>
              <input
                id="output-prefix"
                type="text"
                value={outputPrefix}
                onChange={(e) => setOutputPrefix(e.target.value)}
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
                ? `${t("complete") || "完成"} (${progress.total} ${t("segments") || "个片段"})`
                : progress.phase === "error"
                  ? t("error") || "错误"
                  : `${t("processing") || "处理中..."} ${progress.current}/${progress.total}`}
            </span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="action-buttons">
          <button
            onClick={handleSplit}
            disabled={
              !selectedVideo || parseSplitPoints().length === 0 || isProcessing
            }
            className="btn-primary"
          >
            {isProcessing
              ? t("splitting") || "分割中..."
              : t("split") || "分割视频"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .video-split-panel {
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

        .help-text {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .quick-split-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-quick {
          flex: 1;
          padding: 6px 12px;
          background: var(--surface-elevated);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 12px;
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

        .split-points-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 200px;
          overflow-y: auto;
        }

        .split-point-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: var(--surface-elevated);
          border-radius: 6px;
        }

        .split-point-index {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: var(--accent-primary);
          color: white;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 600;
        }

        .split-point-time {
          flex: 1;
          font-size: 14px;
          color: var(--text-primary);
        }

        .btn-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: var(--danger);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }

        .btn-remove:hover:not(:disabled) {
          opacity: 0.8;
        }

        .btn-remove:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
