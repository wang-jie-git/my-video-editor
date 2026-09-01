/**
 * FFmpeg 服务类
 *
 * 封装 FFmpeg.wasm 的核心操作，提供易用的 API
 */

import type { FFmpegConfig, FFmpegFileInfo, FFmpegExecResult, FFmpegProgressCallback } from './types'
import { FFmpegLoader } from './ffmpeg-loader'

export class FFmpegService {
  private loader: FFmpegLoader
  private config: Required<FFmpegConfig>

  constructor(config?: FFmpegConfig) {
    this.loader = FFmpegLoader.getInstance()

    this.config = {
      useWorker: true,
      logLevel: 'info',
      workerCount: 4,
      ...config,
    }

    this.loader.configure(this.config)
  }

  /**
   * 加载 FFmpeg
   */
  async load(): Promise<void> {
    return this.loader.load()
  }

  /**
   * 检查 FFmpeg 是否已加载
   */
  isLoaded(): boolean {
    return this.loader.isLoaded()
  }

  /**
   * 执行 FFmpeg 命令
   */
  async exec(
    args: string[],
    options?: {
      timeout?: number
      onProgress?: FFmpegProgressCallback
    }
  ): Promise<FFmpegExecResult> {
    const ffmpeg = this.loader.getFFmpeg()
    const startTime = Date.now()

    console.log('[FFmpegService] 执行命令:', args.join(' '))

    // 设置进度监听器
    if (options?.onProgress) {
      ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        options.onProgress!({
          progress,
          time: Date.now() - startTime,
        })
      })
    }

    // 执行命令
    await ffmpeg.exec(args)

    const duration = Date.now() - startTime

    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration,
    }
  }

  /**
   * 写入文件到 FFmpeg 虚拟文件系统
   */
  async writeFile(name: string, data: Uint8Array): Promise<void> {
    const ffmpeg = this.loader.getFFmpeg()
    console.log('[FFmpegService] 写入文件:', name, `(${data.length} bytes)`)
    await ffmpeg.writeFile(name, data)
  }

  /**
   * 从 FFmpeg 虚拟文件系统读取文件
   */
  async readFile(name: string): Promise<Uint8Array> {
    const ffmpeg = this.loader.getFFmpeg()
    console.log('[FFmpegService] 读取文件:', name)
    const data = await ffmpeg.readFile(name)
    return data as Uint8Array
  }

  /**
   * 删除 FFmpeg 虚拟文件系统中的文件
   */
  async deleteFile(name: string): Promise<void> {
    const ffmpeg = this.loader.getFFmpeg()
    console.log('[FFmpegService] 删除文件:', name)
    try {
      await ffmpeg.deleteFile(name)
    } catch (error) {
      console.warn('[FFmpegService] 删除文件失败:', name, error)
    }
  }

  /**
   * 列出虚拟文件系统中的文件
   */
  async listDir(path: string = '.'): Promise<FFmpegFileInfo[]> {
    const ffmpeg = this.loader.getFFmpeg()
    const files = await ffmpeg.listDir(path)
    return files.map((file: { name: string; isDir: boolean }) => ({
      name: file.name,
      size: 0,
      isDirectory: file.isDir,
    }))
  }

  /**
   * 创建目录
   */
  async createDir(path: string): Promise<void> {
    const ffmpeg = this.loader.getFFmpeg()
    await ffmpeg.createDir(path)
  }

  /**
   * 检查文件是否存在
   */
  async exists(name: string): Promise<boolean> {
    try {
      const ffmpeg = this.loader.getFFmpeg()
      await ffmpeg.listDir('.')
      // FFmpeg.wasm 目前没有直接的 exists API，所以我们尝试列出文件
      const files = await this.listDir('.')
      return files.some((f) => f.name === name)
    } catch {
      return false
    }
  }

  /**
   * 获取文件大小
   */
  async getFileSize(name: string): Promise<number> {
    const ffmpeg = this.loader.getFFmpeg()
    const data = await ffmpeg.readFile(name)
    return (data as Uint8Array).length
  }

  /**
   * 清空虚拟文件系统
   */
  async cleanup(): Promise<void> {
    try {
      const ffmpeg = this.loader.getFFmpeg()
      const files = await ffmpeg.listDir('.')
      await Promise.all(
        files.map((file: { name: string; isDir: boolean }) => {
          if (file.isDir) {
            return this.cleanupDir(file.name)
          }
          return this.deleteFile(file.name)
        })
      )
      console.log('[FFmpegService] 清理完成')
    } catch (error) {
      console.warn('[FFmpegService] 清理失败:', error)
    }
  }

  /**
   * 递归清理目录
   */
  private async cleanupDir(dir: string): Promise<void> {
    const ffmpeg = this.loader.getFFmpeg()
    try {
      const files = await ffmpeg.listDir(dir)
      await Promise.all(
        files.map((file: { name: string; isDir: boolean }) => {
          const path = `${dir}/${file.name}`
          if (file.isDir) {
            return this.cleanupDir(path)
          }
          return this.deleteFile(path)
        })
      )
    } catch (error) {
      console.warn('[FFmpegService] 清理目录失败:', dir, error)
    }
  }
}
