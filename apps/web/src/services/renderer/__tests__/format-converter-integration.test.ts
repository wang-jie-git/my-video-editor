/**
 * FormatConverter 集成测试
 *
 * 测试完整的格式转换流程
 * 注意：这些测试需要真实的视频文件，在 CI 环境中可能需要跳过
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { FormatConverter } from '../format-converter'
import { FFmpegService } from '../ffmpeg/ffmpeg-service'

describe('FormatConverter 集成测试', () => {
  let converter: FormatConverter
  let ffmpegService: FFmpegService

  beforeEach(() => {
    ffmpegService = new FFmpegService()
    converter = new FormatConverter(ffmpegService)

    // 注意：实际集成测试需要加载 FFmpeg
    // 这里我们只测试 FormatConverter 的逻辑，不执行真正的 FFmpeg 命令
    console.log('[集成测试] 跳过 FFmpeg 加载（需要真实视频文件）')
  })

  afterEach(async () => {
    // 清理资源
  })

  describe('格式检测集成', () => {
    it('应该正确检测常见格式', () => {
      const testCases = [
        { file: 'movie.mp4', expectedFormat: 'mp4', expectedVideo: true, expectedSupported: true },
        { file: 'clip.mov', expectedFormat: 'mov', expectedVideo: true, expectedSupported: true },
        { file: 'video.avi', expectedFormat: 'avi', expectedVideo: true, expectedSupported: true },
        { file: 'film.mkv', expectedFormat: 'mkv', expectedVideo: true, expectedSupported: true },
        { file: 'stream.webm', expectedFormat: 'webm', expectedVideo: true, expectedSupported: true },
        { file: 'flash.flv', expectedFormat: 'flv', expectedVideo: true, expectedSupported: true },
        { file: 'windows.wmv', expectedFormat: 'wmv', expectedVideo: true, expectedSupported: true },
        { file: 'apple.m4v', expectedFormat: 'm4v', expectedVideo: true, expectedSupported: true },
        { file: 'document.txt', expectedFormat: 'txt', expectedVideo: false, expectedSupported: false },
        { file: 'image.jpg', expectedFormat: 'jpg', expectedVideo: false, expectedSupported: false },
      ]

      for (const testCase of testCases) {
        const result = converter.detectFormat(testCase.file)

        expect(result.format as string).toBe(testCase.expectedFormat)
        expect(result.isVideo).toBe(testCase.expectedVideo)
        expect(result.supported).toBe(testCase.expectedSupported)

        console.log(`✓ ${testCase.file}: ${result.format} (视频: ${result.isVideo}, 支持: ${result.supported})`)
      }
    })

    it('应该正确处理大小写混合的扩展名', () => {
      const testCases = [
        'video.MP4',
        'video.Mov',
        'video.AVI',
        'video.MKV',
        'video.Mp4',
      ]

      for (const fileName of testCases) {
        const result = converter.detectFormat(fileName)
        const expectedExt = fileName.split('.').pop()!.toLowerCase()

        expect(result.format as string).toBe(expectedExt)
        expect(result.isVideo).toBe(true)
        expect(result.supported).toBe(true)
      }
    })
  })

  describe('转换参数验证', () => {
    it('应该为 MOV → MP4 生成正确的参数', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'movie.mov',
        outputFile: 'movie.mp4',
        format: 'mp4',
        options: { format: 'mp4' },
      })

      console.log('[MOV → MP4] 参数:', args)

      // 验证必需参数
      expect(args).toContain('-i')
      expect(args).toContain('movie.mov')
      expect(args).toContain('movie.mp4')

      // 验证视频编码器
      expect(args).toContain('-c:v')
      expect(args).toContain('libx264')

      // 验证音频编码器
      expect(args).toContain('-c:a')
      expect(args).toContain('aac')

      // 验证质量参数
      expect(args).toContain('-crf')
      expect(args).toContain('23') // 默认 medium 质量

      // 验证像素格式
      expect(args).toContain('-pix_fmt')
      expect(args).toContain('yuv420p')

      // 验证覆盖标志
      expect(args).toContain('-y')
    })

    it('应该为 AVI → MP4 (H.265) 生成正确的参数', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'video.avi',
        outputFile: 'video.mp4',
        format: 'mp4',
        options: {
          format: 'mp4',
          codec: 'libx265',
          quality: 'high',
          crf: 20,
        },
      })

      console.log('[AVI → MP4 H.265] 参数:', args)

      expect(args).toContain('-c:v')
      expect(args).toContain('libx265')
      expect(args).toContain('-crf')
      expect(args).toContain('20') // 自定义 CRF
      expect(args).toContain('-c:a')
      expect(args).toContain('aac')
    })

    it('应该为 MKV → WebM (VP9) 生成正确的参数', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'movie.mkv',
        outputFile: 'movie.webm',
        format: 'webm',
        options: {
          format: 'webm',
          quality: 'very_high',
        },
      })

      console.log('[MKV → WebM VP9] 参数:', args)

      expect(args).toContain('-i')
      expect(args).toContain('movie.mkv')
      expect(args).toContain('movie.webm')
      expect(args).toContain('-c:v')
      expect(args).toContain('libvpx-vp9')
      expect(args).toContain('-crf')
      expect(args).toContain('20') // very_high 质量
      expect(args).toContain('-b:v')
      expect(args).toContain('0') // CQ 模式
      expect(args).toContain('-c:a')
      expect(args).toContain('libopus')
    })

    it('应该支持移除音频', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'video.mov',
        outputFile: 'video.mp4',
        format: 'mp4',
        options: {
          format: 'mp4',
          includeAudio: false,
        },
      })

      console.log('[MOV → MP4 (无音频)] 参数:', args)

      expect(args).toContain('-an')
      expect(args).not.toContain('-c:a')
    })

    it('应该支持自定义编码预设', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'video.mov',
        outputFile: 'video.mp4',
        format: 'mp4',
        options: {
          format: 'mp4',
          preset: 'slow',
        },
      })

      console.log('[MOV → MP4 (slow)] 参数:', args)

      expect(args).toContain('-preset')
      expect(args).toContain('slow')
    })
  })

  describe('批量转换逻辑验证', () => {
    it('应该正确处理包含不同格式的文件列表', () => {
      const files = ['movie.mov', 'clip.avi', 'film.mkv', 'video.mp4', 'stream.webm']

      // 验证所有文件都能被检测
      const detections = files.map((file) => converter.detectFormat(file))

      expect(detections[0].format).toBe('mov')
      expect(detections[1].format).toBe('avi')
      expect(detections[2].format).toBe('mkv')
      expect(detections[3].format).toBe('mp4')
      expect(detections[4].format).toBe('webm')

      expect(detections.every((d) => d.isVideo)).toBe(true)
      expect(detections.every((d) => d.supported)).toBe(true)

      console.log('[批量转换] 所有格式检测通过:', files)
    })

    it('应该生成正确的转换参数矩阵', () => {
      const conversionMatrix = [
        { input: 'movie.mov', outputFormat: 'mp4', expectedCodec: 'libx264' },
        { input: 'clip.avi', outputFormat: 'webm', expectedCodec: 'libvpx-vp9' },
        { input: 'film.mkv', outputFormat: 'mp4', expectedCodec: 'libx264' },
      ]

      for (const conversion of conversionMatrix) {
        const outputFile = (converter as any).changeFileExtension(conversion.input, conversion.outputFormat)

        const args = (converter as any).buildConvertArgs({
          inputFile: conversion.input,
          outputFile,
          format: conversion.outputFormat,
          options: { format: conversion.outputFormat },
        })

        expect(args).toContain('-c:v')
        expect(args).toContain(conversion.expectedCodec)

        console.log(`✓ ${conversion.input} → ${conversion.outputFormat}: ${conversion.expectedCodec}`)
      }
    })
  })

  describe('格式支持验证', () => {
    it('应该返回正确的格式列表', () => {
      const formats = converter.getSupportedFormats()

      expect(formats).toContain('mp4')
      expect(formats).toContain('webm')
      expect(formats).toContain('mov')
      expect(formats).toContain('avi')
      expect(formats).toContain('mkv')
      expect(formats).toContain('flv')
      expect(formats).toContain('wmv')
      expect(formats).toContain('m4v')
      expect(formats.length).toBe(8)

      console.log('[支持格式]', formats)
    })

    it('应该返回正确的转换支持矩阵', () => {
      const support = converter.getConversionSupport()

      // MP4 → MP4
      expect(support.mp4).toContain('mp4')

      // WebM → WebM
      expect(support.webm).toContain('webm')

      // MOV → MP4, WebM
      expect(support.mov).toContain('mp4')
      expect(support.mov).toContain('webm')

      // AVI → MP4, WebM
      expect(support.avi).toContain('mp4')
      expect(support.avi).toContain('webm')

      // MKV → MP4, WebM
      expect(support.mkv).toContain('mp4')
      expect(support.mkv).toContain('webm')

      // WMV → MP4 only
      expect(support.wmv).toContain('mp4')
      expect(support.wmv).not.toContain('webm')

      console.log('[转换支持矩阵]', support)
    })
  })

  describe('边界情况处理', () => {
    it('应该处理空文件名', () => {
      const result = converter.detectFormat('')
      expect(result.format).toBe('mp4') // 默认值
      expect(result.isVideo).toBe(false)
    })

    it('应该处理只有扩展名的文件名', () => {
      const result = converter.detectFormat('.mp4')
      expect(result.format).toBe('mp4')
      expect(result.isVideo).toBe(true)
    })

    it('应该处理包含多个点的文件名', () => {
      const testCases = [
        'my.movie.file.mp4',
        'clip.v1.2.3.avi',
        'film.final.v2.mkv',
      ]

      for (const fileName of testCases) {
        const result = converter.detectFormat(fileName)
        const expectedExt = fileName.split('.').pop()!

        expect(result.format as string).toBe(expectedExt)
        expect(result.isVideo).toBe(true)
      }
    })

    it('应该处理大小写混合的扩展名', () => {
      const testCases = [
        'video.MP4',
        'video.MOV',
        'video.Avi',
        'video.MkV',
      ]

      for (const fileName of testCases) {
        const result = converter.detectFormat(fileName)
        expect(result.isVideo).toBe(true)
        expect(result.supported).toBe(true)
      }
    })

    it('应该处理未知格式', () => {
      const result = converter.detectFormat('file.xyz')
      expect(result.format as string).toBe('xyz')
      expect(result.isVideo).toBe(false)
      expect(result.supported).toBe(false)
    })  })

  describe('质量预设验证', () => {
    it('应该为 MP4 正确映射 CRF 值', () => {
      const qualityMap = {
        low: 28,
        medium: 23,
        high: 18,
        very_high: 15,
      }

      for (const [quality, expectedCrf] of Object.entries(qualityMap)) {
        const args = (converter as any).buildConvertArgs({
          inputFile: 'video.mov',
          outputFile: 'video.mp4',
          format: 'mp4',
          options: { format: 'mp4', quality: quality as any },
        })

        const crfIndex = args.indexOf('-crf')
        expect(crfIndex).not.toBe(-1)
        expect(args[crfIndex + 1]).toBe(String(expectedCrf))

        console.log(`✓ MP4 ${quality}: CRF ${expectedCrf}`)
      }
    })

    it('应该为 WebM 正确映射 CRF 值', () => {
      const qualityMap = {
        low: 34,
        medium: 30,
        high: 25,
        very_high: 20,
      }

      for (const [quality, expectedCrf] of Object.entries(qualityMap)) {
        const args = (converter as any).buildConvertArgs({
          inputFile: 'video.avi',
          outputFile: 'video.webm',
          format: 'webm',
          options: { format: 'webm', quality: quality as any },
        })

        const crfIndex = args.indexOf('-crf')
        expect(crfIndex).not.toBe(-1)
        expect(args[crfIndex + 1]).toBe(String(expectedCrf))

        // WebM 应该始终包含 -b:v 0
        const bvIndex = args.indexOf('-b:v')
        expect(bvIndex).not.toBe(-1)
        expect(args[bvIndex + 1]).toBe('0')

        console.log(`✓ WebM ${quality}: CRF ${expectedCrf}`)
      }
    })
  })
})

describe('FormatConverter 端到端测试（需要真实视频文件）', () => {
  // TODO: 在有真实视频文件时启用以下测试
  /*
  it('应该转换 MOV → MP4', async () => {
    // 1. 准备测试文件
    const testFile = 'fixtures/sample.mov'

    // 2. 执行转换
    const result = await converter.convertToMP4(testFile, {
      format: 'mp4',
      quality: 'high',
    })

    // 3. 验证结果
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.format).toBe('mp4')
    expect(result.size).toBeGreaterThan(0)
  })

  it('应该转换 AVI → MP4', async () => {
    // 类似的测试逻辑
  })

  it('应该转换 MKV → WebM', async () => {
    // 类似的测试逻辑
  })
  */
})
