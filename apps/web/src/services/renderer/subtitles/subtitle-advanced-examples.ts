/**
 * Phase 5 Day 34 高级功能使用示例
 *
 * 展示如何使用：
 * 1. OCR 字幕识别
 * 2. 字幕翻译
 * 3. 批量字幕操作
 * 4. 高级样式预设
 */

import { SubtitlePipeline } from './subtitle-pipeline'
import { SubtitleOcr, BrowserOcrEngine, WhisperOcrEngine } from './subtitle-ocr'
import { SubtitleTranslator, BrowserTranslationEngine, MockTranslationEngine } from './subtitle-translator'
import type { SubtitleTrack } from './subtitle-types'

// ==================== 示例 1: OCR 字幕识别 ====================

/**
 * 示例 1a: 使用浏览器原生 OCR
 *
 * 适用于浏览器环境，无需外部 API
 */
async function example1a_browserOcr() {
  console.log('=== 示例 1a: 浏览器原生 OCR ===')

  // 创建 OCR 识别器
  const ocr = new SubtitleOcr()

  // 检查支持的引擎
  const engines = ocr.getSupportedEngines()
  console.log('支持的 OCR 引擎:', engines)

  // 检查支持的语言
  const languages = ocr.getSupportedLanguages()
  console.log('支持的语言:', languages)

  // 注意: 浏览器 OCR 需要实际的视频文件
  // 这里展示用法:
  // const videoBlob = await fetch('/video.mp4').then(r => r.blob())
  // const result = await ocr.recognize({
  //   videoFile: videoBlob,
  //   language: 'zh-CN',
  //   engine: 'browser',
  //   onProgress: (progress) => console.log(`识别进度: ${progress}%`),
  // })
  //
  // if (result.success && result.track) {
  //   console.log('识别成功:', result.track.subtitles.length, '个字幕')
  // }
}

/**
 * 示例 1b: 使用 Whisper API
 *
 * 需要 OpenAI API 密钥
 */
async function example1b_whisperOcr() {
  console.log('=== 示例 1b: Whisper API OCR ===')

  const ocr = new SubtitleOcr()

  // 注册 Whisper 引擎
  ocr.registerEngine(
    new WhisperOcrEngine({
      apiKey: 'your-openai-api-key',
      // 或使用其他兼容 Whisper 的 API
      // apiEndpoint: 'https://your-whisper-api.com/v1/audio/transcriptions'
    })
  )

  // 识别视频
  // const videoBlob = await fetch('/video.mp4').then(r => r.blob())
  // const result = await ocr.recognize({
  //   videoFile: videoBlob,
  //   language: 'zh',
  //   engine: 'whisper',
  //   onProgress: (progress) => console.log(`识别进度: ${progress}%`),
  // })
}

// ==================== 示例 2: 字幕翻译 ====================

/**
 * 示例 2a: 使用模拟引擎进行测试
 */
async function example2a_mockTranslation() {
  console.log('=== 示例 2a: 模拟翻译（测试） ===')

  const translator = new SubtitleTranslator()

  // 创建测试轨道
  const track: SubtitleTrack = {
    id: 'test-track',
    name: 'Test',
    language: 'en',
    enabled: true,
    subtitles: [
      { id: '1', startTime: 0, endTime: 2, text: 'Hello World', style: {} },
      { id: '2', startTime: 2, endTime: 4, text: 'How are you?', style: {} },
      { id: '3', startTime: 4, endTime: 6, text: 'Goodbye', style: {} },
    ],
  }

  // 翻译为中文
  const result = await translator.translateTrack(track, {
    sourceLanguage: 'en',
    targetLanguage: 'zh',
    engine: 'mock',
    keepOriginal: true, // 保留原始文本
  })

  console.log('翻译统计:', result.stats)
  console.log('翻译结果:')
  result.subtitles.forEach(sub => {
    const original = sub.style.originalText as string | undefined
    console.log(`  ${original} → ${sub.text}`)
  })
}

/**
 * 示例 2b: 批量翻译多个轨道
 */
