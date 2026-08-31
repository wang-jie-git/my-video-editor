/**
 * FFmpeg.wasm Phase 1 - 接口验证测试（Node.js 环境）
 *
 * 注意：FFmpeg.wasm 只能在浏览器环境中运行
 * 此测试只验证接口定义和类型检查
 */

import { describe, it, expect } from 'bun:test'
import type { FFmpegConfig, FFmpegExecResult, FFmpegFileInfo } from '../types'
import { FFmpegLoader } from '../ffmpeg-loader'
import { FFmpegService } from '../ffmpeg-service'

describe('Phase 1: FFmpeg.wasm 接口验证', () => {
  describe('类型定义', () => {
    it('FFmpegConfig 类型应该正确', () => {
      const config: FFmpegConfig = {
        useWorker: true,
        logLevel: 'info',
        workerCount: 4,
      }
      expect(config.useWorker).toBe(true)
    })

    it('FFmpegExecResult 类型应该正确', () => {
      const result: FFmpegExecResult = {
        stdout: 'test',
        stderr: '',
        exitCode: 0,
        duration: 1000,
      }
      expect(result.exitCode).toBe(0)
    })

    it('FFmpegFileInfo 类型应该正确', () => {
      const file: FFmpegFileInfo = {
        name: 'test.txt',
        size: 1024,
        isDirectory: false,
      }
      expect(file.name).toBe('test.txt')
    })
  })

  describe('FFmpegLoader', () => {
    it('应该能够创建实例', () => {
      const loader = FFmpegLoader.getInstance()
      expect(loader).toBeDefined()
      expect(loader.isLoaded()).toBe(false)
    })

    it('应该能够配置', () => {
      const loader = FFmpegLoader.getInstance()
      loader.configure({
        logLevel: 'debug',
      })
      expect(loader.getConfig().logLevel).toBe('debug')
    })
  })

  describe('FFmpegService', () => {
    it('应该能够创建实例', () => {
      const service = new FFmpegService()
      expect(service).toBeDefined()
      expect(service.isLoaded()).toBe(false)
    })

    it('应该抛出错误（在 Node.js 环境中加载 FFmpeg）', async () => {
      const service = new FFmpegService()
      await expect(service.load()).rejects.toThrow('does not support nodejs')
    })
  })
})
