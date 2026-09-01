/**
 * 字幕使用示例
 *
 * 展示如何使用字幕解析、编辑和导出功能
 */

import { SubtitlePipeline } from './subtitle-pipeline'
import { FFmpegService } from '@/services/renderer/ffmpeg/ffmpeg-service'
import type { SubtitleTrack, SubtitleStyle } from './subtitle-types'

// ==================== 示例 1: 解析 SRT 字幕 ====================

/**
 * 示例 1: 解析 SRT 字幕文件
 */
export function example1_parseSrt() {
  console.log('示例 1: 解析 SRT 字幕')

  const pipeline = new SubtitlePipeline(null as any)
  const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello World

2
00:00:05,000 --> 00:00:08,000
This is a test`

  const result = pipeline.parseSrt(srtContent)

  if (result.success) {
    console.log('✅ 解析成功:', result.tracks[0].subtitles.length, '个字幕')
    result.tracks[0].subtitles.forEach((sub) => {
      console.log(`  ${sub.startTime}s - ${sub.endTime}s: ${sub.text}`)
    })
  } else {
    console.error('❌ 解析失败:', result.error)
  }
}

// ==================== 示例 2: 解析 VTT 字幕 ====================

/**
 * 示例 2: 解析 VTT 字幕文件
 */
export function example2_parseVtt() {
  console.log('示例 2: 解析 VTT 字幕')

  const pipeline = new SubtitlePipeline(null as any)
  const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello World

00:00:05.000 --> 00:00:08.000
This is a test`

  const result = pipeline.parseVtt(vttContent)

  if (result.success) {
    console.log('✅ 解析成功:', result.tracks[0].subtitles.length, '个字幕')
    console.log('格式:', result.format)
  } else {
    console.error('❌ 解析失败:', result.error)
  }
}

// ==================== 示例 3: 自动格式检测 ====================

/**
 * 示例 3: 自动检测字幕格式
 */
export function example3_autoDetect() {
  console.log('示例 3: 自动格式检测')

  const pipeline = new SubtitlePipeline(null as any)

  // SRT 格式
  const srtContent = `1
00:00:01,000 --> 00:00:04,000
SRT format`

  const srtResult = pipeline.parse(srtContent)
  console.log('SRT 格式:', srtResult.format)

  // VTT 格式
  const vttContent = `WEBVTT

00:00:01.000 --> 00:00:04.000
VTT format`

  const vttResult = pipeline.parse(vttContent)
  console.log('VTT 格式:', vttResult.format)
}

// ==================== 示例 4: 导出字幕 ====================

/**
 * 示例 4: 导出字幕为 SRT 或 VTT
 */
export function example4_export() {
  console.log('示例 4: 导出字幕')

  const pipeline = new SubtitlePipeline(null as any)

  const track: SubtitleTrack = {
    id: 'track-1',
    name: 'English',
    language: 'en',
    enabled: true,
    subtitles: [
      {
        id: 'sub-1',
        text: 'Hello World',
        startTime: 1,
        endTime: 4,
      },
      {
        id: 'sub-2',
        text: 'Test Subtitle',
        startTime: 5,
        endTime: 8,
      },
    ],
    style: {},
  }

  // 导出为 SRT
  const srtResult = pipeline.exportSrt(track)
  if (srtResult.success) {
    console.log('✅ SRT 导出成功:')
    console.log(srtResult.content)
  }

  // 导出为 VTT
  const vttResult = pipeline.exportVtt(track)
  if (vttResult.success) {
    console.log('✅ VTT 导出成功:')
    console.log(vttResult.content)
  }
}

// ==================== 示例 5: 编辑字幕 ====================

/**
 * 示例 5: 添加、编辑和删除字幕
 */
export function example5_editSubtitles() {
  console.log('示例 5: 编辑字幕')

  const pipeline = new SubtitlePipeline(null as any)

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

  // 添加字幕
  let newTrack = pipeline.addSubtitle(track, 'World', 5, 8)
  console.log('添加后:', newTrack.subtitles.length, '个字幕')

  // 更新字幕
  newTrack = pipeline.updateSubtitle(newTrack, 'sub-1', { text: 'Hi' })
  console.log('更新后:', newTrack.subtitles[0].text)

  // 移除字幕
  newTrack = pipeline.removeSubtitle(newTrack, 'sub-2')
  console.log('删除后:', newTrack.subtitles.length, '个字幕')
}

// ==================== 示例 6: 调整时间轴 ====================

/**
 * 示例 6: 调整字幕时间轴
 */
export function example6_adjustTimeline() {
  console.log('示例 6: 调整时间轴')

  const pipeline = new SubtitlePipeline(null as any)

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

  // 移动字幕时间（+2秒）
  let shifted = pipeline.shiftSubtitleTime(track, 'sub-1', 2)
  console.log('移动后:', shifted.subtitles[0].startTime, '-', shifted.subtitles[0].endTime)

  // 批量移动（-1秒）
  shifted = pipeline.shiftAllSubtitles(shifted, -1)
  console.log('批量移动后:', shifted.subtitles[0].startTime, '-', shifted.subtitles[0].endTime)

  // 缩放时间（2倍速）
  const scaled = pipeline.scaleSubtitleTime(track, 2)
  console.log('缩放后:', scaled.subtitles[0].startTime, '-', scaled.subtitles[0].endTime)
}

