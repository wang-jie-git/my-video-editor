/**
 * VttParser 单元测试
 */

import { describe, it, expect } from 'bun:test'
import { VttParser } from '../vtt-parser'
import type { SubtitleTrack } from '../subtitle-types'

describe('VttParser', () => {
  // ==================== 解析测试 ====================

  describe('parse', () => {
    it('应该解析简单的 VTT 字幕', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello World

00:00:05.000 --> 00:00:08.000
Test Subtitle`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks).toHaveLength(1)
      expect(result.tracks[0].subtitles).toHaveLength(2)
      expect(result.tracks[0].subtitles[0].text).toBe('Hello World')
      expect(result.tracks[0].subtitles[0].startTime).toBe(1)
      expect(result.tracks[0].subtitles[0].endTime).toBe(4)
      expect(result.tracks[0].subtitles[1].text).toBe('Test Subtitle')
      expect(result.tracks[0].subtitles[1].startTime).toBe(5)
      expect(result.tracks[0].subtitles[1].endTime).toBe(8)
    })

    it('应该解析无小时格式的 VTT', () => {
      const vttContent = `WEBVTT

00:01.000 --> 00:04.000
Short time format`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].startTime).toBe(1)
      expect(result.tracks[0].subtitles[0].endTime).toBe(4)
    })

    it('应该解析秒格式的时间戳', () => {
      const vttContent = `WEBVTT

01.500 --> 05.750
Seconds format`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].startTime).toBe(1.5)
      expect(result.tracks[0].subtitles[0].endTime).toBe(5.75)
    })

    it('应该解析多行字幕文本', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Line 1
Line 2
Line 3`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toBe('Line 1\nLine 2\nLine 3')
    })

    it('应该解析单个字幕', () => {
      const vttContent = `WEBVTT

00:00:00.000 --> 00:00:02.500
Single subtitle`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks).toHaveLength(1)
      expect(result.tracks[0].subtitles).toHaveLength(1)
      expect(result.tracks[0].subtitles[0].text).toBe('Single subtitle')
      expect(result.tracks[0].subtitles[0].startTime).toBe(0)
      expect(result.tracks[0].subtitles[0].endTime).toBe(2.5)
    })

    it('应该移除 HTML 标签', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
<b>Bold</b> and <i>italic</i> text`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toBe('Bold and italic text')
    })

    it('应该处理带空行的字幕', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello


00:00:05.000 --> 00:00:08.000
World`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles).toHaveLength(2)
    })

    it('应该处理时间跨小时的字幕', () => {
      const vttContent = `WEBVTT

01:30:45.500 --> 02:15:30.750
Long video subtitle`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].startTime).toBe(5445.5)
      expect(result.tracks[0].subtitles[0].endTime).toBe(8130.75)
    })

    it('应该处理大量字幕条目', () => {
      const subtitles = Array.from({ length: 100 }, (_, i) => {
        const start = i * 2
        const end = start + 2
        const mins = Math.floor(start / 60)
        const secs = start % 60
        const mins2 = Math.floor(end / 60)
        const secs2 = end % 60
        return `00:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.000 --> 00:${String(mins2).padStart(2, '0')}:${String(secs2).padStart(2, '0')}.000
Subtitle ${i + 1}`
      })

      const vttContent = `WEBVTT\n\n${subtitles.join('\n\n')}`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles).toHaveLength(100)
    })

    it('应该失败当格式无效', () => {
      const invalidContent = 'This is not a valid VTT file'

      const result = VttParser.parse(invalidContent)

      expect(result.success).toBe(false)
      expect(result.tracks).toHaveLength(0)
      expect(result.error).toBeDefined()
    })

    it('应该失败当时间格式无效', () => {
      const invalidContent = `WEBVTT

invalid --> time
Hello`

      const result = VttParser.parse(invalidContent)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('应该失败当内容为空', () => {
      const result = VttParser.parse('')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ==================== 生成测试 ====================

  describe('generate', () => {
    it('应该生成正确的 VTT 格式', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: 'Hello',
            startTime: 1,
            endTime: 4,
          },
          {
            id: 'sub-2',
            text: 'World',
            startTime: 5,
            endTime: 8,
          },
        ],
        style: {},
      }

      const result = VttParser.generate(track)

      expect(result).toContain('WEBVTT')
      expect(result).toContain('00:01.000 --> 00:04.000') // VTT omits hours when 0
      expect(result).toContain('Hello')
      expect(result).toContain('00:05.000 --> 00:08.000')
      expect(result).toContain('World')
    })

    it('应该包含头部空行', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: 'Test',
            startTime: 1,
            endTime: 4,
          },
        ],
        style: {},
      }

      const result = VttParser.generate(track)

      expect(result).toMatch(/WEBVTT\n\n/)
    })

    it('应该生成时间跨小时的字幕', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: 'Long video',
            startTime: 3661.5, // 1:01:01.500
            endTime: 3722.75, // 1:02:02.750
          },
        ],
        style: {},
      }

      const result = VttParser.generate(track)

      expect(result).toContain('01:01:01.500 --> 01:02:02.750')
    })

    it('应该正确处理毫秒精度', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: 'Precise',
            startTime: 10.123,
            endTime: 20.987,
          },
        ],
        style: {},
      }

      const result = VttParser.generate(track)

      expect(result).toContain('00:10.123 --> 00:20.987')
    })

    it('应该生成多行字幕文本', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: 'Line 1\nLine 2\nLine 3',
            startTime: 1,
            endTime: 4,
          },
        ],
        style: {},
      }

      const result = VttParser.generate(track)

      expect(result).toContain('Line 1\nLine 2\nLine 3')
    })

    it('应该在字幕之间添加空行', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: 'First',
            startTime: 1,
            endTime: 4,
          },
          {
            id: 'sub-2',
            text: 'Second',
            startTime: 5,
            endTime: 8,
          },
        ],
        style: {},
      }

      const result = VttParser.generate(track)

      // 检查字幕之间有空行
      expect(result).toContain('First\n\n00:05.000')
    })

    it('应该转义 HTML 特殊字符', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: '<script>alert("xss")</script>',
            startTime: 1,
            endTime: 4,
          },
        ],
        style: {},
      }

      const result = VttParser.generate(track)

      expect(result).toContain('&lt;script&gt;')
      expect(result).toContain('&lt;/script&gt;')
    })

    it('应该处理空轨道', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Empty',
        language: 'en',
        enabled: true,
        subtitles: [],
        style: {},
      }

      const result = VttParser.generate(track)

      // 应该返回只有头部的字符串
      expect(result).toContain('WEBVTT')
    })
  })

  // ==================== HTML 转义测试 ====================

  describe('escapeHtml', () => {
    it('应该转义 & 符号', () => {
      const text = 'Tom & Jerry'
      const escaped = VttParser.escapeHtml(text)

      expect(escaped).toBe('Tom &amp; Jerry')
    })

    it('应该转义 < 符号', () => {
      const text = '<b>bold</b>'
      const escaped = VttParser.escapeHtml(text)

      expect(escaped).toBe('&lt;b&gt;bold&lt;/b&gt;')
    })

    it('应该转义 > 符号', () => {
      const text = 'a > b'
      const escaped = VttParser.escapeHtml(text)

      expect(escaped).toBe('a &gt; b')
    })

    it('应该同时转义多个特殊字符', () => {
      const text = '<script>alert("xss")</script>'
      const escaped = VttParser.escapeHtml(text)

      expect(escaped).toContain('&lt;')
      expect(escaped).toContain('&gt;')
    })
  })

  // ==================== HTML 标签移除测试 ====================

  describe('stripTags', () => {
    it('应该移除 <b> 标签', () => {
      const text = '<b>Bold text</b>'
      const stripped = VttParser.stripTags(text)

      expect(stripped).toBe('Bold text')
    })

    it('应该移除 <i> 标签', () => {
      const text = '<i>Italic text</i>'
      const stripped = VttParser.stripTags(text)

      expect(stripped).toBe('Italic text')
    })

    it('应该移除多个标签', () => {
      const text = '<b>Bold</b> and <i>italic</i>'
      const stripped = VttParser.stripTags(text)

      expect(stripped).toBe('Bold and italic')
    })

    it('应该保留没有标签的文本', () => {
      const text = 'Plain text'
      const stripped = VttParser.stripTags(text)

      expect(stripped).toBe('Plain text')
    })

    it('应该移除嵌套标签', () => {
      const text = '<b><i>Nested</i></b>'
      const stripped = VttParser.stripTags(text)

      expect(stripped).toBe('Nested')
    })
  })

  // ==================== 格式检测测试 ====================

  describe('detect', () => {
    it('应该检测 VTT 格式（WEBVTT 头部）', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello`

      expect(VttParser.detect(vttContent)).toBe(true)
    })

    it('应该检测 VTT 格式（时间戳格式）', () => {
      const vttContent = `00:00:01.000 --> 00:00:04.000
Hello`

      expect(VttParser.detect(vttContent)).toBe(true)
    })

    it('应该拒绝 SRT 格式', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello`

      expect(VttParser.detect(srtContent)).toBe(false)
    })

    it('应该拒绝纯文本', () => {
      const plainText = 'This is just plain text'

      expect(VttParser.detect(plainText)).toBe(false)
    })

    it('应该检测无小时的时间戳格式', () => {
      const vttContent = `00:01.000 --> 00:04.000
Short format`

      expect(VttParser.detect(vttContent)).toBe(true)
    })

    it('应该检测秒格式的时间戳', () => {
      const vttContent = `01.500 --> 05.750
Seconds format`

      expect(VttParser.detect(vttContent)).toBe(true)
    })

    it('应该拒绝空字符串', () => {
      expect(VttParser.detect('')).toBe(false)
    })

    it('应该拒绝随机文本', () => {
      const randomText = 'Random text without any pattern 12345'

      expect(VttParser.detect(randomText)).toBe(false)
    })
  })

  // ==================== 边界条件测试 ====================

  describe('边界条件', () => {
    it('应该处理时间格式为 00:00:00.000', () => {
      const vttContent = `WEBVTT

00:00:00.000 --> 00:00:00.000
Instant`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].startTime).toBe(0)
      expect(result.tracks[0].subtitles[0].endTime).toBe(0)
    })

    it('应该处理特殊字符', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Special chars: @#$%^&*()`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toContain('@#$%^&*()')
    })

    it('应该处理 Unicode 字符', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
你好世界 🌍`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toContain('你好世界')
    })

    it('应该处理换行符 (\r\n)', () => {
      const vttContent = `WEBVTT\r\n\r\n00:00:01.000 --> 00:00:04.000\r\nHello`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toBe('Hello')
    })

    it('应该处理空行开头的文件', () => {
      const vttContent = `\n\nWEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHello`

      const result = VttParser.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles).toHaveLength(1)
    })
  })
})
