/**
 * FormatConverter - 视频格式转换器
 *
 * 使用 FFmpeg.wasm 转换视频格式
 * 支持 MOV, AVI, MKV → MP4 等转换
 */

import { FFmpegService } from './ffmpeg/ffmpeg-service'
import type { FFmpegProgressCallback } from './ffmpeg/types'

/**
 * 支持的视频格式
 */
export const VIDEO_FORMATS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'] as const
export type VideoFormat = (typeof VIDEO_FORMATS)[number]

/**
 * 格式转换选项
 */
export interface FormatConvertOptions {
  /** 输出格式 */
  format: 'mp4' | 'webm'
  /** 视频编码器 */
  codec?: 'libx264' | 'libx265' | 'libvpx-vp9' | 'libvpx'
  /** 质量预设 */
  quality?: 'low' | 'medium' | 'high' | 'very_high'
  /** CRF 值（0-51，越小质量越高） */
  crf?: number
  /** 编码预设 */
  preset?: string
  /** 是否保留音频 */
  includeAudio?: boolean
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean
}

/**
 * 格式转换结果
 */
export interface FormatConvertResult {
  /** 是否成功 */
  success: boolean
  /** 输出文件数据 */
  data?: Uint8Array
  /** 输出格式 */
  format?: VideoFormat
  /** 文件大小（字节） */
  size?: number
  /** 错误信息 */
  error?: string
}

/**
 * 格式检测结果
 */
export interface FormatDetectResult {
  /** 检测到的格式 */
  format: VideoFormat
  /** 是否支持转换 */
  supported: boolean
  /** 是否为视频格式 */
  isVideo: boolean
}

/**
 * FormatConverter 类
 *
 * 提供视频格式转换功能
 */
export class FormatConverter {
  private ffmpegService: FFmpegService

  constructor(ffmpegService: FFmpegService) {
    this.ffmpegService = ffmpegService
  }

  /**
   * 检测文件格式
   *
   * @param fileName 文件名或路径
   * @returns 格式检测结果
   */
  detectFormat(fileName: string): FormatDetectResult {
    // 提取文件扩展名
    const ext = this.getFileExtension(fileName).toLowerCase() as VideoFormat

    // 检查是否为支持的视频格式
    const isVideo = VIDEO_FORMATS.includes(ext)
    const supported = this.isConversionSupported(ext)

    return {
      format: ext || 'mp4', // 如果有扩展名就返回扩展名，否则返回默认值
      supported,
      isVideo,
    }
  }

  /**
   * 转换视频格式
   *
   * @param inputFile 输入文件名（必须在 FFmpeg 虚拟文件系统中）
   * @param options 转换选项
   * @param onProgress 进度回调
   * @returns 转换结果
   */
  async convertToMP4(
    inputFile: string,
    options: FormatConvertOptions = { format: 'mp4' },
    onProgress?: FFmpegProgressCallback
  ): Promise<FormatConvertResult> {
    const { format = 'mp4', includeAudio = true, overwrite = true } = options

    try {
      // 1. 检测输入格式
      const detectResult = this.detectFormat(inputFile)
      if (!detectResult.isVideo) {
        return {
          success: false,
          error: `不支持的文件格式: ${inputFile}`,
        }
      }

      // 2. 如果已经是目标格式，直接返回
      if (detectResult.format === format) {
        console.log('[FormatConverter] 文件已是目标格式，无需转换')
        const data = await this.ffmpegService.readFile(inputFile)
        return {
          success: true,
          data,
          format: detectResult.format,
          size: data.length,
        }
      }

      // 3. 构建输出文件名
      const outputFile = this.changeFileExtension(inputFile, format)

      // 4. 构建 FFmpeg 命令
      const args = this.buildConvertArgs({
        inputFile,
        outputFile,
        format,
        options,
      })

      // 5. 执行转换
      console.log(`[FormatConverter] 转换 ${inputFile} → ${outputFile}`)
      await this.ffmpegService.exec(args, { onProgress })

      // 6. 读取输出文件
      const data = await this.ffmpegService.readFile(outputFile)

      // 7. 清理输出文件
      if (overwrite) {
        await this.ffmpegService.deleteFile(outputFile).catch(() => {})
      }

      return {
        success: true,
        data,
        format,
        size: data.length,
      }
    } catch (error) {
      console.error('[FormatConverter] 转换失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '转换失败',
      }
    }
  }