// ==================== 示例 7: 烧录字幕到视频 ====================

/**
 * 示例 7: 烧录字幕到视频
 */
export async function example7_burnSubtitles() {
  console.log('示例 7: 烧录字幕到视频')

  const ffmpegService = new FFmpegService()
  const pipeline = new SubtitlePipeline(ffmpegService)

  const track: SubtitleTrack = {
    id: 'track-1',
    name: 'English',
    language: 'en',
    enabled: true,
    subtitles: [
      {
        id: 'sub-1',
        text: 'Hello World',
        startTime: 1,
        endTime: 4,
      },
    ],
    style: {
      fontSize: 28,
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
  }

  const result = await pipeline.burnSubtitles({
    inputFile: 'input.mp4',
    outputFile: 'output_with_subtitles.mp4',
    track,
    onProgress: (progress) => {
      console.log(`烧录进度: ${progress}%`)
    },
  })

  if (result.success) {
    console.log('✅ 字幕烧录成功:', result.outputFile)
  } else {
    console.error('❌ 烧录失败:', result.error)
  }
}

// ==================== 示例 8: 自定义字幕样式 ====================

/**
 * 示例 8: 使用自定义字幕样式
 */
export function example8_customStyles() {
  console.log('示例 8: 自定义字幕样式')

  const pipeline = new SubtitlePipeline(null as any)

  const customStyle: SubtitleStyle = {
    font: 'Arial',
    fontSize: 32,
    color: '#FFD700', // 金色
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: '#000000',
    borderWidth: 2,
    bold: true,
    position: 'bottom',
    align: 'center',
    shadow: {
      color: '#000000',
      blur: 6,
      x: 2,
      y: 2,
    },
  }

  const track: SubtitleTrack = {
    id: 'track-1',
    name: 'Styled',
    language: 'en',
    enabled: true,
    subtitles: [
      {
        id: 'sub-1',
        text: 'Styled Subtitle',
        startTime: 1,
        endTime: 4,
        style: customStyle,
      },
    ],
    style: customStyle,
  }

  // 导出为 VTT（包含样式）
  const result = pipeline.exportVtt(track)

  if (result.success) {
    console.log('✅ 导出成功:')
    console.log(result.content)
  }
}

// ==================== 示例 9: 多轨道管理 ====================

/**
 * 示例 9: 多语言字幕轨道
 */
export function example9_multipleTracks() {
  console.log('示例 9: 多语言字幕轨道')

  const pipeline = new SubtitlePipeline(null as any)

  // 创建多个轨道
  let tracks: SubtitleTrack[] = []

  // 英文轨道
  tracks = pipeline.addTrack(tracks, {
    id: 'track-en',
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
  })

  // 中文轨道
  tracks = pipeline.addTrack(tracks, {
    id: 'track-zh',
    name: '中文',
    language: 'zh',
    enabled: false,
    subtitles: [
      {
        id: 'sub-2',
        text: '你好',
        startTime: 1,
        endTime: 4,
      },
    ],
    style: {},
  })

  console.log('轨道数量:', tracks.length)
  console.log('启用的轨道:', tracks.filter((t) => t.enabled).length)

  // 切换轨道
  tracks = pipeline.toggleTrack(tracks, 'track-zh')
  console.log('切换后启用的轨道:', tracks.filter((t) => t.enabled).length)
}

// ==================== 示例 10: 验证字幕 ====================

/**
 * 示例 10: 验证字幕轨道
 */
export function example10_validation() {
  console.log('示例 10: 验证字幕轨道')

  const pipeline = new SubtitlePipeline(null as any)

  const track: SubtitleTrack = {
    id: 'track-1',
    name: '', // 空名称
    language: 'en',
    enabled: true,
    subtitles: [
      {
        id: 'sub-1',
        text: 'Hello',
        startTime: 5,
        endTime: 4, // 无效时间
      },
    ],
    style: {},
  }

  const validation = pipeline.validateTrack(track)

  if (!validation.valid) {
    console.log('❌ 验证失败:', validation.errors)
  } else {
    console.log('✅ 验证通过')
  }
}

// ==================== 运行所有示例 ====================

/**
 * 运行所有示例
 */
export function runAllExamples() {
  console.log('🚀 开始运行所有字幕示例\n')

  example1_parseSrt()
  console.log()

  example2_parseVtt()
  console.log()

  example3_autoDetect()
  console.log()

  example4_export()
  console.log()

  example5_editSubtitles()
  console.log()

  example6_adjustTimeline()
  console.log()

  example7_burnSubtitles()
  console.log()

  example8_customStyles()
  console.log()

  example9_multipleTracks()
  console.log()

  example10_validation()
  console.log()

  console.log('✨ 所有示例运行完成！')
}
