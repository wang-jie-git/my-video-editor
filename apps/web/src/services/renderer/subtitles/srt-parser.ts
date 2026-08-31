/**
 * SRT 解析器
 *
 * 支持解析和生成 SRT 格式字幕
 */

import type {
  Subtitle,
  SubtitleTrack,
  SubtitleParseResult,
  SubtitleFormat,
} from './subtitle-types'
import { createSubtitle, createSubtitleTrack, formatSrtTime } from './subtitle-types'

/**
 * SRT 解析器类
 */
export class SrtParser {
  /**
   * 解析 SRT 格式字幕
   */
  static parse(content: string): SubtitleParseResult {
    try {
      const lines = content.split(/\r?\n/)
      const subtitles: Subtitle[] = []
      let currentIndex = 0

      while (currentIndex < lines.length) {
        // 跳过空行
        if (lines[currentIndex].trim() === '') {
          currentIndex++
          continue
        }

        // 读取序号（可选的）
        const indexLine = lines[currentIndex].trim()
        if (/^\d+$/.test(indexLine)) {
          currentIndex++
        }

        // 读取时间范围
        if (currentIndex >= lines.length) {
          break
        }

        const timeLine = lines[currentIndex].trim()
        const timeMatch = timeLine.match(
          /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
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
          textLines.push(lines[currentIndex].trim())
          currentIndex++
        }

        const text = textLines.join('\n')

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
      const track = createSubtitleTrack('SRT Subtitles', 'und', {
        subtitles,
      })

      return {
        success: true,
        tracks: [track],
        format: 'srt',
      }
    } catch (error) {
      return {
        success: false,
        tracks: [],
        error: `解析 SRT 失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 生成 SRT 格式字幕
   */
  static generate(track: SubtitleTrack): string {
    const lines: string[] = []

    track.subtitles.forEach((subtitle, index) => {
      // 序号
      lines.push(String(index + 1))

      // 时间范围
      const startTime = formatSrtTime(subtitle.startTime)
      const endTime = formatSrtTime(subtitle.endTime)
      lines.push(`${startTime} --> ${endTime}`)

      // 字幕文本
      lines.push(subtitle.text)

      // 空行
      lines.push('')
    })

    return lines.join('\n')
  }

  /**
   * 解析时间字符串
   */
  private static parseTime(timeStr: string): number {
    const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)

    if (!match) {
      throw new Error(`无效的时间格式: ${timeStr}`)
    }

    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const seconds = parseInt(match[3], 10)
    const milliseconds = parseInt(match[4], 10)

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
  }

  /**
   * 检测是否为 SRT 格式
   */
  static detect(content: string): boolean {
    // 检查是否包含时间戳格式
    const timePattern = /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/
    return timePattern.test(content)
  }
}
