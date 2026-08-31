/**
 * FFmpeg 服务模块
 *
 * 提供 FFmpeg.wasm 的完整封装，包括：
 * - FFmpegLoader: 懒加载和单例管理
 * - FFmpegService: 核心服务类
 * - FFmpegWorker: Web Worker 支持
 */

export { FFmpegLoader } from './ffmpeg-loader'
export { FFmpegService } from './ffmpeg-service'
export { FFmpegWorker } from './ffmpeg-worker'

// 重新导出类型
export type {
  FFmpegConfig,
  FFmpegExecOptions,
  FFmpegExecResult,
  FFmpegFileInfo,
  FFmpegProgressCallback,
} from './types'
