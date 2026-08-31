/**
 * FFmpeg.wasm Phase 1 集成测试
 *
 * 验证 FFmpeg.wasm 是否可以正常加载和执行命令
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { FFmpegService } from '../ffmpeg-service'

describe('Phase 1: FFmpeg.wasm 基础设施', () => {
  let ffmpegService: FFmpegService

  beforeAll(async () => {
    ffmpegService = new FFmpegService({
      logLevel: 'debug',
    })
    await ffmpegService.load()
  })

  afterAll(async () => {
    // 清理
    console.log('测试完成')
  })

  describe('FFmpegService', () => {
    it('应该能够加载 FFmpeg', async () => {
      expect(ffmpegService.isLoaded()).toBe(true)
    })

    it('应该能够获取版本信息', async () => {
      const version = await ffmpegService.exec(['-version'])
      expect(version.exitCode).toBe(0)
      expect(version.duration).toBeGreaterThan(0)
    })

    it('应该能够列出支持的格式', async () => {
      const result = await ffmpegService.exec(['-formats'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('mp4')
      expect(result.stdout).toContain('webm')
      expect(result.stdout).toContain('mov')
    })

    it('应该能够列出支持的编解码器', async () => {
      const result = await ffmpegService.exec(['-codecs'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('h264')
    })

    it('应该能够列出可用的滤镜', async () => {
      const result = await ffmpegService.exec(['-filters'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('eq') // 颜色校正
      expect(result.stdout).toContain('blur') // 模糊
      expect(result.stdout).toContain('unsharp') // 锐化
    })
  })

  describe('文件操作', () => {
    it('应该能够写入和读取文件', async () => {
      const fileName = 'test.txt'
      const content = new TextEncoder().encode('Hello FFmpeg!')

      await ffmpegService.writeFile(fileName, content)
      const readContent = await ffmpegService.readFile(fileName)

      expect(new TextDecoder().decode(readContent)).toBe('Hello FFmpeg!')

      // 清理
      await ffmpegService.deleteFile(fileName)
    })

    it('应该能够列出目录文件', async () => {
      const files = await ffmpegService.listDir('.')
      expect(files).toBeInstanceOf(Array)
    })
  })
})
