/**
 * SubtitlePipeline 单元测试
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { SubtitlePipeline } from '../subtitle-pipeline'
import type { SubtitleTrack, Subtitle } from '../subtitle-types'
import type { FFmpegService } from '../../ffmpeg/ffmpeg-service'

// Mock FFmpegService
const createMockFFmpegService = () =>
  ({
    load: async () => {},
    exec: async () => {},
    writeFile: async () => {},
    readFile: async () => new Uint8Array(1024),
    deleteFile: async () => {},
    isLoaded: () => true,
  } as unknown as FFmpegService)

describe('SubtitlePipeline', () => {
  let pipeline: SubtitlePipeline
  let mockFFmpegService: ReturnType<typeof createMockFFmpegService>

  beforeEach(() => {
    mockFFmpegService = createMockFFmpegService()
    pipeline = new SubtitlePipeline(mockFFmpegService)
  })

  // ==================== SRT 解析 ====================

  describe('parseSrt', () => {
    it('应该解析简单的 SRT 字幕', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello World

2
00:00:05,000 --> 00:00:08,000
Test Subtitle`

      const result = pipeline.parseSrt(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks).toHaveLength(1)
      expect(result.tracks[0].subtitles).toHaveLength(2)
      expect(result.tracks[0].subtitles[0].text).toBe('Hello World')
      expect(result.tracks[0].subtitles[0].startTime).toBe(1)
      expect(result.tracks[0].subtitles[0].endTime).toBe(4)
    })

    it('应该解析多行字幕文本', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Line 1
Line 2
Line 3`

      const result = pipeline.parseSrt(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toBe('Line 1\nLine 2\nLine 3')
    })

    it('应该处理空行', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello


2
00:00:05,000 --> 00:00:08,000
World`

      const result = pipeline.parseSrt(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles).toHaveLength(2)
    })

    it('应该处理无效格式', () => {
      const invalidContent = 'invalid subtitle content'

      const result = pipeline.parseSrt(invalidContent)

      expect(result.success).toBe(false)
      expect(result.tracks).toHaveLength(0)
      expect(result.error).toBeDefined()
    })
  })

  // ==================== VTT 解析 ====================

  describe('parseVtt', () => {
    it('应该解析简单的 VTT 字幕', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello World

00:00:05.000 --> 00:00:08.000
Test Subtitle`

      const result = pipeline.parseVtt(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks).toHaveLength(1)
      expect(result.tracks[0].subtitles).toHaveLength(2)
      expect(result.tracks[0].subtitles[0].text).toBe('Hello World')
      expect(result.tracks[0].subtitles[0].startTime).toBe(1)
      expect(result.tracks[0].subtitles[0].endTime).toBe(4)
    })

    it('应该解析无小时格式的 VTT', () => {
      const vttContent = `WEBVTT

00:01.000 --> 00:04.000
Short time format`

      const result = pipeline.parseVtt(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].startTime).toBe(1)
    })

    it('应该移除 HTML 标签', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
<b>Bold</b> and <i>italic</i>`

      const result = pipeline.parseVtt(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toBe('Bold and italic')
    })
  })

  // ==================== 自动格式检测 ====================

  describe('parse (auto-detect)', () => {
    it('应该自动检测 SRT 格式', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello`

      const result = pipeline.parse(srtContent)

      expect(result.success).toBe(true)
      expect(result.format).toBe('srt')
    })

    it('应该自动检测 VTT 格式', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello`

      const result = pipeline.parse(vttContent)

      expect(result.success).toBe(true)
      expect(result.format).toBe('vtt')
    })

    it('应该拒绝无法识别的格式', () => {
      const invalidContent = 'not a subtitle file'

      const result = pipeline.parse(invalidContent)

      expect(result.success).toBe(false)
      expect(result.error).toContain('无法识别')
    })
  })

  // ==================== 字幕导出 ====================

  describe('exportSrt', () => {
    it('应该导出为 SRT 格式', () => {
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

      const result = pipeline.exportSrt(track)

      expect(result.success).toBe(true)
      expect(result.content).toContain('Hello')
      expect(result.content).toContain('World')
      expect(result.content).toContain('00:00:01,000 --> 00:00:04,000')
    })
  })

  describe('exportVtt', () => {
    it('应该导出为 VTT 格式', () => {
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
        ],
        style: {},
      }

      const result = pipeline.exportVtt(track)

      expect(result.success).toBe(true)
      expect(result.content).toContain('WEBVTT')
      expect(result.content).toContain('Hello')
      expect(result.content).toContain('00:01.000 --> 00:04.000') // VTT omits hours when 0
    })
  })

  // ==================== 字幕编辑 ====================

  describe('addSubtitle', () => {
    it('应该添加新字幕', () => {
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
        ],
        style: {},
      }

      const newTrack = pipeline.addSubtitle(track, 'World', 5, 8)

      expect(newTrack.subtitles).toHaveLength(2)
      expect(newTrack.subtitles[1].text).toBe('World')
    })
  })

  describe('removeSubtitle', () => {
    it('应该移除指定字幕', () => {
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

      const newTrack = pipeline.removeSubtitle(track, 'sub-1')

      expect(newTrack.subtitles).toHaveLength(1)
      expect(newTrack.subtitles[0].id).toBe('sub-2')
    })
  })

  describe('updateSubtitle', () => {
    it('应该更新字幕文本', () => {
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
        ],
        style: {},
      }

      const newTrack = pipeline.updateSubtitle(track, 'sub-1', { text: 'Hi' })

      expect(newTrack.subtitles[0].text).toBe('Hi')
      expect(newTrack.subtitles[0].startTime).toBe(1) // 未修改
    })
  })

  describe('shiftSubtitleTime', () => {
    it('应该移动字幕时间', () => {
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
        ],
        style: {},
      }

      const newTrack = pipeline.shiftSubtitleTime(track, 'sub-1', 2)

      expect(newTrack.subtitles[0].startTime).toBe(3)
      expect(newTrack.subtitles[0].endTime).toBe(6)
    })

    it('应该防止时间变为负数', () => {
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
        ],
        style: {},
      }

      const newTrack = pipeline.shiftSubtitleTime(track, 'sub-1', -10)

      expect(newTrack.subtitles[0].startTime).toBe(0)
      expect(newTrack.subtitles[0].endTime).toBe(0)
    })
  })

  describe('shiftAllSubtitles', () => {
    it('应该批量移动所有字幕', () => {
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

      const newTrack = pipeline.shiftAllSubtitles(track, 2)

      expect(newTrack.subtitles[0].startTime).toBe(3)
      expect(newTrack.subtitles[1].startTime).toBe(7)
    })
  })

  describe('scaleSubtitleTime', () => {
    it('应该缩放字幕时间', () => {
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
        ],
        style: {},
      }

      const newTrack = pipeline.scaleSubtitleTime(track, 2)

      expect(newTrack.subtitles[0].startTime).toBe(2)
      expect(newTrack.subtitles[0].endTime).toBe(8)
    })
  })

  // ==================== 轨道管理 ====================

  describe('addTrack', () => {
    it('应该添加新轨道', () => {
      const tracks: SubtitleTrack[] = []
      const newTrack: SubtitleTrack = {
        id: 'track-1',
        name: 'English',
        language: 'en',
        enabled: true,
        subtitles: [],
        style: {},
      }

      const result = pipeline.addTrack(tracks, newTrack)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('track-1')
    })
  })

  describe('toggleTrack', () => {
    it('应该切换轨道启用状态', () => {
      const tracks: SubtitleTrack[] = [
        {
          id: 'track-1',
          name: 'English',
          language: 'en',
          enabled: true,
          subtitles: [],
          style: {},
        },
      ]

      const result = pipeline.toggleTrack(tracks, 'track-1')

      expect(result[0].enabled).toBe(false)
    })
  })

  // ==================== 验证 ====================

  describe('validateTrack', () => {
    it('应该验证有效轨道', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'English',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: 'Hello',
            startTime: 1,
            endTime: 4,
          },
        ],
        style: {},
      }

      const result = pipeline.validateTrack(track)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测空名称', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: '',
        language: 'en',
        enabled: true,
        subtitles: [],
        style: {},
      }

      const result = pipeline.validateTrack(track)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('轨道名称')
    })

    it('应该检测无效时间', () => {
      const track: SubtitleTrack = {
        id: 'track-1',
        name: 'Test',
        language: 'en',
        enabled: true,
        subtitles: [
          {
            id: 'sub-1',
            text: 'Hello',
            startTime: 5,
            endTime: 4, // 结束时间小于开始时间
          },
        ],
        style: {},
      }

      const result = pipeline.validateTrack(track)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('结束时间')
    })
  })
})
