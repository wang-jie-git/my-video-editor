/**
 * FFmpeg Worker 内部实现
 *
 * 在 Worker 线程中运行 FFmpeg
 */

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { FFmpegWorkerMessage, FFmpegWorkerResponse } from './ffmpeg-worker'

let ffmpeg: FFmpeg | null = null
let isLoaded = false

/**
 * 初始化 FFmpeg
 */
async function initFFmpeg(): Promise<void> {
  if (isLoaded) return

  console.log('[FFmpegWorker] 初始化...')

  ffmpeg = new FFmpeg({ useWorker: false })

  // 日志
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message)
  })

  // 进度
  ffmpeg.on('progress', ({ progress, time, fps, size, bitrate }) => {
    self.postMessage({
      type: 'progress',
      id: '',
      payload: { progress, time, fps, size, bitrate },
    } as FFmpegWorkerResponse)
  })

  // 加载核心文件 - 使用已安装的版本
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  // 注册 fetchFile
  ;(ffmpeg as any).fetchFile = fetchFile

  isLoaded = true
  console.log('[FFmpegWorker] 初始化完成 ✅')

  // 通知主线程已就绪
  self.postMessage({ type: 'ready', id: 'load' } as FFmpegWorkerResponse)
}

/**
 * 处理消息
 */
self.onmessage = async (event: MessageEvent<FFmpegWorkerMessage>) => {
  const { type, id, payload } = event.data

  try {
    switch (type) {
      case 'load':
        await initFFmpeg()
        self.postMessage({ type: 'result', id, payload: null } as FFmpegWorkerResponse)
        break

      case 'version':
        if (!ffmpeg) throw new Error('FFmpeg 未初始化')
        // FFmpeg.wasm 没有直接的 version() 方法
        // 我们可以通过执行 -version 命令获取
        self.postMessage({
          type: 'result',
          id,
          payload: 'FFmpeg WASM 0.12.x',
        } as FFmpegWorkerResponse)
        break

      case 'exec':
        if (!ffmpeg) throw new Error('FFmpeg 未初始化')
        const { args } = payload
        console.log('[FFmpegWorker] 执行:', args.join(' '))
        await ffmpeg.exec(args)
        self.postMessage({
          type: 'result',
          id,
          payload: { stdout: '', stderr: '', exitCode: 0 },
        } as FFmpegWorkerResponse)
        break

      case 'writeFile':
        if (!ffmpeg) throw new Error('FFmpeg 未初始化')
        const { name, data } = payload
        await ffmpeg.writeFile(name, new Uint8Array(data))
        self.postMessage({ type: 'result', id, payload: null } as FFmpegWorkerResponse)
        break

      case 'readFile':
        if (!ffmpeg) throw new Error('FFmpeg 未初始化')
        const { name: readName } = payload
        const readData = await ffmpeg.readFile(readName)
        self.postMessage({
          type: 'result',
          id,
          payload: Array.from(readData as Uint8Array),
        } as FFmpegWorkerResponse)
        break

      case 'deleteFile':
        if (!ffmpeg) throw new Error('FFmpeg 未初始化')
        const { name: deleteName } = payload
        try {
          await ffmpeg.deleteFile(deleteName)
          self.postMessage({ type: 'result', id, payload: null } as FFmpegWorkerResponse)
        } catch (error) {
          console.warn(`[FFmpegWorker] 删除文件失败: ${deleteName}`, error)
          self.postMessage({ type: 'result', id, payload: null } as FFmpegWorkerResponse)
        }
        break

      case 'cleanup':
        if (!ffmpeg) throw new Error('FFmpeg 未初始化')
        // 列出并删除所有文件
        const files = await ffmpeg.listDir('.')
        await Promise.all(
          files.map((file) => {
            const path = file.type === 'directory' ? file.name : file.name
            return ffmpeg!.deleteFile(path).catch(console.warn)
          })
        )
        self.postMessage({ type: 'result', id, payload: null } as FFmpegWorkerResponse)
        break

      default:
        throw new Error(`未知消息类型: ${type}`)
    }
  } catch (error) {
    console.error(`[FFmpegWorker] 处理失败:`, error)
    self.postMessage({
      type: 'error',
      id,
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    } as FFmpegWorkerResponse)
  }
}
