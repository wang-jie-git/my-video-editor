/**
 * Phase 5 Day 33: 字幕支持集成测试
 *
 * 测试字幕系统与 EditorCore、Timeline、文件导入/导出的集成
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { SubtitlePipeline } from '@/services/renderer/subtitles'
import { createSubtitle, createSubtitleTrack } from '@/services/renderer/subtitles'
import type { SubtitleTrack, Subtitle } from '@/services/renderer/subtitles'

// Mock FFmpegService
const createMockFFmpegService = () => ({
  load: async () => {},
  exec: async () => {},
  writeFile: async () => {},
  readFile: async () => new Uint8Array(1024),
  deleteFile: async () => {},
  isLoaded: () => true,
})

// ==================== EditorCore 集成测试 ====================

describe('EditorCore 集成测试', () => {
  let pipeline: SubtitlePipeline

  beforeEach(() => {
    pipeline = new SubtitlePipeline(createMockFFmpegService())
  })

  describe('字幕管线与 EditorCore 集成', () => {
    it('应该支持 EditorCore 使用的完整字幕工作流', () => {
      // 1. 创建轨道（模拟 EditorCore 项目结构）
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [
          createSubtitle('Welcome', 0, 3),
          createSubtitle('Introduction', 3.5, 7),
        ],
        style: {
          fontSize: 24,
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      })

      // 2. 验证轨道
      const validation = pipeline.validateTrack(track)
      expect(validation.valid).toBe(true)

      // 3. 添加新字幕
      const updatedTrack = pipeline.addSubtitle(track, 'Get Started', 7.5, 10)
      expect(updatedTrack.subtitles).toHaveLength(3)

      // 4. 更新字幕
      const editedTrack = pipeline.updateSubtitle(updatedTrack, updatedTrack.subtitles[0].id, {
        text: 'Welcome to Cutia',
      })
      expect(editedTrack.subtitles[0].text).toBe('Welcome to Cutia')

      // 5. 删除字幕
      const finalTrack = pipeline.removeSubtitle(editedTrack, editedTrack.subtitles[1].id)
      expect(finalTrack.subtitles).toHaveLength(2)
    })

    it('应该支持多轨道并行编辑', () => {
      // 创建多语言轨道（模拟 EditorCore 多轨道）
      const englishTrack = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Hello', 1, 4)],
      })

      const chineseTrack = createSubtitleTrack('中文', 'zh', {
        subtitles: [createSubtitle('你好', 1, 4)],
      })

      const japaneseTrack = createSubtitleTrack('日本語', 'ja', {
        subtitles: [createSubtitle('こんにちは', 1, 4)],
      })

      // 验证所有轨道
      expect(pipeline.validateTrack(englishTrack).valid).toBe(true)
      expect(pipeline.validateTrack(chineseTrack).valid).toBe(true)
      expect(pipeline.validateTrack(japaneseTrack).valid).toBe(true)

      // 批量更新时间轴
      const timeOffset = 2
      const shiftedEnglish = pipeline.shiftAllSubtitles(englishTrack, timeOffset)
      const shiftedChinese = pipeline.shiftAllSubtitles(chineseTrack, timeOffset)
      const shiftedJapanese = pipeline.shiftAllSubtitles(japaneseTrack, timeOffset)

      expect(shiftedEnglish.subtitles[0].startTime).toBe(3)
      expect(shiftedChinese.subtitles[0].startTime).toBe(3)
      expect(shiftedJapanese.subtitles[0].startTime).toBe(3)
    })

    it('应该与 EditorCore 命令系统兼容', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Original', 1, 4)],
      })

      // 模拟命令撤销/重做
      // 操作 1: 更新字幕
      const afterUpdate = pipeline.updateSubtitle(track, track.subtitles[0].id, {
        text: 'Updated',
      })

      // 操作 2: 添加字幕
      const afterAdd = pipeline.addSubtitle(afterUpdate, 'New', 5, 8)

      // 撤销操作 2
      const afterUndo = pipeline.removeSubtitle(afterAdd, afterAdd.subtitles[1].id)
      expect(afterUndo.subtitles).toHaveLength(1)
      expect(afterUndo.subtitles[0].text).toBe('Updated')

      // 撤销操作 1
      const afterUndo2 = pipeline.updateSubtitle(afterUndo, afterUndo.subtitles[0].id, {
        text: 'Original',
      })
      expect(afterUndo2.subtitles[0].text).toBe('Original')
    })
  })
})

// ==================== Timeline 同步测试 ====================

describe('Timeline 同步测试', () => {
  let pipeline: SubtitlePipeline

  beforeEach(() => {
    pipeline = new SubtitlePipeline(createMockFFmpegService())
  })

  describe('时间轴同步', () => {
    it('应该同步字幕时间与 Timeline 时间', () => {
      // 创建与 Timeline 同步的字幕
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [
          createSubtitle('Scene 1', 0, 5),
          createSubtitle('Scene 2', 5.5, 10),
          createSubtitle('Scene 3', 10.5, 15),
        ],
      })

      // 验证字幕时间点
      expect(track.subtitles[0].startTime).toBe(0)
      expect(track.subtitles[0].endTime).toBe(5)

      expect(track.subtitles[1].startTime).toBe(5.5)
      expect(track.subtitles[1].endTime).toBe(10)

      expect(track.subtitles[2].startTime).toBe(10.5)
      expect(track.subtitles[2].endTime).toBe(15)
    })

    it('应该支持 Timeline 元素移动时更新字幕', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Moved', 5, 8)],
      })

      // 模拟 Timeline 元素移动（时间偏移）
      const offset = -3
      const shiftedTrack = pipeline.shiftAllSubtitles(track, offset)

      expect(shiftedTrack.subtitles[0].startTime).toBe(2)
      expect(shiftedTrack.subtitles[0].endTime).toBe(5)
    })

    it('应该支持 Timeline 元素时长调整', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Extended', 1, 4)],
      })

      // 模拟 Timeline 元素时长调整
      const updatedTrack = pipeline.updateSubtitle(track, track.subtitles[0].id, {
        startTime: 1,
        endTime: 6, // 从 3 秒扩展到 5 秒
      })

      expect(updatedTrack.subtitles[0].endTime - updatedTrack.subtitles[0].startTime).toBe(5)
    })

    it('应该支持 Timeline 轨道删除时同步删除字幕', () => {
      const track1 = createSubtitleTrack('Track 1', 'en', {
        subtitles: [createSubtitle('T1', 1, 4)],
      })

      const track2 = createSubtitleTrack('Track 2', 'zh', {
        subtitles: [createSubtitle('T2', 1, 4)],
      })

      let tracks = pipeline.addTrack([], track1)
      tracks = pipeline.addTrack(tracks, track2)

      // 删除轨道 1
      const remainingTracks = pipeline.removeTrack(tracks, track1.id)

      expect(remainingTracks).toHaveLength(1)
      expect(remainingTracks[0].id).toBe(track2.id)
    })

    it('应该支持 Timeline 播放头移动时预览字幕', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [
          createSubtitle('First', 0, 3),
          createSubtitle('Second', 3.5, 6),
          createSubtitle('Third', 6.5, 9),
        ],
      })

      // 模拟播放头在不同时间点
      const timePoints = [1, 4, 7]
      const expectedSubtitles = ['First', 'Second', 'Third']

      timePoints.forEach((time, index) => {
        const activeSubtitle = track.subtitles.find(
          (sub) => time >= sub.startTime && time <= sub.endTime
        )
        expect(activeSubtitle?.text).toBe(expectedSubtitles[index])
      })
    })
  })

  describe('时间轴缩放', () => {
    it('应该支持 Timeline 整体缩放时调整所有字幕', () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [
          createSubtitle('First', 10, 20),
          createSubtitle('Second', 30, 40),
        ],
      })

      // 模拟 Timeline 2x 缩放
      const scaledTrack = pipeline.scaleSubtitleTime(track, 2)

      expect(scaledTrack.subtitles[0].startTime).toBe(20)
      expect(scaledTrack.subtitles[0].endTime).toBe(40)
      expect(scaledTrack.subtitles[1].startTime).toBe(60)
      expect(scaledTrack.subtitles[1].endTime).toBe(80)
    })
  })
})

// ==================== 文件导入导出集成测试 ====================

describe('文件导入导出集成测试', () => {
  let pipeline: SubtitlePipeline

  beforeEach(() => {
    pipeline = new SubtitlePipeline(createMockFFmpegService())
  })

  describe('SRT 导入导出', () => {
    it('应该支持完整的 SRT 导入→编辑→导出流程', () => {
      // 1. 导入 SRT
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello World

2
00:00:05,000 --> 00:00:08,000
Test Subtitle`

      const importResult = pipeline.parseSrt(srtContent)
      expect(importResult.success).toBe(true)
      expect(importResult.format).toBe('srt')
      expect(importResult.tracks[0].subtitles).toHaveLength(2)

      // 2. 编辑字幕
      const editedTrack = pipeline.updateSubtitle(
        importResult.tracks[0],
        importResult.tracks[0].subtitles[0].id,
        { text: 'Hello Universe' }
      )
      expect(editedTrack.subtitles[0].text).toBe('Hello Universe')

      // 3. 添加新字幕
      const withNewSubtitle = pipeline.addSubtitle(editedTrack, 'New Line', 9, 12)
      expect(withNewSubtitle.subtitles).toHaveLength(3)

      // 4. 导出为 SRT
      const exportResult = pipeline.exportSrt(withNewSubtitle)
      expect(exportResult.success).toBe(true)
      expect(exportResult.content).toContain('Hello Universe')
      expect(exportResult.content).toContain('New Line')

      // 5. 验证导出内容
      const reImportResult = pipeline.parseSrt(exportResult.content!)
      expect(reImportResult.success).toBe(true)
      expect(reImportResult.tracks[0].subtitles).toHaveLength(3)
    })

    it('应该支持 SRT → VTT 格式转换', () => {
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello`

      // 1. 导入 SRT
      const srtResult = pipeline.parseSrt(srtContent)
      expect(srtResult.success).toBe(true)

      // 2. 导出为 VTT
      const vttResult = pipeline.exportVtt(srtResult.tracks[0])
      expect(vttResult.success).toBe(true)
      expect(vttResult.content).toContain('WEBVTT')
      expect(vttResult.content).toContain('Hello')
    })
  })

  describe('VTT 导入导出', () => {
    it('应该支持完整的 VTT 导入→编辑→导出流程', () => {
      // 1. 导入 VTT
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
First Subtitle

00:00:05.000 --> 00:00:08.000
Second Subtitle`

      const importResult = pipeline.parseVtt(vttContent)
      expect(importResult.success).toBe(true)
      expect(importResult.format).toBe('vtt')
      expect(importResult.tracks[0].subtitles).toHaveLength(2)

      // 2. 编辑字幕
      const editedTrack = pipeline.updateSubtitle(
        importResult.tracks[0],
        importResult.tracks[0].subtitles[1].id,
        { text: 'Updated Second' }
      )
      expect(editedTrack.subtitles[1].text).toBe('Updated Second')

      // 3. 导出为 VTT
      const exportResult = pipeline.exportVtt(editedTrack)
      expect(exportResult.success).toBe(true)
      expect(exportResult.content).toContain('Updated Second')

      // 4. 验证导出内容
      const reImportResult = pipeline.parseVtt(exportResult.content!)
      expect(reImportResult.success).toBe(true)
      expect(reImportResult.tracks[0].subtitles).toHaveLength(2)
    })

    it('应该支持 VTT → SRT 格式转换', () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello`

      // 1. 导入 VTT
      const vttResult = pipeline.parseVtt(vttContent)
      expect(vttResult.success).toBe(true)

      // 2. 导出为 SRT
      const srtResult = pipeline.exportSrt(vttResult.tracks[0])
      expect(srtResult.success).toBe(true)
      expect(srtResult.content).toContain('00:00:01,000 --> 00:00:04,000') // SRT 使用逗号
      expect(srtResult.content).toContain('Hello')
    })
  })

  describe('多轨道导入导出', () => {
    it('应该支持多轨道导入和分别导出', () => {
      // 1. 创建多轨道
      const englishTrack = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Hello', 1, 4)],
      })

      const chineseTrack = createSubtitleTrack('中文', 'zh', {
        subtitles: [createSubtitle('你好', 1, 4)],
      })

      let tracks = pipeline.addTrack([], englishTrack)
      tracks = pipeline.addTrack(tracks, chineseTrack)

      // 2. 分别导出
      const englishSrt = pipeline.exportSrt(tracks[0])
      const chineseSrt = pipeline.exportSrt(tracks[1])

      expect(englishSrt.success).toBe(true)
      expect(englishSrt.content).toContain('Hello')

      expect(chineseSrt.success).toBe(true)
      expect(chineseSrt.content).toContain('你好')

      // 3. 验证可重新导入
      const reImportEnglish = pipeline.parseSrt(englishSrt.content!)
      const reImportChinese = pipeline.parseSrt(chineseSrt.content!)

      expect(reImportEnglish.tracks[0].subtitles[0].text).toBe('Hello')
      expect(reImportChinese.tracks[0].subtitles[0].text).toBe('你好')
    })
  })

  describe('文件格式兼容性', () => {
    it('应该处理包含特殊字符的字幕文件', () => {
      const specialCharsSrt = `1
00:00:01,000 --> 00:00:04,000
Special: @#$%^&*()_+-=[]{}|;':",./<>?

2
00:00:05,000 --> 00:00:08,000
Unicode: 你好世界 🌍 こんにちは 🎬`

      const result = pipeline.parseSrt(specialCharsSrt)
      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toContain('@#$%')
      expect(result.tracks[0].subtitles[1].text).toContain('你好世界')
    })

    it('应该处理包含 HTML 标签的 VTT 文件', () => {
      const vttWithHtml = `WEBVTT

00:00:01.000 --> 00:00:04.000
<b>Bold</b> and <i>italic</i> text

00:00:05.000 --> 00:00:08.000
<v Speaker>Voice label</v>`

      const result = pipeline.parseVtt(vttWithHtml)
      expect(result.success).toBe(true)
      expect(result.tracks[0].subtitles[0].text).toBe('Bold and italic text')
      expect(result.tracks[0].subtitles[1].text).toBe('Voice label')
    })
  })
})

// ==================== FFmpeg 烧录集成测试 ====================

describe('FFmpeg 烧录集成测试', () => {
  let pipeline: SubtitlePipeline
  let ffmpegService: ReturnType<typeof createMockFFmpegService>

  beforeEach(() => {
    ffmpegService = createMockFFmpegService()
    pipeline = new SubtitlePipeline(ffmpegService)
  })

  describe('烧录流程', () => {
    it('应该成功烧录字幕到视频', async () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Burned Subtitle', 1, 4)],
        style: {
          fontSize: 28,
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      })

      // Mock FFmpeg exec 调用
      let capturedArgs: string[] = []
      ffmpegService.exec = async (args: string[]) => {
        capturedArgs = args
        return Promise.resolve()
      }

      const result = await pipeline.burnSubtitles({
        inputFile: 'input.mp4',
        outputFile: 'output.mp4',
        track,
      })

      expect(result.success).toBe(true)
      expect(result.outputFile).toBe('output.mp4')

      // 验证 FFmpeg 命令
      expect(capturedArgs).toContain('-i')
      expect(capturedArgs).toContain('input.mp4')
      expect(capturedArgs).toContain('output.mp4')
      expect(capturedArgs).toContain('-vf')
      expect(capturedArgs.some((arg) => arg.includes('subtitles='))).toBe(true)
    })

    it('应该传递自定义样式到 FFmpeg', async () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Styled', 1, 4)],
        style: {
          fontSize: 32,
          color: '#FFD700',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          bold: true,
        },
      })

      let capturedArgs: string[] = []
      ffmpegService.exec = async (args: string[]) => {
        capturedArgs = args
        return Promise.resolve()
      }

      await pipeline.burnSubtitles({
        inputFile: 'input.mp4',
        outputFile: 'output.mp4',
        track,
      })

      // 验证 force_style 参数
      const vfIndex = capturedArgs.indexOf('-vf')
      expect(vfIndex).not.toBe(-1)
      expect(capturedArgs[vfIndex + 1]).toContain('FontSize=32')
      expect(capturedArgs[vfIndex + 1]).toContain('PrimaryColour')
      expect(capturedArgs[vfIndex + 1]).toContain('Bold=1')
    })

    it('应该报告烧录进度', async () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Progress', 1, 4)],
      })

      const progressUpdates: number[] = []
      ffmpegService.exec = async (_args: string[], options?: { onProgress?: (p: number) => void }) => {
        // 模拟进度更新
        options?.onProgress?.(25)
        options?.onProgress?.(50)
        options?.onProgress?.(75)
        options?.onProgress?.(100)
        return Promise.resolve()
      }

      await pipeline.burnSubtitles({
        inputFile: 'input.mp4',
        outputFile: 'output.mp4',
        track,
        onProgress: (progress) => {
          progressUpdates.push(progress)
        },
      })

      expect(progressUpdates).toContain(25)
      expect(progressUpdates).toContain(50)
      expect(progressUpdates).toContain(75)
      expect(progressUpdates).toContain(100)
    })

    it('应该处理烧录失败', async () => {
      const track = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Test', 1, 4)],
      })

      ffmpegService.exec = async () => {
        throw new Error('FFmpeg execution failed')
      }

      const result = await pipeline.burnSubtitles({
        inputFile: 'input.mp4',
        outputFile: 'output.mp4',
        track,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

// ==================== 工作流集成测试 ====================

describe('工作流集成测试', () => {
  let pipeline: SubtitlePipeline

  beforeEach(() => {
    pipeline = new SubtitlePipeline(createMockFFmpegService())
  })

  describe('完整字幕工作流', () => {
    it('应该支持完整的字幕编辑工作流', () => {
      // 1. 导入现有字幕
      const existingSrt = `1
00:00:01,000 --> 00:00:04,000
Old subtitle`

      const imported = pipeline.parseSrt(existingSrt)
      expect(imported.success).toBe(true)

      // 2. 编辑字幕
      const edited = pipeline.updateSubtitle(
        imported.tracks[0],
        imported.tracks[0].subtitles[0].id,
        { text: 'Updated subtitle' }
      )

      // 3. 添加多个字幕
      let currentTrack = pipeline.addSubtitle(edited, 'Second', 5, 8)
      currentTrack = pipeline.addSubtitle(currentTrack, 'Third', 9, 12)

      // 4. 调整时间轴
      const shifted = pipeline.shiftAllSubtitles(currentTrack, 1)

      // 5. 验证
      expect(shifted.subtitles).toHaveLength(3)
      expect(shifted.subtitles[0].startTime).toBe(2)
      expect(shifted.subtitles[0].text).toBe('Updated subtitle')

      // 6. 导出
      const exported = pipeline.exportSrt(shifted)
      expect(exported.success).toBe(true)
      expect(exported.content).toContain('Updated subtitle')
      expect(exported.content).toContain('Second')
      expect(exported.content).toContain('Third')
    })

    it('应该支持多语言字幕工作流', () => {
      // 1. 创建多语言轨道
      const englishTrack = createSubtitleTrack('English', 'en', {
        subtitles: [
          createSubtitle('Hello', 1, 4),
          createSubtitle('World', 5, 8),
        ],
      })

      const chineseTrack = createSubtitleTrack('中文', 'zh', {
        subtitles: [
          createSubtitle('你好', 1, 4),
          createSubtitle('世界', 5, 8),
        ],
      })

      // 2. 同步时间轴调整
      const timeOffset = -1
      const shiftedEnglish = pipeline.shiftAllSubtitles(englishTrack, timeOffset)
      const shiftedChinese = pipeline.shiftAllSubtitles(chineseTrack, timeOffset)

      // 3. 验证同步
      expect(shiftedEnglish.subtitles[0].startTime).toBe(0)
      expect(shiftedChinese.subtitles[0].startTime).toBe(0)

      // 4. 分别导出
      const englishSrt = pipeline.exportSrt(shiftedEnglish)
      const chineseSrt = pipeline.exportSrt(shiftedChinese)

      expect(englishSrt.success).toBe(true)
      expect(chineseSrt.success).toBe(true)

      // 5. 验证内容
      expect(englishSrt.content).toContain('Hello')
      expect(chineseSrt.content).toContain('你好')
    })

    it('应该支持字幕样式继承和覆盖', () => {
      // 1. 创建轨道样式
      const trackStyle = {
        fontSize: 24,
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }

      const track = createSubtitleTrack('English', 'en', {
        subtitles: [
          createSubtitle('Default', 1, 4),
          createSubtitle('Custom', 5, 8, {
            style: {
              fontSize: 32,
              color: '#FFD700',
            },
          }),
        ],
        style: trackStyle,
      })

      // 2. 验证样式继承
      expect(track.subtitles[0].style?.fontSize).toBeUndefined() // 继承轨道样式
      expect(track.subtitles[1].style?.fontSize).toBe(32) // 自定义样式
    })
  })

  describe('错误处理和恢复', () => {
    it('应该处理无效导入并继续工作流', () => {
      // 1. 尝试导入无效文件
      const invalidContent = 'Not a valid subtitle file'
      const invalidResult = pipeline.parse(invalidContent)
      expect(invalidResult.success).toBe(false)

      // 2. 继续使用现有轨道
      const validTrack = createSubtitleTrack('English', 'en', {
        subtitles: [createSubtitle('Valid', 1, 4)],
      })

      // 3. 验证可以继续操作
      const edited = pipeline.updateSubtitle(validTrack, validTrack.subtitles[0].id, {
        text: 'Still valid',
      })
      expect(edited.subtitles[0].text).toBe('Still valid')
    })

    it('应该验证导出前的轨道状态', () => {
      const invalidTrack = createSubtitleTrack('', 'en', {
        subtitles: [createSubtitle('Test', 5, 4)], // 无效时间
      })

      const validation = pipeline.validateTrack(invalidTrack)
      expect(validation.valid).toBe(false)

      // 尽管无效，仍然可以导出
      const exportResult = pipeline.exportSrt(invalidTrack)
      expect(exportResult.success).toBe(true)
    })
  })
})

// ==================== 批量操作集成测试 ====================

describe('批量操作集成测试', () => {
  let pipeline: SubtitlePipeline

  beforeEach(() => {
    pipeline = new SubtitlePipeline(createMockFFmpegService())
  })

  describe('批量时间调整', () => {
    it('应该批量调整多个轨道的时间', () => {
      const track1 = createSubtitleTrack('Track 1', 'en', {
        subtitles: [
          createSubtitle('A', 1, 4),
          createSubtitle('B', 5, 8),
        ],
      })

      const track2 = createSubtitleTrack('Track 2', 'zh', {
        subtitles: [
          createSubtitle('C', 1, 4),
          createSubtitle('D', 5, 8),
        ],
      })

      // 批量移动
      const shifted1 = pipeline.shiftAllSubtitles(track1, 2)
      const shifted2 = pipeline.shiftAllSubtitles(track2, 2)

      expect(shifted1.subtitles[0].startTime).toBe(3)
      expect(shifted2.subtitles[0].startTime).toBe(3)
    })

    it('应该批量缩放多个轨道', () => {
      const track1 = createSubtitleTrack('Track 1', 'en', {
        subtitles: [createSubtitle('A', 10, 20)],
      })

      const track2 = createSubtitleTrack('Track 2', 'zh', {
        subtitles: [createSubtitle('B', 10, 20)],
      })

      const scaled1 = pipeline.scaleSubtitleTime(track1, 0.5)
      const scaled2 = pipeline.scaleSubtitleTime(track2, 0.5)

      expect(scaled1.subtitles[0].endTime - scaled1.subtitles[0].startTime).toBe(5)
      expect(scaled2.subtitles[0].endTime - scaled2.subtitles[0].startTime).toBe(5)
    })
  })

  describe('轨道合并', () => {
    it('应该合并多个轨道为一个', () => {
      const track1 = createSubtitleTrack('Track 1', 'en', {
        subtitles: [createSubtitle('A', 1, 4)],
      })

      const track2 = createSubtitleTrack('Track 2', 'zh', {
        subtitles: [createSubtitle('B', 2, 5)],
      })

      const merged = pipeline.mergeTracks([track1, track2])

      expect(merged.subtitles).toHaveLength(2)
      // 应该按时间排序
      expect(merged.subtitles[0].startTime).toBeLessThanOrEqual(
        merged.subtitles[1].startTime
      )
    })
  })
})

// ==================== 性能和压力测试 ====================

describe('性能和压力测试', () => {
  let pipeline: SubtitlePipeline

  beforeEach(() => {
    pipeline = new SubtitlePipeline(createMockFFmpegService())
  })

  it('应该处理大量字幕条目', () => {
    // 创建包含 1000 个字幕的轨道
    const subtitles = Array.from({ length: 1000 }, (_, i) => {
      const startTime = i * 2
      const endTime = startTime + 2
      return createSubtitle(`Subtitle ${i + 1}`, startTime, endTime)
    })

    const track = createSubtitleTrack('Large', 'en', { subtitles })

    // 验证性能
    const startTime = Date.now()
    const shifted = pipeline.shiftAllSubtitles(track, 10)
    const duration = Date.now() - startTime

    expect(shifted.subtitles).toHaveLength(1000)
    expect(duration).toBeLessThan(1000) // 应该在 1 秒内完成
  })

  it('应该处理大量轨道', () => {
    // 创建 50 个轨道
    const tracks = Array.from({ length: 50 }, (_, i) =>
      createSubtitleTrack(`Track ${i + 1}`, 'en', {
        subtitles: [createSubtitle(`T${i + 1}`, 1, 4)],
      })
    )

    // 批量启用/禁用
    let currentTracks = tracks
    currentTracks = currentTracks.map((t) => ({ ...t, enabled: false }))
    expect(currentTracks.every((t) => !t.enabled)).toBe(true)

    // 批量移动
    currentTracks = currentTracks.map((track) =>
      pipeline.shiftAllSubtitles(track, 5)
    )
    expect(currentTracks[0].subtitles[0].startTime).toBe(6)
  })

  it('应该在时间调整后正确排序字幕', () => {
    const track = createSubtitleTrack('English', 'en', {
      subtitles: [
        createSubtitle('Third', 10, 13),
        createSubtitle('First', 1, 4),
        createSubtitle('Second', 5, 8),
      ],
    })

    // 不需要排序，但应该正确识别字幕
    const activeAt2 = track.subtitles.find((s) => 2 >= s.startTime && 2 <= s.endTime)
    const activeAt6 = track.subtitles.find((s) => 6 >= s.startTime && 6 <= s.endTime)
    const activeAt11 = track.subtitles.find((s) => 11 >= s.startTime && 11 <= s.endTime)

    expect(activeAt2?.text).toBe('First')
    expect(activeAt6?.text).toBe('Second')
    expect(activeAt11?.text).toBe('Third')
  })
})
