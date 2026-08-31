/**
 * VideoComposer - 视频合并/分割 类型定义
 *
 * 提供类型安全的接口定义
 */

import type { FFmpegProgressCallback } from '../ffmpeg/types'

// ============ 转场效果 ============

/**
 * 转场类型
 */
export type TransitionType = 'fade' | 'slide' | 'wipe' | 'dissolve'

/**
 * 转场配置
 */
export interface Transition {
  /** 转场类型 */
  type: TransitionType
  /** 转场时长（秒） */
  duration: number
  /** 转场偏移（秒），相对于前一个视频的结束时间 */
  offset?: number
}

/**
 * 转场预设
 */
export const TRANSITION_PRESETS: Record<string, Transition> = {
  fade: { type: 'fade', duration: 1.0 },
  slowFade: { type: 'fade', duration: 2.0 },
  quickFade: { type: 'fade', duration: 0.5 },
  slide: { type: 'slide', duration: 1.0 },
  wipe: { type: 'wipe', duration: 1.0 },
  dissolve: { type: 'dissolve', duration: 1.5 },
  quickDissolve: { type: 'dissolve', duration: 0.5 },
}

// ============ 视频合并 ============

/**
 * 视频合并选项
 */
export interface MergeOptions {
  /** 输出文件名 */
  outputFile: string
  /** 是否包含音频 */
  includeAudio?: boolean
  /** 是否重新编码（默认使用流复制） */
  reencode?: boolean
  /** 输出格式（从文件扩展名推断） */
  format?: 'mp4' | 'webm'
}

/**
 * 视频合并结果
 */
export interface MergeResult {
  /** 是否成功 */
  success: boolean
  /** 输出文件名 */
  outputFile?: string
  /** 文件大小（字节） */
  size?: number
  /** 视频时长（秒） */
  duration?: number
  /** 合并的视频数量 */
  videoCount?: number
  /** 错误信息 */
  error?: string
}

// ============ 转场合并 ============

/**
 * 转场合并选项
 */
export interface TransitionMergeOptions extends MergeOptions {
  /** 转场配置列表 */
  transitions: Transition[]
}

// ============ 视频分割 ============

/**
 * 视频分割选项
 */
export interface SplitOptions {
  /** 输出文件前缀 */
  outputPrefix: string
  /** 分割点（秒） */
  splitPoints: number[]
  /** 是否包含音频 */
  includeAudio?: boolean
  /** 输出格式 */
  format?: 'mp4' | 'webm'
}

/**
 * 视频分割结果
 */
export interface SplitResult {
  /** 是否成功 */
  success: boolean
  /** 输出文件列表 */
  outputFiles?: string[]
  /** 分割片段数量 */
  segmentCount?: number
  /** 错误信息 */
  error?: string
}

// ============ 视频裁剪 ============

/**
 * 视频裁剪选项
 */
export interface TrimOptions {
  /** 输出文件名 */
  outputFile: string
  /** 开始时间（秒） */
  startTime: number
  /** 结束时间（秒） */
  endTime: number
  /** 是否重新编码（默认使用流复制） */
  reencode?: boolean
  /** 输出格式 */
  format?: 'mp4' | 'webm'
}

/**
 * 视频裁剪结果
 */
export interface TrimResult {
  /** 是否成功 */
  success: boolean
  /** 输出文件名 */
  outputFile?: string
  /** 文件大小（字节） */
  size?: number
  /** 裁剪后的时长（秒） */
  duration?: number
  /** 错误信息 */
  error?: string
}

// ============ 视频信息 ============

/**
 * 视频信息
 */
export interface VideoInfo {
  /** 文件名 */
  fileName: string
  /** 时长（秒） */
  duration: number
  /** 宽度（像素） */
  width: number
  /** 高度（像素） */
  height: number
  /** 帧率 */
  fps: number
  /** 文件大小（字节） */
  size: number
  /** 是否有音频 */
  hasAudio: boolean
  /** 视频编码器 */
  videoCodec?: string
  /** 音频编码器 */
  audioCodec?: string
}

// ============ UI 类型 ============

/**
 * 视频列表项（用于 UI）
 */
export interface VideoListItem {
  /** 唯一 ID */
  id: string
  /** 文件名 */
  fileName: string
  /** 时长（秒） */
  duration: number
  /** 文件大小（字节） */
  size: number
  /** 是否有音频 */
  hasAudio: boolean
  /** 缩略图 URL（可选） */
  thumbnailUrl?: string
}

/**
 * 视频合并 UI 配置
 */
export interface VideoMergeUIConfig {
  /** 视频列表 */
  videos: VideoListItem[]
  /** 输出格式 */
  outputFormat: 'mp4' | 'webm'
  /** 是否包含音频 */
  includeAudio: boolean
  /** 转场类型 */
  transitionType?: TransitionType
  /** 转场时长（秒） */
  transitionDuration?: number
  /** 是否重新编码 */
  reencode: boolean
}

/**
 * 视频分割 UI 配置
 */
export interface VideoSplitUIConfig {
  /** 输入视频 */
  video: VideoListItem
  /** 分割点列表（秒） */
  splitPoints: number[]
  /** 输出格式 */
  outputFormat: 'mp4' | 'webm'
  /** 输出文件前缀 */
  outputPrefix: string
}

/**
 * 视频裁剪 UI 配置
 */
export interface VideoTrimUIConfig {
  /** 输入视频 */
  video: VideoListItem
  /** 开始时间（秒） */
  startTime: number
  /** 结束时间（秒） */
  endTime: number
  /** 输出格式 */
  outputFormat: 'mp4' | 'webm'
  /** 输出文件名 */
  outputFile: string
  /** 是否重新编码 */
  reencode: boolean
}

// ============ 辅助类型 ============

/**
 * 时间片段
 */
export interface TimeSegment {
  /** 开始时间（秒） */
  start: number
  /** 结束时间（秒） */
  end: number
  /** 片段索引 */
  index: number
}

/**
 * 进度信息
 */
export interface VideoComposerProgress {
  /** 当前阶段 */
  phase: 'merging' | 'splitting' | 'trimming' | 'transition' | 'complete' | 'error'
  /** 总体进度（0-1） */
  progress: number
  /** 当前操作的文件 */
  currentFile?: string
  /** 已完成的操作数 */
  completed: number
  /** 总操作数 */
  total: number
  /** 错误信息 */
  error?: string
}