async function example2b_batchTranslation() {
  console.log('=== 示例 2b: 批量翻译 ===')

  const translator = new SubtitleTranslator()

  const tracks: SubtitleTrack[] = [
    {
      id: 'track-1',
      name: 'English',
      language: 'en',
      enabled: true,
      subtitles: [
        { id: '1', startTime: 0, endTime: 2, text: 'Hello', style: {} },
      ],
    },
    {
      id: 'track-2',
      name: 'Japanese',
      language: 'ja',
      enabled: true,
      subtitles: [
        { id: '1', startTime: 0, endTime: 2, text: 'こんにちは', style: {} },
      ],
    },
  ]

  // 批量翻译所有轨道为中文
  const results = await translator.translateBatch(tracks, {
    sourceLanguage: 'auto',
    targetLanguage: 'zh',
    engine: 'mock',
  })

  results.forEach((result, index) => {
    console.log(`轨道 ${index + 1}:`, result.stats)
  })
}

// ==================== 示例 3: 批量字幕操作 ====================

/**
 * 示例 3a: 批量时间调整
 */
function example3a_batchTimeShift() {
  console.log('=== 示例 3a: 批量时间偏移 ===')

  const pipeline = new SubtitlePipeline()

  const track: SubtitleTrack = {
    id: 'test',
    name: 'Test',
    language: 'en',
    enabled: true,
    subtitles: [
      { id: '1', startTime: 0, endTime: 2, text: 'First', style: {} },
      { id: '2', startTime: 2, endTime: 4, text: 'Second', style: {} },
      { id: '3', startTime: 4, endTime: 6, text: 'Third', style: {} },
    ],
  }

  // 所有字幕延后 1 秒
  const shifted = pipeline.shiftAllSubtitles(track, 1)
  console.log('偏移后:', shifted.subtitles.map(s => `${s.startTime}s - ${s.endTime}s`))

  // 所有字幕提前 0.5 秒
  const shiftedBack = pipeline.shiftAllSubtitles(shifted, -0.5)
  console.log('回退后:', shiftedBack.subtitles.map(s => `${s.startTime}s - ${s.endTime}s`))
}

/**
 * 示例 3b: 批量时间缩放
 */
function example3b_batchTimeScale() {
  console.log('=== 示例 3b: 批量时间缩放 ===')

  const pipeline = new SubtitlePipeline()

  const track: SubtitleTrack = {
    id: 'test',
    name: 'Test',
    language: 'en',
    enabled: true,
    subtitles: [
      { id: '1', startTime: 0, endTime: 2, text: 'First', style: {} },
      { id: '2', startTime: 2, endTime: 4, text: 'Second', style: {} },
    ],
  }

  // 时间轴加速到 1.5 倍
  const scaled = pipeline.scaleSubtitleTime(track, 1.5)
  console.log('缩放后:', scaled.subtitles.map(s => `${s.startTime.toFixed(2)}s - ${s.endTime.toFixed(2)}s`))
}

/**
 * 示例 3c: 批量文本替换
 */
function example3c_batchTextReplace() {
  console.log('=== 示例 3c: 批量文本替换 ===')

  const pipeline = new SubtitlePipeline()

  const track: SubtitleTrack = {
    id: 'test',
    name: 'Test',
    language: 'en',
    enabled: true,
    subtitles: [
      { id: '1', startTime: 0, endTime: 2, text: 'Hello World', style: {} },
      { id: '2', startTime: 2, endTime: 4, text: 'Hello There', style: {} },
      { id: '3', startTime: 4, endTime: 6, text: 'Goodbye World', style: {} },
    ],
  }

  // 批量替换 "Hello" → "Hi"
  const replaced = pipeline.replaceText(track, 'Hello', 'Hi')
  console.log('替换后:', replaced.subtitles.map(s => s.text))
}

/**
 * 示例 3d: 合并相邻字幕
 */
