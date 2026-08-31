/**
 * VideoComposerPanel - 视频编辑主面板
 *
 * 整合视频合并、分割、裁剪等功能的统一界面
 */

import { useTranslations } from "next-intl";
import { useState } from "react";
import { VideoMergePanel } from "./video-merge-panel";
import { VideoSplitPanel } from "./video-split-panel";
import { VideoTrimPanel } from "./video-trim-panel";
import type {
  MergeResult,
  SplitResult,
  TrimResult,
} from "../../../services/renderer/video-composer/types";

export type VideoComposerMode = "merge" | "split" | "trim";

export interface VideoComposerPanelProps {
  /** 合并完成回调 */
  onMergeComplete?: (result: MergeResult) => void;
  /** 分割完成回调 */
  onSplitComplete?: (result: SplitResult) => void;
  /** 裁剪完成回调 */
  onTrimComplete?: (result: TrimResult) => void;
  /** 所有操作完成回调 */
  onOperationComplete?: (
    result: MergeResult | SplitResult | TrimResult,
  ) => void;
}

/**
 * VideoComposerPanel 组件
 */
export function VideoComposerPanel({
  onMergeComplete,
  onSplitComplete,
  onTrimComplete,
  onOperationComplete,
}: VideoComposerPanelProps) {
  const t = useTranslations("videoComposer");

  // 当前模式
  const [mode, setMode] = useState<VideoComposerMode>("merge");

  // 处理合并完成
  const handleMergeComplete = (result: {
    success: boolean;
    outputFile?: string;
    error?: string;
  }) => {
    const mergeResult: MergeResult = {
      success: result.success,
      outputFile: result.outputFile,
      error: result.error,
    };
    onMergeComplete?.(mergeResult);
    onOperationComplete?.(mergeResult);
  };

  // 处理分割完成
  const handleSplitComplete = (result: {
    success: boolean;
    outputFiles?: string[];
    error?: string;
  }) => {
    const splitResult: SplitResult = {
      success: result.success,
      outputFiles: result.outputFiles,
      error: result.error,
    };
    onSplitComplete?.(splitResult);
    onOperationComplete?.(splitResult);
  };

  // 处理裁剪完成
  const handleTrimComplete = (result: {
    success: boolean;
    outputFile?: string;
    error?: string;
  }) => {
    const trimResult: TrimResult = {
      success: result.success,
      outputFile: result.outputFile,
      error: result.error,
    };
    onTrimComplete?.(trimResult);
    onOperationComplete?.(trimResult);
  };

  return (
    <div className="video-composer-panel">
      <div className="panel-header">
        <h3>{t("title") || "视频编辑"}</h3>
        <p className="panel-description">
          {t("description") || "合并、分割、裁剪视频"}
        </p>
      </div>

      {/* 模式选择标签 */}
      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === "merge" ? "active" : ""}`}
          onClick={() => setMode("merge")}
        >
          {t("merge") || "合并"}
        </button>
        <button
          className={`mode-tab ${mode === "split" ? "active" : ""}`}
          onClick={() => setMode("split")}
        >
          {t("split") || "分割"}
        </button>
        <button
          className={`mode-tab ${mode === "trim" ? "active" : ""}`}
          onClick={() => setMode("trim")}
        >
          {t("trim") || "裁剪"}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="panel-content">
        {mode === "merge" && (
          <VideoMergePanel onMergeComplete={handleMergeComplete} />
        )}

        {mode === "split" && (
          <VideoSplitPanel onSplitComplete={handleSplitComplete} />
        )}

        {mode === "trim" && (
          <VideoTrimPanel onTrimComplete={handleTrimComplete} />
        )}
      </div>

      <style jsx>{`
        .video-composer-panel {
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

        .mode-tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--surface-elevated);
          border-radius: 8px;
        }

        .mode-tab {
          flex: 1;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-tab:hover {
          color: var(--text-primary);
          background: var(--surface-muted);
        }

        .mode-tab.active {
          background: var(--accent-primary);
          color: white;
        }

        .panel-content {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}