  /**
   * 批量转换格式
   *
   * @param files 文件列表
   * @param options 转换选项
   * @param onProgress 进度回调
   * @returns 转换结果列表
   */
  async batchConvert(
    files: string[],
    options: FormatConvertOptions = { format: 'mp4' },
    onProgress?: (file: string, progress: number) => void
  ): Promise<FormatConvertResult[]> {
    const results: FormatConvertResult[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      console.log(`[FormatConverter] 批量转换 [${i + 1}/${files.length}]: ${file}`)

      const result = await this.convertToMP4(file, options, ({ progress }) => {
        onProgress?.(file, progress)
      })

      results.push(result)

      // 如果失败，继续转换下一个文件
      if (!result.success) {
        console.warn(`[FormatConverter] 转换失败，跳过: ${file}`)
      }
    }

    return results
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.')
    if (lastDot === -1) return ''
    return fileName.substring(lastDot + 1)
  }

  /**
   * 更改文件扩展名
   */
  private changeFileExtension(fileName: string, newExt: string): string {
    const lastDot = fileName.lastIndexOf('.')
    if (lastDot === -1) return `${fileName}.${newExt}`
    return fileName.substring(0, lastDot + 1) + newExt
  }

  /**
   * 检查是否支持转换
   */
  private isConversionSupported(format: VideoFormat): boolean {
    // 目前支持转换为 MP4 和 WebM
    return ['mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mp4', 'webm'].includes(format)
  }

  /**
   * 构建转换命令参数
   */
  private buildConvertArgs(params: {
    inputFile: string
    outputFile: string
    format: string
    options: FormatConvertOptions
  }): string[] {
    const { inputFile, outputFile, format, options } = params
    const args: string[] = ['-i', inputFile]

    // 视频编码器
    if (format === 'mp4') {
      // MP4 默认使用 H.264
      const codec = options.codec || 'libx264'
      args.push('-c:v', codec)

      // CRF 质量控制
      if (options.crf !== undefined) {
        args.push('-crf', String(options.crf))
      } else if (options.quality) {
        const crfMap: Record<string, number> = {
          low: 28,
          medium: 23,
          high: 18,
          very_high: 15,
        }
        args.push('-crf', String(crfMap[options.quality] || 23))
      } else {
        // 默认使用 medium 质量
        args.push('-crf', '23')
      }

      // 编码预设
      if (options.preset) {
        args.push('-preset', options.preset)
      }
    } else if (format === 'webm') {
      // WebM 默认使用 VP9
      const codec = options.codec || 'libvpx-vp9'
      args.push('-c:v', codec)

      // CRF 质量控制
      if (options.crf !== undefined) {
        args.push('-crf', String(options.crf))
        args.push('-b:v', '0') // CQ 模式
      } else if (options.quality) {
        const crfMap: Record<string, number> = {
          low: 34,
          medium: 30,
          high: 25,
          very_high: 20,
        }
        args.push('-crf', String(crfMap[options.quality] || 30))
        args.push('-b:v', '0')
      } else {
        // 默认使用 CQ 模式
        args.push('-b:v', '0')
      }

      // 编码预设
      if (options.preset) {
        args.push('-cpu-used', options.preset === 'slow' ? '2' : options.preset === 'fast' ? '4' : '3')
      }
    }

    // 音频处理
    if (options.includeAudio !== false) {
      if (format === 'mp4') {
        args.push('-c:a', 'aac', '-b:a', '128k')
      } else if (format === 'webm') {
        args.push('-c:a', 'libopus', '-b:a', '128k')
      }
    } else {
      args.push('-an') // 移除音频
    }

    // 像素格式
    args.push('-pix_fmt', 'yuv420p')

    // 覆盖已存在文件
    if (options.overwrite !== false) {
      args.push('-y')
    }

    // 输出文件
    args.push(outputFile)

    return args
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats(): VideoFormat[] {
    return [...VIDEO_FORMATS]
  }

  /**
   * 检查格式是否支持
   */
  isFormatSupported(format: string): boolean {
    return VIDEO_FORMATS.includes(format as VideoFormat)
  }

  /**
   * 获取格式转换支持情况
   */
  getConversionSupport(): Record<VideoFormat, VideoFormat[]> {
    return {
      mp4: ['mp4'],
      webm: ['webm'],
      mov: ['mp4', 'webm'],
      avi: ['mp4', 'webm'],
      mkv: ['mp4', 'webm'],
      flv: ['mp4', 'webm'],
      wmv: ['mp4'],
      m4v: ['mp4', 'webm'],
    }
  }
}
