/**
 * FFmpeg 服务类型定义
 */

/**
 * FFmpeg 配置选项
 */
export interface FFmpegConfig {
  /** 是否启用 Worker 模式（默认 true） */
  useWorker?: boolean
  /** 日志级别 */
  logLevel?: 'none' | 'error' | 'warning' | 'info' | 'debug'
  /** Worker 数量（仅 Worker 模式） */
  workerCount?: number
}

/**
 * FFmpeg 执行选项
 */
export interface FFmpegExecOptions {
  /** 命令参数 */
  args: string[]
  /** 超时时间（毫秒，默认 5 分钟） */
  timeout?: number
}

/**
 * FFmpeg 执行结果
 */
export interface FFmpegExecResult {
  /** 标准输出 */
  stdout: string
  /** 标准错误 */
  stderr: string
  /** 退出码 */
  exitCode: number
  /** 执行耗时（毫秒） */
  duration: number
}

/**
 * FFmpeg 进度回调
 */
export type FFmpegProgressCallback = (progress: {
  /** 进度百分比（0-1） */
  progress: number
  /** 当前时间（秒） */
  time?: number
  /** FPS */
  fps?: number
  /** 大小（字节） */
  size?: number
  /** 比特率 */
  bitrate?: number
}) => void

/**
 * FFmpeg 文件信息
 */
export interface FFmpegFileInfo {
  /** 文件名 */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 是否为目录 */
  isDirectory: boolean
}
