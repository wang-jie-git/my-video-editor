/**
 * 字幕管线
 *
 * 管理字幕的解析、编辑、导出和烧录
 */

import { FFmpegService } from '../ffmpeg/ffmpeg-service'
import { SrtParser } from './srt-parser'
import { VttParser } from './vtt-parser'
import {
  createSubtitle,
  createSubtitleTrack,
} from './subtitle-types'
import type {
  Subtitle,
  SubtitleTrack,
  SubtitleParseResult,
  SubtitleExportResult,
  SubtitleBurnOptions,
  SubtitleBurnResult,
  SubtitleExportOptions,
  SubtitleFormat,
  SubtitleStyle,
} from './subtitle-types'

/**
 * 字幕管线类
 *
 * 提供字幕的完整生命周期管理
 */
export class SubtitlePipeline {
  private ffmpegService: FFmpegService

  constructor(ffmpegService: FFmpegService) {
    this.ffmpegService = ffmpegService
  }

  // ==================== 字幕解析 ====================

  /**
   * 解析字幕文件
   */
  parse(content: string): SubtitleParseResult {
    // 自动检测格式
    if (SrtParser.detect(content)) {
      return SrtParser.parse(content)
    }

    if (VttParser.detect(content)) {
      return VttParser.parse(content)
    }

    return {
      success: false,
      tracks: [],
      error: '无法识别的字幕格式',
    }
  }

  /**
   * 解析 SRT 格式
   */
  parseSrt(content: string): SubtitleParseResult {
    return SrtParser.parse(content)
  }

  /**
   * 解析 VTT 格式
   */
  parseVtt(content: string): SubtitleParseResult {
    return VttParser.parse(content)
  }

  // ==================== 字幕导出 ====================

