/**
 * VTT (WebVTT) 解析器
 *
 * 支持解析和生成 WebVTT 格式字幕
 */

import type {
  Subtitle,
  SubtitleTrack,
  SubtitleParseResult,
  SubtitleFormat,
  SubtitleStyle,
} from './subtitle-types'
import { createSubtitle, createSubtitleTrack, formatVttTime } from './subtitle-types'

/**
 * VTT 解析器类
 */
export class VttParser {
  /**
   * 解析 VTT 格式字幕
   */
  static parse(content: string): SubtitleParseResult {
    try {
      const lines = content.split(/\r?\n/)
      const subtitles: Subtitle[] = []
      let currentIndex = 0

      // 跳过头部
      while (currentIndex < lines.length && !lines[currentIndex].includes('-->')) {
        currentIndex++
      }

      while (currentIndex < lines.length) {
        // 跳过空行
        if (lines[currentIndex].trim() === '') {
          currentIndex++
          continue
        }

        // 读取时间范围
        const timeLine = lines[currentIndex].trim()
        const timeMatch = timeLine.match(
          /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3}|\d+\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3}|\d+\.\d{3})/
        )

        if (!timeMatch) {
          currentIndex++
          continue
        }

        const startTime = this.parseTime(timeMatch[1])
        const endTime = this.parseTime(timeMatch[2])

        currentIndex++

        // 读取字幕文本
        const textLines: string[] = []
        while (
          currentIndex < lines.length &&
          lines[currentIndex].trim() !== ''
        ) {
          const line = lines[currentIndex].trim()
          textLines.push(line)

          currentIndex++
        }

        const text = this.stripTags(textLines.join('\n'))

        // 创建字幕条目
        const subtitle = createSubtitle(text, startTime, endTime)
        subtitles.push(subtitle)
      }

      // 验证至少解析到一个字幕
      if (subtitles.length === 0) {
        return {
          success: false,
          tracks: [],
          error: '未找到有效的字幕条目',
        }
      }

      // 创建字幕轨道
      const track = createSubtitleTrack('VTT Subtitles', 'und', {
        subtitles,
      })

      return {
        success: true,
        tracks: [track],
        format: 'vtt',
      }
    } catch (error) {
      return {
        success: false,
        tracks: [],
        error: `解析 VTT 失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 生成 VTT 格式字幕
   */
  static generate(track: SubtitleTrack): string {
    const lines: string[] = []

    // 头部
    lines.push('WEBVTT')
    lines.push('')

    // 可选：添加样式
    if (track.style) {
      lines.push('STYLE')
      lines.push(...this.generateStyle(track.style))
      lines.push('')
    }

    // 字幕条目
    track.subtitles.forEach((subtitle) => {
      // 时间范围
      const startTime = formatVttTime(subtitle.startTime)
      const endTime = formatVttTime(subtitle.endTime)
      lines.push(`${startTime} --> ${endTime}`)

      // 字幕文本
      const text = this.escapeHtml(subtitle.text)
      lines.push(text)

      // 空行
      lines.push('')
    })

    return lines.join('\n')
  }

  /**
   * 解析时间字符串
   */
  private static parseTime(timeStr: string): number {
    let seconds = 0

    // HH:MM:SS.mmm
    const fullMatch = timeStr.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/)
    if (fullMatch) {
      seconds += parseInt(fullMatch[1], 10) * 3600
      seconds += parseInt(fullMatch[2], 10) * 60
      seconds += parseInt(fullMatch[3], 10)
      seconds += parseInt(fullMatch[4], 10) / 1000
      return seconds
    }

    // MM:SS.mmm
    const partialMatch = timeStr.match(/(\d{2}):(\d{2})\.(\d{3})/)
    if (partialMatch) {
      seconds += parseInt(partialMatch[1], 10) * 60
      seconds += parseInt(partialMatch[2], 10)
      seconds += parseInt(partialMatch[3], 10) / 1000
      return seconds
    }

    // SS.mmm
    seconds += parseFloat(timeStr)
    return seconds
  }

  /**
   * 生成样式
   */
  private static generateStyle(style: SubtitleStyle): string[] {
    const css: string[] = []

    if (style.font) {
      css.push(`font-family: ${style.font};`)
    }
    if (style.fontSize) {
      css.push(`font-size: ${style.fontSize}px;`)
    }
    if (style.color) {
      css.push(`color: ${style.color};`)
    }
    if (style.backgroundColor) {
      css.push(`background-color: ${style.backgroundColor};`)
    }

    return [css.join(' ')]
  }

  /**
   * 转义 HTML
   */
  static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  /**
   * 移除 HTML 标签
   */
  static stripTags(text: string): string {
    return text.replace(/<[^>]+>/g, '')
  }

  /**
   * 检测是否为 VTT 格式
   */
  static detect(content: string): boolean {
    // 检查是否包含 WEBVTT 头部或任何时间戳格式
    return (
      content.startsWith('WEBVTT') ||
      /\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(content) ||
      /\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}\.\d{3}/.test(content) ||
      /\d+\.\d{3}\s*-->\s*\d+\.\d{3}/.test(content)
    )
  }
}
