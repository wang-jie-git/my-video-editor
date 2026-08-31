/**
 * 字幕 OCR 识别服务
 *
 * 使用浏览器原生能力或外部 API 识别视频中的字幕
 * 支持多种 OCR 引擎和语言
 */

import type { SubtitleTrack, Subtitle } from './subtitle-types'

// 扩展 Window 接口以支持 SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

export interface OcrRecognitionOptions {
  /** 视频文件 */
  videoFile: File | Blob
  /** 语言代码（如 'en', 'zh', 'ja'） */
  language?: string
  /** 识别引擎 */
  engine?: 'browser' | 'whisper' | 'google' | 'azure'
  /** 时间片段（秒），用于分批识别 */
  startTime?: number
  endTime?: number
  /** 进度回调 */
  onProgress?: (progress: number) => void
}

export interface OcrResult {
  /** 是否成功 */
  success: boolean
  /** 识别到的字幕轨道 */
  track?: SubtitleTrack
  /** 错误信息 */
  error?: string
  /** 原始识别数据 */
  rawData?: unknown[]
}

export interface OcrEngine {
  /** 引擎名称 */
  name: string
  /** 识别 */
  recognize(options: OcrRecognitionOptions): Promise<OcrResult>
  /** 是否支持该语言 */
  supportsLanguage(language: string): boolean
}

/**
 * 浏览器原生 OCR 引擎
 *
 * 使用 Web Speech API 进行语音识别
 * 适用于浏览器环境，无需外部 API
 */
export class BrowserOcrEngine implements OcrEngine {
  name = 'browser'
  private recognition: SpeechRecognition | null = null

  constructor() {
    // 检查浏览器支持
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Browser does not support SpeechRecognition API')
    }
  }

  supportsLanguage(language: string): boolean {
    // 浏览器原生 OCR 支持常见语言
    const supportedLanguages = ['en-US', 'en-GB', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'es-ES', 'fr-FR', 'de-DE']
    return supportedLanguages.some(lang => lang.startsWith(language))
  }

  async recognize(options: OcrRecognitionOptions): Promise<OcrResult> {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      return {
        success: false,
        error: '浏览器不支持语音识别 API',
      }
    }

    try {
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = options.language || 'en-US'

      const subtitles: Subtitle[] = []
      let startTime = options.startTime || 0
      let currentText = ''
      let resultCount = 0

      return new Promise((resolve) => {
        this.recognition!.onresult = (event) => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            const endTime = Date.now() / 1000

            subtitles.push({
              id: `ocr-${Date.now()}-${resultCount}`,
              startTime,
              endTime,
              text: finalTranscript.trim(),
              style: {},
            })

            startTime = endTime
            currentText = ''
            resultCount++

            // 报告进度
            if (options.onProgress) {
              options.onProgress(Math.min(resultCount * 10, 90))
            }
          } else {
            currentText = interimTranscript
          }
        }

        this.recognition!.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          resolve({
            success: false,
            error: `语音识别失败: ${event.error}`,
            rawData: subtitles,
          })
        }

        this.recognition!.onend = () => {
          if (options.onProgress) {
            options.onProgress(100)
          }

          if (subtitles.length === 0) {
            resolve({
              success: false,
              error: '未识别到任何字幕内容',
            })
            return
          }

          resolve({
            success: true,
            track: {
              id: `ocr-track-${Date.now()}`,
              name: 'OCR 识别轨道',
              language: options.language || 'auto',
              enabled: true,
              subtitles,
              style: {},
            },
            rawData: subtitles,
          })
        }

        this.recognition!.start()

        // 设置超时（5 分钟）
        setTimeout(() => {
          if (this.recognition) {
            this.recognition.stop()
          }
        }, 5 * 60 * 1000)
      })
    } catch (error) {
      return {
        success: false,
        error: `OCR 识别失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop()
      this.recognition = null
    }
  }
}

/**
 * Whisper API 引擎
 *
 * 使用 OpenAI Whisper 或其他兼容 API 进行高精度识别
 */
export class WhisperOcrEngine implements OcrEngine {
  name = 'whisper'
  private apiKey: string
  private apiEndpoint: string

  constructor(config: { apiKey: string; apiEndpoint?: string }) {
    this.apiKey = config.apiKey
    this.apiEndpoint = config.apiEndpoint || 'https://api.openai.com/v1/audio/transcriptions'
  }

  supportsLanguage(_language: string): boolean {
    // Whisper 支持 99 种语言
    return true
  }

  async recognize(options: OcrRecognitionOptions): Promise<OcrResult> {
    try {
      // 将视频文件转换为音频（简化版本，实际需要完整的视频处理）
      // 这里假设已经有音频文件或视频的第一帧
      const formData = new FormData()
      formData.append('file', options.videoFile)
      formData.append('model', 'whisper-1')
      formData.append('language', options.language || '')
      formData.append('response_format', 'verbose_json')
      formData.append('timestamp_granularities[]', 'segment')

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: `Whisper API 错误: ${error.error?.message || response.statusText}`,
        }
      }

      const data = await response.json()

      if (!data.segments || data.segments.length === 0) {
        return {
          success: false,
          error: '未识别到任何字幕内容',
        }
      }

      const subtitles: Subtitle[] = data.segments.map((segment: { id: number; start: number; end: number; text: string }) => ({
        id: `whisper-${segment.id}`,
        startTime: segment.start,
        endTime: segment.end,
        text: segment.text.trim(),
        style: {},
      }))

      if (options.onProgress) {
        options.onProgress(100)
      }

      return {
        success: true,
        track: {
          id: `whisper-track-${Date.now()}`,
          name: 'Whisper 识别轨道',
          language: data.language || options.language || 'auto',
          enabled: true,
          subtitles,
          style: {},
        },
        rawData: data,
      }
    } catch (error) {
      return {
        success: false,
        error: `Whisper 识别失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }
}

