/**
 * FormatConverter 测试
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { FormatConverter } from '../format-converter'
import { FFmpegService } from '../ffmpeg/ffmpeg-service'

describe('FormatConverter', () => {
  let converter: FormatConverter

  beforeEach(() => {
    // 创建 FFmpegService 实例
    const ffmpegService = new FFmpegService()
    converter = new FormatConverter(ffmpegService)
  })

  describe('detectFormat', () => {
    it('应该检测到 MP4 格式', () => {
      const result = converter.detectFormat('video.mp4')
      expect(result.format).toBe('mp4')
      expect(result.isVideo).toBe(true)
      expect(result.supported).toBe(true)
    })

    it('应该检测到 MOV 格式', () => {
      const result = converter.detectFormat('video.mov')
      expect(result.format).toBe('mov')
      expect(result.isVideo).toBe(true)
      expect(result.supported).toBe(true)
    })

    it('应该检测到 AVI 格式', () => {
      const result = converter.detectFormat('video.avi')
      expect(result.format).toBe('avi')
      expect(result.isVideo).toBe(true)
      expect(result.supported).toBe(true)
    })

    it('应该检测到 MKV 格式', () => {
      const result = converter.detectFormat('video.mkv')
      expect(result.format).toBe('mkv')
      expect(result.isVideo).toBe(true)
      expect(result.supported).toBe(true)
    })

    it('应该检测到 WebM 格式', () => {
      const result = converter.detectFormat('video.webm')
      expect(result.format).toBe('webm')
      expect(result.isVideo).toBe(true)
      expect(result.supported).toBe(true)
    })

    it('应该检测到 FLV 格式', () => {
      const result = converter.detectFormat('video.flv')
      expect(result.format).toBe('flv')
      expect(result.isVideo).toBe(true)
      expect(result.supported).toBe(true)
    })

    it('应该检测到 WMV 格式', () => {
      const result = converter.detectFormat('video.wmv')
      expect(result.format).toBe('wmv')
      expect(result.isVideo).toBe(true)
      expect(result.supported).toBe(true)
    })

    it('应该检测到 M4V 格式', () => {
      const result = converter.detectFormat('video.m4v')
      expect(result.format).toBe('m4v')
      expect(result.isVideo).toBe(true)
      expect(result.supported).toBe(true)
    })

    it('应该将未知格式识别为非视频格式', () => {
      const result = converter.detectFormat('file.txt')
      expect(result.format as string).toBe('txt') // 返回实际扩展名
      expect(result.isVideo).toBe(false)
      expect(result.supported).toBe(false)
    })

    it('应该处理没有扩展名的文件', () => {
      const result = converter.detectFormat('noextension')
      expect(result.format).toBe('mp4') // 默认值
      expect(result.isVideo).toBe(false)
      expect(result.supported).toBe(false)
    })

    it('应该处理大写扩展名', () => {
      const result = converter.detectFormat('video.MP4')
      expect(result.format).toBe('mp4')
      expect(result.isVideo).toBe(true)
    })

    it('应该处理混合大小写扩展名', () => {
      const result = converter.detectFormat('video.MoV')
      expect(result.format).toBe('mov')
      expect(result.isVideo).toBe(true)
    })
  })

  describe('getSupportedFormats', () => {
    it('应该返回所有支持的格式', () => {
      const formats = converter.getSupportedFormats()
      expect(formats).toContain('mp4')
      expect(formats).toContain('webm')
      expect(formats).toContain('mov')
      expect(formats).toContain('avi')
      expect(formats).toContain('mkv')
      expect(formats.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe('isFormatSupported', () => {
    it('应该正确识别支持的格式', () => {
      expect(converter.isFormatSupported('mp4')).toBe(true)
      expect(converter.isFormatSupported('mov')).toBe(true)
      expect(converter.isFormatSupported('avi')).toBe(true)
    })

    it('应该正确识别不支持的格式', () => {
      expect(converter.isFormatSupported('txt')).toBe(false)
      expect(converter.isFormatSupported('jpg')).toBe(false)
      expect(converter.isFormatSupported('pdf')).toBe(false)
    })
  })

  describe('getConversionSupport', () => {
    it('应该返回格式转换支持情况', () => {
      const support = converter.getConversionSupport()

      // MP4 只能转换到 MP4
      expect(support.mp4).toContain('mp4')

      // MOV 可以转换到 MP4 和 WebM
      expect(support.mov).toContain('mp4')
      expect(support.mov).toContain('webm')

      // AVI 可以转换到 MP4 和 WebM
      expect(support.avi).toContain('mp4')
      expect(support.avi).toContain('webm')

      // MKV 可以转换到 MP4 和 WebM
      expect(support.mkv).toContain('mp4')
      expect(support.mkv).toContain('webm')
    })
  })

  describe('changeFileExtension', () => {
    it('应该正确更改文件扩展名', () => {
      // 测试通过反射访问私有方法（仅用于测试）
      const result = (converter as any).changeFileExtension('video.mp4', 'webm')
      expect(result).toBe('video.webm')
    })

    it('应该处理没有扩展名的文件', () => {
      const result = (converter as any).changeFileExtension('noextension', 'mp4')
      expect(result).toBe('noextension.mp4')
    })

    it('应该处理多个点的文件名', () => {
      const result = (converter as any).changeFileExtension('my.video.file.mp4', 'webm')
      expect(result).toBe('my.video.file.webm')
    })
  })

  describe('buildConvertArgs', () => {
    it('应该为 MP4 转换构建正确的参数', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'input.mov',
        outputFile: 'output.mp4',
        format: 'mp4',
        options: {
          format: 'mp4',
        },
      })

      expect(args).toContain('-i')
      expect(args).toContain('input.mov')
      expect(args).toContain('-c:v')
      expect(args).toContain('libx264')
      expect(args).toContain('-c:a')
      expect(args).toContain('aac')
      expect(args).toContain('-pix_fmt')
      expect(args).toContain('yuv420p')
      expect(args).toContain('-y')
      expect(args).toContain('output.mp4')
    })

    it('应该为 WebM 转换构建正确的参数', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'input.avi',
        outputFile: 'output.webm',
        format: 'webm',
        options: {
          format: 'webm',
        },
      })

      expect(args).toContain('-i')
      expect(args).toContain('input.avi')
      expect(args).toContain('-c:v')
      expect(args).toContain('libvpx-vp9')
      expect(args).toContain('-c:a')
      expect(args).toContain('libopus')
      expect(args).toContain('-b:v')
      expect(args).toContain('0')
      expect(args).toContain('-y')
      expect(args).toContain('output.webm')
    })

    it('应该支持自定义 CRF', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'input.mov',
        outputFile: 'output.mp4',
        format: 'mp4',
        options: {
          format: 'mp4',
          crf: 18,
        },
      })

      expect(args).toContain('-crf')
      expect(args).toContain('18')
    })

    it('应该支持自定义编码器', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'input.mov',
        outputFile: 'output.mp4',
        format: 'mp4',
        options: {
          format: 'mp4',
          codec: 'libx265',
        },
      })

      expect(args).toContain('-c:v')
      expect(args).toContain('libx265')
    })

    it('应该支持移除音频', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'input.mov',
        outputFile: 'output.mp4',
        format: 'mp4',
        options: {
          format: 'mp4',
          includeAudio: false,
        },
      })

      expect(args).toContain('-an')
      expect(args).not.toContain('-c:a')
    })

    it('应该支持自定义质量预设', () => {
      const args = (converter as any).buildConvertArgs({
        inputFile: 'input.mov',
        outputFile: 'output.mp4',
        format: 'mp4',
        options: {
          format: 'mp4',
          quality: 'high',
        },
      })

      expect(args).toContain('-crf')
      expect(args).toContain('18') // high -> CRF 18
    })
  })
})
