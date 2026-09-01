/**
 * VideoComposer UI - 视频合并/分割 UI 组件
 *
 * 提供直观的视频编辑操作界面
 */

import type { TransitionType } from "@/services/renderer/video-composer/types";

export type { Transition, TransitionType } from "@/services/renderer/video-composer/types";

// ============ 视频列表 ============

/**
 * 视频列表项（UI 扩展）
 */
export interface VideoListEntry {
  /** 唯一 ID */
  id: string;
  /** 文件名 */
  fileName: string;
  /** 时长（秒） */
  duration: number;
  /** 文件大小（字节） */
  size: number;
  /** 是否有音频 */
  hasAudio: boolean;
  /** 缩略图 URL（可选） */
  thumbnailUrl?: string;
}

// ============ 视频合并 UI ============

/**
 * 视频合并 UI 配置
 */
export interface VideoMergeUIConfig {
  /** 视频列表 */
  videos: VideoListEntry[];
  /** 输出格式 */
  outputFormat: "mp4" | "webm";
  /** 是否包含音频 */
  includeAudio: boolean;
  /** 转场类型 */
  transitionType?: TransitionType;
  /** 转场时长（秒） */
  transitionDuration?: number;
  /** 是否重新编码 */
  reencode: boolean;
}

// ============ 视频分割 UI ============

/**
 * 视频分割 UI 配置
 */
export interface VideoSplitUIConfig {
  /** 输入视频 */
  video: VideoListEntry;
  /** 分割点列表（秒） */
  splitPoints: number[];
  /** 输出格式 */
  outputFormat: "mp4" | "webm";
  /** 输出文件前缀 */
  outputPrefix: string;
}

// ============ 视频裁剪 UI ============

/**
 * 视频裁剪 UI 配置
 */
export interface VideoTrimUIConfig {
  /** 输入视频 */
  video: VideoListEntry;
  /** 开始时间（秒） */
  startTime: number;
  /** 结束时间（秒） */
  endTime: number;
  /** 输出格式 */
  outputFormat: "mp4" | "webm";
  /** 输出文件名 */
  outputFile: string;
  /** 是否重新编码 */
  reencode: boolean;
}

// ============ 进度信息 ============

/**
 * 进度信息
 */
export interface VideoComposerProgressInfo {
  /** 当前阶段 */
  phase:
    | "merging"
    | "splitting"
    | "trimming"
    | "transition"
    | "complete"
    | "error";
  /** 总体进度（0-1） */
  progress: number;
  /** 当前操作的文件 */
  currentFile?: string;
  /** 已完成的操作数 */
  completed: number;
  /** 总操作数 */
  total: number;
  /** 错误信息 */
  error?: string;
}