/**
 * 字幕 OCR 识别器
 *
 * 提供统一的 OCR 识别接口
 */
export class SubtitleOcr {
  private engines: Map<string, OcrEngine> = new Map()

  constructor() {
    // 注册浏览器原生引擎
    this.registerEngine(new BrowserOcrEngine())
  }

  /**
   * 注册 OCR 引擎
   */
  registerEngine(engine: OcrEngine): void {
    this.engines.set(engine.name, engine)
  }

  /**
   * 使用指定引擎识别字幕
   */
  async recognize(options: OcrRecognitionOptions): Promise<OcrResult> {
    const engine = this.engines.get(options.engine || 'browser')

    if (!engine) {
      return {
        success: false,
        error: `未知的 OCR 引擎: ${options.engine}`,
      }
    }

    if (!engine.supportsLanguage(options.language || 'en')) {
      return {
        success: false,
        error: `引擎 ${engine.name} 不支持语言: ${options.language}`,
      }
    }

    return engine.recognize(options)
  }

  /**
   * 获取支持的引擎列表
   */
  getSupportedEngines(): string[] {
    return Array.from(this.engines.keys())
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(engineName?: string): string[] {
    const engine = engineName ? this.engines.get(engineName) : this.engines.values().next().value
    if (!engine) return []

    // 返回常见语言列表
    return [
      { code: 'en', name: 'English' },
      { code: 'zh', name: '中文' },
      { code: 'ja', name: '日本語' },
      { code: 'ko', name: '한국어' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'ru', name: 'Русский' },
      { code: 'pt', name: 'Português' },
      { code: 'ar', name: 'العربية' },
    ].map(l => l.code)
  }

  /**
   * 停止正在进行的识别
   */
  stop(): void {
    this.engines.forEach(engine => {
      if (engine instanceof BrowserOcrEngine) {
        engine.stop()
      }
    })
  }
}