  /**
   * 导出字幕
   */
  export(track: SubtitleTrack, options: SubtitleExportOptions): SubtitleExportResult {
    try {
      let content: string
      let format: SubtitleFormat

      switch (options.format) {
        case 'srt':
          content = SrtParser.generate(track)
          format = 'srt'
          break
        case 'vtt':
          content = VttParser.generate(track)
          format = 'vtt'
          break
        default:
          return {
            success: false,
            error: `不支持的格式: ${options.format}`,
          }
      }

      return {
        success: true,
        content,
      }
    } catch (error) {
      return {
        success: false,
        error: `导出字幕失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 导出为 SRT
   */
  exportSrt(track: SubtitleTrack): SubtitleExportResult {
    return this.export(track, { format: 'srt' })
  }

  /**
   * 导出为 VTT
   */
  exportVtt(track: SubtitleTrack): SubtitleExportResult {
    return this.export(track, { format: 'vtt' })
  }

  // ==================== 字幕烧录 ====================

  /**
   * 烧录字幕到视频
   */
  async burnSubtitles(options: SubtitleBurnOptions): Promise<SubtitleBurnResult> {
    const { inputFile, outputFile, track, onProgress } = options

    try {
      // 1. 导出字幕为 SRT 临时文件
      const srtResult = this.exportSrt(track)
      if (!srtResult.success || !srtResult.content) {
        return {
          success: false,
          error: srtResult.error || '导出字幕失败',
        }
      }

      // 2. 写入临时字幕文件
      const srtFileName = `subtitle-${track.id}.srt`
      const srtData = new TextEncoder().encode(srtResult.content)
      await this.ffmpegService.writeFile(srtFileName, srtData)

      // 3. 构建 FFmpeg 命令
      const args = [
        '-i',
        inputFile,
        '-vf',
        `subtitles=${srtFileName}:force_style='${this.buildStyleString(track.style)}'`,
        '-c:v',
        'libx264',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'copy',
        '-y',
        outputFile,
      ]

      // 4. 执行烧录
      await this.ffmpegService.exec(args, { onProgress })

      // 5. 读取输出文件
      const data = await this.ffmpegService.readFile(outputFile)

      // 6. 清理临时文件
      await this.ffmpegService.deleteFile(srtFileName)

      return {
        success: true,
        outputFile,
        size: data.length,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '烧录字幕失败',
      }
    }
  }

  /**
   * 构建样式字符串
   */
  private buildStyleString(style: SubtitleStyle): string {
    const parts: string[] = []

    if (style.font) {
      parts.push(`FontName=${style.font}`)
    }
    if (style.fontSize) {
      parts.push(`FontSize=${style.fontSize}`)
    }
    if (style.color) {
      parts.push(`PrimaryColour=${this.colorToAss(style.color)}`)
    }
    if (style.backgroundColor) {
      parts.push(`BackColour=${this.colorToAss(style.backgroundColor)}`)
    }
    if (style.borderColor) {
      parts.push(`OutlineColour=${this.colorToAss(style.borderColor)}`)
    }
    if (style.borderWidth !== undefined) {
      parts.push(`Outline=${style.borderWidth}`)
    }
    if (style.bold) {
      parts.push('Bold=1')
    }
    if (style.italic) {
      parts.push('Italic=1')
    }

    return parts.join(',')
  }

  /**
   * 颜色转换为 ASS 格式
   */
  private colorToAss(color: string): string {
    // 移除 # 并转换为 BGR
    const hex = color.replace('#', '')
    const r = hex.substring(0, 2)
    const g = hex.substring(2, 4)
    const b = hex.substring(4, 6)
    return `&H00${b}${g}${r}&`
  }

  // ==================== 字幕编辑 ====================

  /**
   * 添加字幕
   */
  addSubtitle(
    track: SubtitleTrack,
    text: string,
    startTime: number,
    endTime: number
  ): SubtitleTrack {
    const subtitle = createSubtitle(text, startTime, endTime)
    return {
      ...track,
      subtitles: [...track.subtitles, subtitle],
    }
  }

  /**
   * 移除字幕
   */
  removeSubtitle(track: SubtitleTrack, subtitleId: string): SubtitleTrack {
    return {
      ...track,
      subtitles: track.subtitles.filter((s) => s.id !== subtitleId),
    }
  }

  /**
   * 更新字幕
   */
  updateSubtitle(
    track: SubtitleTrack,
    subtitleId: string,
    updates: Partial<Subtitle>
  ): SubtitleTrack {
    return {
      ...track,
      subtitles: track.subtitles.map((s) =>
        s.id === subtitleId ? { ...s, ...updates } : s
      ),
    }
  }

  /**
   * 移动字幕时间
   */
  shiftSubtitleTime(
    track: SubtitleTrack,
    subtitleId: string,
    offset: number
  ): SubtitleTrack {
    return {
      ...track,
      subtitles: track.subtitles.map((s) => {
        if (s.id !== subtitleId) return s

        return {
          ...s,
          startTime: Math.max(0, s.startTime + offset),
          endTime: Math.max(0, s.endTime + offset),
        }
      }),
    }
  }

  /**
   * 批量移动字幕时间
   */
  shiftAllSubtitles(track: SubtitleTrack, offset: number): SubtitleTrack {
    return {
      ...track,
      subtitles: track.subtitles.map((s) => ({
        ...s,
        startTime: Math.max(0, s.startTime + offset),
        endTime: Math.max(0, s.endTime + offset),
      })),
    }
  }

  /**
   * 缩放字幕时间
   */
  scaleSubtitleTime(track: SubtitleTrack, factor: number): SubtitleTrack {
    return {
      ...track,
      subtitles: track.subtitles.map((s) => ({
        ...s,
        startTime: s.startTime * factor,
        endTime: s.endTime * factor,
      })),
    }
  }

  // ==================== 字幕轨道管理 ====================

  /**
   * 添加字幕轨道
   */
  addTrack(tracks: SubtitleTrack[], track: SubtitleTrack): SubtitleTrack[] {
    return [...tracks, track]
  }

  /**
   * 移除字幕轨道
   */
  removeTrack(tracks: SubtitleTrack[], trackId: string): SubtitleTrack[] {
    return tracks.filter((t) => t.id !== trackId)
  }

  /**
   * 启用/禁用轨道
   */
  toggleTrack(tracks: SubtitleTrack[], trackId: string): SubtitleTrack[] {
    return tracks.map((t) =>
      t.id === trackId ? { ...t, enabled: !t.enabled } : t
    )
  }

  // ==================== 辅助方法 ====================

  /**
   * 合并多个字幕轨道
   */
  mergeTracks(tracks: SubtitleTrack[]): SubtitleTrack {
    const allSubtitles = tracks.flatMap((t) => t.subtitles)
    const sortedSubtitles = allSubtitles.sort((a, b) => a.startTime - b.startTime)

    return createSubtitleTrack('Merged Subtitles', 'und', {
      subtitles: sortedSubtitles,
    })
  }

  /**
   * 验证字幕轨道
   */
  validateTrack(track: SubtitleTrack): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!track.name.trim()) {
      errors.push('轨道名称不能为空')
    }

    if (!track.language.trim()) {
      errors.push('语言代码不能为空')
    }

    // 验证每个字幕条目
    track.subtitles.forEach((subtitle, index) => {
      if (!subtitle.text.trim()) {
        errors.push(`字幕 ${index + 1} 文本为空`)
      }

      if (subtitle.startTime < 0) {
        errors.push(`字幕 ${index + 1} 开始时间为负数`)
      }

      if (subtitle.endTime <= subtitle.startTime) {
        errors.push(`字幕 ${index + 1} 结束时间小于等于开始时间`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
