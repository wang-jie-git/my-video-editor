/**
 * FFmpeg Web Worker
 *
 * 在 Worker 线程中执行 FFmpeg 命令，避免阻塞主线程
 */

import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import type { FFmpegProgressCallback } from './types'

export interface FFmpegWorkerMessage {
  type: 'exec' | 'writeFile' | 'readFile' | 'deleteFile' | 'cleanup' | 'load' | 'version'
  id: string
  payload?: any
}

export interface FFmpegWorkerResponse {
  type: 'result' | 'error' | 'progress' | 'ready'
  id: string
  payload?: any
}

/**
 * FFmpeg Worker 类
 */
export class FFmpegWorker {
  private worker: Worker | null = null
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void
    reject: (error: Error) => void
  }>()

  constructor() {
    this.initializeWorker()
  }

  /**
   * 初始化 Worker
   */
  private initializeWorker(): void {
    this.worker = new Worker(
      new URL('./ffmpeg-worker-internal.ts', import.meta.url),
      { type: 'module' }
    )

    this.worker.onmessage = (event: MessageEvent<FFmpegWorkerResponse>) => {
      const { type, id, payload } = event.data

      if (type === 'progress') {
        // 进度回调直接通知
        return
      }

      // 处理挂起的请求
      const pending = this.pendingRequests.get(id)
      if (!pending) {
        console.warn('[FFmpegWorker] 收到未知请求 ID:', id)
        return
      }

      this.pendingRequests.delete(id)

      if (type === 'error') {
        pending.reject(new Error(payload?.message || 'Unknown error'))
      } else {
        pending.resolve(payload)
      }
    }

    this.worker.onerror = (error) => {
      console.error('[FFmpegWorker] Worker 错误:', error)
    }
  }

  /**
   * 发送消息到 Worker
   */
  private sendMessage(message: FFmpegWorkerMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker 未初始化'))
        return
      }

      this.pendingRequests.set(message.id, { resolve, reject })

      // 设置超时
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(message.id)) {
          this.pendingRequests.delete(message.id)
          reject(new Error(`请求超时: ${message.type}`))
        }
      }, 30000) // 30 秒超时

      this.worker!.postMessage(message)

      // 清除超时
      this.worker!.onmessage = (event: MessageEvent<FFmpegWorkerResponse>) => {
        const { type, id, payload } = event.data

        clearTimeout(timeout)

        if (type === 'progress') {
          return
        }

        const pending = this.pendingRequests.get(id)
        if (pending) {
          this.pendingRequests.delete(id)
          if (type === 'error') {
            pending.reject(new Error(payload?.message || 'Unknown error'))
          } else {
            pending.resolve(payload)
          }
        }
      }
    })
  }

  /**
   * 加载 FFmpeg
   */
  async load(): Promise<void> {
    return this.sendMessage({ type: 'load', id: 'load' })
  }

  /**
   * 执行 FFmpeg 命令
   */
  async exec(
    args: string[],
    onProgress?: FFmpegProgressCallback
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return this.sendMessage({
      type: 'exec',
      id: `exec-${Date.now()}-${Math.random()}`,
      payload: { args },
    })
  }

  /**
   * 写入文件
   */
  async writeFile(name: string, data: Uint8Array): Promise<void> {
    return this.sendMessage({
      type: 'writeFile',
      id: `write-${Date.now()}-${Math.random()}`,
      payload: { name, data: Array.from(data) },
    })
  }

  /**
   * 读取文件
   */
  async readFile(name: string): Promise<Uint8Array> {
    const result = await this.sendMessage({
      type: 'readFile',
      id: `read-${Date.now()}-${Math.random()}`,
      payload: { name },
    })
    return new Uint8Array(result)
  }

  /**
   * 删除文件
   */
  async deleteFile(name: string): Promise<void> {
    return this.sendMessage({
      type: 'deleteFile',
      id: `delete-${Date.now()}-${Math.random()}`,
      payload: { name },
    })
  }

  /**
   * 清理所有文件
   */
  async cleanup(): Promise<void> {
    return this.sendMessage({ type: 'cleanup', id: 'cleanup' })
  }

  /**
   * 获取 FFmpeg 版本
   */
  async version(): Promise<string> {
    return this.sendMessage({ type: 'version', id: 'version' })
  }

  /**
   * 终止 Worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.pendingRequests.clear()
    }
  }
}