function example3d_mergeSubtitles() {
  console.log('=== 示例 3d: 合并字幕 ===')

  const pipeline = new SubtitlePipeline()

  const track: SubtitleTrack = {
    id: 'test',
    name: 'Test',
    language: 'en',
    enabled: true,
    subtitles: [
      { id: '1', startTime: 0, endTime: 2, text: 'Hello', style: {} },
      { id: '2', startTime: 2, endTime: 4, text: 'World', style: {} },
      { id: '3', startTime: 5, endTime: 7, text: 'How are', style: {} },
      { id: '4', startTime: 7, endTime: 9, text: 'you?', style: {} },
    ],
  }

  // 合并间隔小于 0.5 秒的字幕
  const merged = pipeline.mergeTracks([track], 0.5)
  console.log('合并后:', merged[0].subtitles.map(s => s.text))
}

// ==================== 示例 4: 验证字幕轨道 ====================

/**
 * 示例 4: 验证字幕质量
 */
function example4_validation() {
  console.log('=== 示例 4: 验证字幕 ===')

  const pipeline = new SubtitlePipeline()

  const track: SubtitleTrack = {
    id: 'test',
    name: 'Test',
    language: 'en',
    enabled: true,
    subtitles: [
      { id: '1', startTime: 0, endTime: 2, text: 'Valid', style: {} },
      { id: '2', startTime: 1, endTime: 3, text: 'Overlapping', style: {} }, // 重叠
      { id: '3', startTime: 5, endTime: 3, text: 'Invalid time', style: {} }, // 时间错误
    ],
  }

  const validation = pipeline.validateTrack(track)

  console.log('验证结果:')
  console.log('  有效:', validation.valid)
  console.log('  错误:', validation.errors)
  console.log('  警告:', validation.warnings)
}

// ==================== 示例 5: 完整工作流 ====================

/**
 * 示例 5: 字幕处理完整工作流
 */
async function example5_completeWorkflow() {
  console.log('=== 示例 5: 完整工作流 ===')

  const pipeline = new SubtitlePipeline()
  const translator = new SubtitleTranslator()

  // 1. 导入 SRT 字幕
  const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello World

2
00:00:05,000 --> 00:00:08,000
How are you?
`

  const parseResult = pipeline.parseSrt(srtContent)
  if (!parseResult.success) {
    console.error('解析失败:', parseResult.error)
    return
  }

  const track = parseResult.tracks[0]
  console.log('1. 导入成功:', track.subtitles.length, '个字幕')

  // 2. 时间轴调整（延后 0.5 秒）
  const shifted = pipeline.shiftAllSubtitles(track, 0.5)
  console.log('2. 时间偏移完成')

  // 3. 批量样式应用
  const styled = pipeline.applyStyle(shifted, {
    fontSize: 28,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.7)',
  })
  console.log('3. 样式应用完成')

  // 4. 翻译字幕
  const translated = await translator.translateTrack(styled, {
    sourceLanguage: 'en',
    targetLanguage: 'zh',
    engine: 'mock',
    keepOriginal: true,
  })
  console.log('4. 翻译完成:', translated.stats)

  // 5. 导出为 VTT
  const exportResult = pipeline.exportVtt(translated.track || track)
  if (exportResult.success) {
    console.log('5. 导出成功:', exportResult.content?.substring(0, 100), '...')
  }

  // 6. 验证最终轨道
  const validation = pipeline.validateTrack(translated.track || track)
  console.log('6. 验证结果:', validation.valid ? '通过' : '失败', validation.errors)
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('开始运行 Day 34 高级功能示例...\n')

  await example1a_browserOcr()
  console.log()

  await example1b_whisperOcr()
  console.log()

  await example2a_mockTranslation()
  console.log()

  await example2b_batchTranslation()
  console.log()

  example3a_batchTimeShift()
  console.log()

  example3b_batchTimeScale()
  console.log()

  example3c_batchTextReplace()
  console.log()

  example3d_mergeSubtitles()
  console.log()

  example4_validation()
  console.log()

  await example5_completeWorkflow()

  console.log('\n所有示例运行完成！')
}

// 如果在 Node.js 环境运行
if (typeof window === 'undefined') {
  runAllExamples().catch(console.error)
}
