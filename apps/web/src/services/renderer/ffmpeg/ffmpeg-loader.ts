/**
 * FFmpeg 加载器（单例）
 *
 * 负责懒加载 FFmpeg.wasm，支持全局共享实例
 */

import type { FFmpegConfig } from './types'

export class FFmpegLoader {
  private static instance: FFmpegLoader | null = null

  private ffmpeg: any = null
  private loadingPromise: Promise<void> | null = null
  private config: Required<FFmpegConfig> = {
    useWorker: true,
    logLevel: 'info',
    workerCount: 4,
  }

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): FFmpegLoader {
    if (!FFmpegLoader.instance) {
      FFmpegLoader.instance = new FFmpegLoader()
    }
    return FFmpegLoader.instance
  }

  /**
   * 配置 FFmpeg 加载器
   */
  configure(config: FFmpegConfig): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 加载 FFmpeg（懒加载）
   */
  async load(): Promise<void> {
    // 如果已加载，直接返回
    if (this.ffmpeg) {
      return
    }

    // 如果正在加载，等待加载完成
    if (this.loadingPromise) {
      return this.loadingPromise
    }

    // 开始加载
    this.loadingPromise = this.loadInternal()

    return this.loadingPromise
  }

  /**
   * 内部加载逻辑
   */
  private async loadInternal(): Promise<void> {
    try {
      console.log('[FFmpeg] 开始加载...')

      // 完全动态导入，避免 Next.js 16 + Turbopack 的静态分析
      const ffmpegModule = await import('@ffmpeg/ffmpeg')
      const utilModule = await import('@ffmpeg/util')

      const { FFmpeg } = ffmpegModule
      const { fetchFile, toBlobURL } = utilModule

      // 创建 FFmpeg 实例
      this.ffmpeg = new FFmpeg()

      // 配置日志
      if (this.config.logLevel !== 'none') {
        this.ffmpeg.on('log', ({ message }: { message: string }) => {
          if (this.config.logLevel === 'debug') {
            console.log('[FFmpeg]', message)
          } else if (this.config.logLevel === 'info' && !message.includes('frame=')) {
            console.log('[FFmpeg]', message)
          }
        })
      }

      // 配置进度回调
      this.ffmpeg.on('progress', ({ progress, time, fps, size, bitrate }: {
        progress: number
        time?: number
        fps?: number
        size?: number
        bitrate?: number
      }) => {
        console.log('[FFmpeg] Progress:', {
          progress: `${(progress * 100).toFixed(2)}%`,
          time: `${time?.toFixed(2)}s`,
          fps,
          size: `${((size ?? 0) / 1024 / 1024).toFixed(2)}MB`,
          bitrate: `${bitrate?.toFixed(0)}kbps`,
        })
      })

      // 加载核心文件 - 使用已安装的版本
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'

      console.log('[FFmpeg] 加载核心文件...')

      // 添加加载超时（60秒）
      const loadPromise = this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('FFmpeg 加载超时（60秒）')), 60000)
      })

      await Promise.race([loadPromise, timeoutPromise])

      // 注册辅助函数
      this.ffmpeg.fetchFile = fetchFile

      console.log('[FFmpeg] 加载完成 ✅')
    } catch (error) {
      console.error('[FFmpeg] 加载失败 ❌', error)
      console.error('[FFmpeg] 错误类型:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('[FFmpeg] 错误消息:', error instanceof Error ? error.message : String(error))
      this.loadingPromise = null
      throw error
    }
  }

  /**
   * 获取 FFmpeg 实例
   */
  getFFmpeg(): any {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg 尚未加载。请先调用 load() 方法。')
    }
    return this.ffmpeg
  }

  /**
   * 检查 FFmpeg 是否已加载
   */
  isLoaded(): boolean {
    return this.ffmpeg !== null
  }

  /**
   * 获取配置
   */
  getConfig(): Required<FFmpegConfig> {
    return { ...this.config }
  }

  /**
   * 卸载 FFmpeg
   */
  async unload(): Promise<void> {
    if (this.ffmpeg) {
      // FFmpeg 没有直接的卸载方法，我们直接清空引用
      // 浏览器会在适当的时候回收内存
      console.log('[FFmpeg] 卸载实例')
      this.ffmpeg = null
      this.loadingPromise = null
    }
  }
}
