/**
 * SrtParser 单元测试
 */

import { describe, it, expect } from 'bun:test'
import { SrtParser } from '../srt-parser'
import type { SubtitleTrack } from '../subtitle-types'

describe('SrtParser', () => {
  // ==================== 解析测试 ====================

  describe('parse', () => {
    it('应该解析简单的 SRT 字幕', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello World

2
00:00:05,000 --> 00:00:08,000
Test Subtitle`

      const result = SrtParser.parse(srtContent)

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

    it('应该解析多行字幕文本', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Line 1
Line 2
Line 3`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toBe('Line 1\nLine 2\nLine 3')
    })

    it('应该解析单个字幕', () => {
      const srtContent = `1
00:00:00,000 --> 00:00:02,500
Single subtitle`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks).toHaveLength(1)
      expect(result.tracks[0].subtitles).toHaveLength(1)
      expect(result.tracks[0].subtitles[0].text).toBe('Single subtitle')
      expect(result.tracks[0].subtitles[0].startTime).toBe(0)
      expect(result.tracks[0].subtitles[0].endTime).toBe(2.5)
    })

    it('应该处理带空行的字幕', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello


2
00:00:05,000 --> 00:00:08,000
World`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles).toHaveLength(2)
    })

    it('应该处理时间跨小时的字幕', () => {
      const srtContent = `1
01:30:45,500 --> 02:15:30,750
Long video subtitle`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].startTime).toBe(5445.5)
      expect(result.tracks[0].subtitles[0].endTime).toBe(8130.75)
    })

    it('应该处理以 0 开头的时间', () => {
      const srtContent = `1
00:00:00,000 --> 00:00:01,000
Start from zero`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].startTime).toBe(0)
      expect(result.tracks[0].subtitles[0].endTime).toBe(1)
    })

    it('应该处理大量字幕条目', () => {
      const subtitles = Array.from({ length: 100 }, (_, i) => {
        const start = i * 2
        const end = start + 2
        return `${i + 1}
00:00:${String(Math.floor(start / 60)).padStart(2, '0')},${String(start % 60).padStart(3, '0')} --> 00:00:${String(Math.floor(end / 60)).padStart(2, '0')},${String(end % 60).padStart(3, '0')}
Subtitle ${i + 1}`
      })

      const srtContent = subtitles.join('\n\n')

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles).toHaveLength(100)
    })

    it('应该失败当格式无效', () => {
      const invalidContent = 'This is not a valid SRT file'

      const result = SrtParser.parse(invalidContent)

      expect(result.success).toBe(false)
      expect(result.tracks).toHaveLength(0)
      expect(result.error).toBeDefined()
    })

    it('应该容忍缺少编号的字幕', () => {
      // SRT 规范中序号是可选的
      const contentWithoutIndex = `00:00:01,000 --> 00:00:04,000
Hello`

      const result = SrtParser.parse(contentWithoutIndex)

      // SRT 解析器应该容忍缺少编号的情况
      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles).toHaveLength(1)
      expect(result.tracks[0].subtitles[0].text).toBe('Hello')
    })

    it('应该失败当时间格式无效', () => {
      const invalidContent = `1
invalid --> time
Hello`

      const result = SrtParser.parse(invalidContent)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('应该失败当内容为空', () => {
      const result = SrtParser.parse('')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ==================== 生成测试 ====================

  describe('generate', () => {
    it('应该生成正确的 SRT 格式', () => {
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

      const result = SrtParser.generate(track)

      expect(result).toContain('1')
      expect(result).toContain('00:00:01,000 --> 00:00:04,000')
      expect(result).toContain('Hello')
      expect(result).toContain('2')
      expect(result).toContain('00:00:05,000 --> 00:00:08,000')
      expect(result).toContain('World')
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

      const result = SrtParser.generate(track)

      expect(result).toContain('01:01:01,500 --> 01:02:02,750')
    })

    it('应该生成以 0 开头的时间', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: 'Start',
            startTime: 0,
            endTime: 1.5,
          },
        ],
        style: {},
      }

      const result = SrtParser.generate(track)

      expect(result).toContain('00:00:00,000 --> 00:00:01,500')
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

      const result = SrtParser.generate(track)

      expect(result).toContain('00:00:10,123 --> 00:00:20,987')
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

      const result = SrtParser.generate(track)

      expect(result).toContain('Line 1\nLine 2\nLine 3')
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

      const result = SrtParser.generate(track)

      // 应该返回空字符串或只有头部
      expect(typeof result).toBe('string')
    })
  })

  // ==================== 格式检测测试 ====================

  describe('detect', () => {
    it('应该检测 SRT 格式', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello`

      expect(SrtParser.detect(srtContent)).toBe(true)
    })

    it('应该拒绝 VTT 格式', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello`

      expect(SrtParser.detect(vttContent)).toBe(false)
    })

    it('应该拒绝纯文本', () => {
      const plainText = 'This is just plain text'

      expect(SrtParser.detect(plainText)).toBe(false)
    })

    it('应该检测包含逗号的时间戳', () => {
      const content = `1
00:00:01,000 --> 00:00:04,000
Test`

      expect(SrtParser.detect(content)).toBe(true)
    })

    it('应该拒绝空字符串', () => {
      expect(SrtParser.detect('')).toBe(false)
    })

    it('应该拒绝随机文本', () => {
      const randomText = 'Random text without any pattern 12345'

      expect(SrtParser.detect(randomText)).toBe(false)
    })
  })

  // ==================== 边界条件测试 ====================

  describe('边界条件', () => {
    it('应该处理时间格式为 00:00:00,000', () => {
      const srtContent = `1
00:00:00,000 --> 00:00:00,000
Instant`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].startTime).toBe(0)
      expect(result.tracks[0].subtitles[0].endTime).toBe(0)
    })

    it('应该处理带 HTML 标签的字幕文本', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
<b>Bold</b> and <i>italic</i>`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      // SRT 解析器应该保留 HTML 标签（不同于 VTT）
      expect(result.tracks[0].subtitles[0].text).toContain('<b>')
      expect(result.tracks[0].subtitles[0].text).toContain('<i>')
    })

    it('应该处理特殊字符', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Special chars: @#$%^&*()`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toContain('@#$%^&*()')
    })

    it('应该处理 Unicode 字符', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
你好世界 🌍`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toContain('你好世界')
    })

    it('应该处理换行符 (\r\n)', () => {
      const srtContent = `1\r\n00:00:01,000 --> 00:00:04,000\r\nHello`

      const result = SrtParser.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toBe('Hello')
    })
  })

  // ==================== 格式验证测试 ====================

  describe('格式验证', () => {
    it('应该生成正确的序号', () => {
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

      const result = SrtParser.generate(track)

      expect(result).toContain('1\n00:00:01,000 --> 00:00:04,000')
      expect(result).toContain('2\n00:00:05,000 --> 00:00:08,000')
    })

    it('应该生成正确的语言文本', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'zh',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: '测试',
            startTime: 1,
            endTime: 4,
          },
        ],
        style: {},
      }

      const result = SrtParser.generate(track)

      expect(result).toContain('测试')
    })
  })
})
