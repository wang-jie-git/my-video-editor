/**
 * 字幕面板组件逻辑测试
 *
 * 测试字幕管道的核心逻辑，不依赖 React 渲染
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { SubtitlePipeline } from '@/services/renderer/subtitles'
import { createSubtitle, createSubtitleTrack } from '@/services/renderer/subtitles'
import type { FFmpegService } from '@/services/renderer/ffmpeg/ffmpeg-service'

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

describe('SubtitlePanel Logic', () => {
  let pipeline: SubtitlePipeline

  beforeEach(() => {
    pipeline = new SubtitlePipeline(createMockFFmpegService())
  })

  // ==================== 轨道管理测试 ====================

  describe('轨道管理', () => {
    it('应该创建空轨道列表', () => {
      const tracks: any[] = []
      expect(tracks).toHaveLength(0)
    })

    it('应该添加新轨道', () => {
      const tracks: any[] = []
      const newTrack = createSubtitleTrack('English', 'en', {
        subtitles: [],
      })

      const result = pipeline.addTrack(tracks, newTrack)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(newTrack.id)
    })

    it('应该添加多个轨道', () => {
      const tracks: any[] = []
      const track1 = createSubtitleTrack('English', 'en', { subtitles: [] })
      const track2 = createSubtitleTrack('中文', 'zh', { subtitles: [] })

      const result = pipeline.addTrack(pipeline.addTrack(tracks, track1), track2)

      expect(result).toHaveLength(2)
      expect(result[0].language).toBe('en')
      expect(result[1].language).toBe('zh')
    })

    it('应该移除轨道', () => {
      const track1 = createSubtitleTrack('English', 'en', { subtitles: [] })
      const track2 = createSubtitleTrack('中文', 'zh', { subtitles: [] })
      let tracks = pipeline.addTrack([], track1)
      tracks = pipeline.addTrack(tracks, track2)

      const result = pipeline.removeTrack(tracks, track1.id)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(track2.id)
    })

    it('应该切换轨道启用状态', () => {
      const track = createSubtitleTrack('English', 'en', { subtitles: [] })
      const tracks = pipeline.addTrack([], track)

      expect(tracks[0].enabled).toBe(true)

      const result = pipeline.toggleTrack(tracks, track.id)
      expect(result[0].enabled).toBe(false)

      const result2 = pipeline.toggleTrack(result, track.id)
      expect(result2[0].enabled).toBe(true)
    })
  })

  // ==================== 字幕管理测试 ====================

  describe('字幕管理', () => {
    it('应该添加字幕到轨道', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('First', 1, 4)],
      })

      const newTrack = pipeline.addSubtitle(track, 'Second', 5, 8)

      expect(newTrack.subtitles).toHaveLength(2)
      expect(newTrack.subtitles[1].text).toBe('Second')
      expect(newTrack.subtitles[1].startTime).toBe(5)
      expect(newTrack.subtitles[1].endTime).toBe(8)
    })

    it('应该移除字幕', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [
          createSubtitle('First', 1, 4),
          createSubtitle('Second', 5, 8),
        ],
      })

      const newTrack = pipeline.removeSubtitle(track, track.subtitles[0].id)

      expect(newTrack.subtitles).toHaveLength(1)
      expect(newTrack.subtitles[0].text).toBe('Second')
    })

    it('应该更新字幕', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Hello', 1, 4)],
      })

      const newTrack = pipeline.updateSubtitle(track, track.subtitles[0].id, {
        text: 'Hi',
        startTime: 2,
      })

      expect(newTrack.subtitles[0].text).toBe('Hi')
      expect(newTrack.subtitles[0].startTime).toBe(2)
      expect(newTrack.subtitles[0].endTime).toBe(4) // 未修改
    })
  })

  // ==================== 时间轴调整测试 ====================

  describe('时间轴调整', () => {
    it('应该移动字幕时间', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Hello', 1, 4)],
      })

      const newTrack = pipeline.shiftSubtitleTime(track, track.subtitles[0].id, 2)

      expect(newTrack.subtitles[0].startTime).toBe(3)
      expect(newTrack.subtitles[0].endTime).toBe(6)
    })

    it('应该防止时间变为负数', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Hello', 1, 4)],
      })

      const newTrack = pipeline.shiftSubtitleTime(track, track.subtitles[0].id, -10)

      expect(newTrack.subtitles[0].startTime).toBe(0)
      expect(newTrack.subtitles[0].endTime).toBe(0)
    })

    it('应该批量移动字幕时间', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [
          createSubtitle('First', 1, 4),
          createSubtitle('Second', 5, 8),
        ],
      })

      const newTrack = pipeline.shiftAllSubtitles(track, 2)

      expect(newTrack.subtitles[0].startTime).toBe(3)
      expect(newTrack.subtitles[1].startTime).toBe(7)
    })

    it('应该缩放字幕时间', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Hello', 2, 4)],
      })

      const newTrack = pipeline.scaleSubtitleTime(track, 2)

      expect(newTrack.subtitles[0].startTime).toBe(4)
      expect(newTrack.subtitles[0].endTime).toBe(8)
    })
  })

  // ==================== 验证测试 ====================

  describe('轨道验证', () => {
    it('应该验证有效轨道', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Hello', 1, 4)],
      })

      const result = pipeline.validateTrack(track)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测空名称', () => {
      const track = createSubtitleTrack('', 'en', {
        subtitles: [],
      })

      const result = pipeline.validateTrack(track)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('轨道名称')
    })

    it('应该检测无效时间', () => {
      const track = createSubtitleTrack('Test', 'en', {
        subtitles: [createSubtitle('Hello', 5, 4)],
      })

      const result = pipeline.validateTrack(track)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('结束时间')
    })
  })

  // ==================== 合并轨道测试 ====================

  describe('合并轨道', () => {
    it('应该合并多个轨道', () => {
      const track1 = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('First', 1, 4)],
      })

      const track2 = createSubtitleTrack('中文', 'zh', {
        subtitles: [createSubtitle('第二', 2, 5)],
      })

      const merged = pipeline.mergeTracks([track1, track2])

      expect(merged.subtitles).toHaveLength(2)
      // 应该按时间排序
      expect(merged.subtitles[0].startTime).toBeLessThanOrEqual(
        merged.subtitles[1].startTime
      )
    })
  })

  // ==================== 导出测试 ====================

  describe('字幕导出', () => {
    it('应该导出为 SRT 格式', () => {
      const track = createSubtitleTrack('Test', 'en', {
        subtitles: [
          createSubtitle('Hello', 1, 4),
          createSubtitle('World', 5, 8),
        ],
      })

      const result = pipeline.exportSrt(track)

      expect(result.success).toBe(true)
      expect(result.content).toContain('Hello')
      expect(result.content).toContain('World')
    })

    it('应该导出为 VTT 格式', () => {
      const track = createSubtitleTrack('Test', 'en', {
        subtitles: [createSubtitle('Hello', 1, 4)],
      })

      const result = pipeline.exportVtt(track)

      expect(result.success).toBe(true)
      expect(result.content).toContain('WEBVTT')
      expect(result.content).toContain('Hello')
    })
  })

  // ==================== 解析测试 ====================

  describe('字幕解析', () => {
    it('应该解析 SRT 格式', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello World

2
00:00:05,000 --> 00:00:08,000
Test`

      const result = pipeline.parseSrt(srtContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles).toHaveLength(2)
    })

    it('应该解析 VTT 格式', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello World

00:00:05.000 --> 00:00:08.000
Test`

      const result = pipeline.parseVtt(vttContent)

      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles).toHaveLength(2)
    })

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
  })
})
