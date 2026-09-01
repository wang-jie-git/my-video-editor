/**
 * 字幕翻译服务
 *
 * 支持多种翻译引擎和语言
 * 包括批量翻译和增量翻译
 */

import type { Subtitle, SubtitleTrack } from './subtitle-types'

export interface TranslationOptions {
  /** 源语言代码（如 'en', 'zh'） */
  sourceLanguage: string
  /** 目标语言代码（如 'zh', 'en'） */
  targetLanguage: string
  /** 翻译引擎 */
  engine?: 'browser' | 'google' | 'azure' | 'deepl' | 'openai' | 'mock'
  /** 是否保留原始文本 */
  keepOriginal?: boolean
  /** API 密钥（用于外部引擎） */
  apiKey?: string
}

export interface TranslationResult {
  /** 翻译后的字幕 */
  subtitles: Subtitle[]
  /** 翻译统计 */
  stats: {
    total: number
    success: number
    failed: number
  }
  /** 错误信息 */
  error?: string
}

export interface TranslationEngine {
  /** 引擎名称 */
  name: string
  /** 翻译文本 */
  translate(text: string, options: TranslationOptions): Promise<string>
  /** 批量翻译 */
  translateBatch(texts: string[], options: TranslationOptions): Promise<string[]>
  /** 是否支持该语言对 */
  supportsLanguagePair(source: string, target: string): boolean
}

/**
 * 浏览器内置翻译引擎
 *
 * 使用浏览器原生的翻译能力（如果有）
 */
export class BrowserTranslationEngine implements TranslationEngine {
  name = 'browser'

  constructor() {
    // 检查浏览器是否支持翻译
    if (!('translator' in self)) {
      console.warn('Browser does not support built-in translation')
    }
  }

  supportsLanguagePair(_source: string, _target: string): boolean {
    // 浏览器原生翻译通常支持大多数语言
    return true
  }

  async translate(text: string, _options: TranslationOptions): Promise<string> {
    // 浏览器原生翻译 API（实验性）
    const translator = (self as unknown as { translator?: { availableLanguages: Set<string>; translate: (text: string, sourceLang: string, targetLang: string) => Promise<string> } }).translator

    if (!translator) {
      throw new Error('浏览器不支持原生翻译 API')
    }

    const result = await translator.translate(text, _options.sourceLanguage, _options.targetLanguage)
    return result
  }

  async translateBatch(texts: string[], options: TranslationOptions): Promise<string[]> {
    return Promise.all(texts.map(text => this.translate(text, options)))
  }
}

/**
 * 模拟翻译引擎（用于测试）
 */
export class MockTranslationEngine implements TranslationEngine {
  name = 'mock'
  private delay: number

  constructor(delay: number = 100) {
    this.delay = delay
  }

  supportsLanguagePair(_source: string, _target: string): boolean {
    return true
  }

  async translate(text: string, _options: TranslationOptions): Promise<string> {
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, this.delay))

    // 简单的前缀模拟翻译
    const prefix = _options.targetLanguage === 'zh' ? '[中] ' : _options.targetLanguage === 'ja' ? '[日] ' : `[${_options.targetLanguage.toUpperCase()}] `
    return prefix + text
  }

  async translateBatch(texts: string[], options: TranslationOptions): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, this.delay * texts.length))
    return Promise.all(texts.map(text => this.translate(text, options)))
  }
}

/**
 * 字幕翻译器
 *
 * 提供统一的翻译接口
 */
export class SubtitleTranslator {
  private engines: Map<string, TranslationEngine> = new Map()

  constructor() {
    // 注册模拟引擎（用于测试）
    this.registerEngine(new MockTranslationEngine(50))
  }

  /**
   * 注册翻译引擎
   */
  registerEngine(engine: TranslationEngine): void {
    this.engines.set(engine.name, engine)
  }

  /**
   * 翻译单个字幕轨道
   */
  async translateTrack(track: SubtitleTrack, options: TranslationOptions): Promise<TranslationResult> {
    const engine = this.engines.get(options.engine || 'mock')

    if (!engine) {
      return {
        subtitles: track.subtitles,
        stats: { total: 0, success: 0, failed: track.subtitles.length },
        error: `未知的翻译引擎: ${options.engine}`,
      }
    }

    try {
      const texts = track.subtitles.map(s => s.text)
      const translatedTexts = await engine.translateBatch(texts, options)

      const subtitles: Subtitle[] = track.subtitles.map((subtitle, index) => ({
        ...subtitle,
        id: `translated-${subtitle.id}`,
        text: translatedTexts[index] || subtitle.text,
        style: {
          ...subtitle.style,
          translated: true,
          originalText: options.keepOriginal ? subtitle.text : undefined,
        },
      }))

      const failedCount = translatedTexts.filter((_, index) => !translatedTexts[index]).length

      return {
        subtitles,
        stats: {
          total: track.subtitles.length,
          success: track.subtitles.length - failedCount,
          failed: failedCount,
        },
      }
    } catch (error) {
      return {
        subtitles: track.subtitles,
        stats: { total: track.subtitles.length, success: 0, failed: track.subtitles.length },
        error: `翻译失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 翻译单个字幕
   */
  async translateSubtitle(subtitle: Subtitle, options: TranslationOptions): Promise<Subtitle> {
    const engine = this.engines.get(options.engine || 'mock')

    if (!engine) {
      throw new Error(`未知的翻译引擎: ${options.engine}`)
    }

    const translatedText = await engine.translate(subtitle.text, options)

    return {
      ...subtitle,
      id: `translated-${subtitle.id}`,
      text: translatedText,
      style: {
        ...subtitle.style,
        translated: true,
        originalText: options.keepOriginal ? subtitle.text : undefined,
      },
    }
  }

  /**
   * 批量翻译多个轨道
   */
  async translateBatch(tracks: SubtitleTrack[], options: TranslationOptions): Promise<TranslationResult[]> {
    return Promise.all(tracks.map(track => this.translateTrack(track, options)))
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
  getSupportedLanguages(): { code: string; name: string }[] {
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
      { code: 'it', name: 'Italiano' },
      { code: 'nl', name: 'Nederlands' },
    ]
  }
}

/**
 * 语言检测
 */
export function detectLanguage(text: string): string {
  // 简化的语言检测逻辑
  // 实际实现应使用专业的语言检测库

  // 中文字符范围
  const chineseRegex = /[一-鿿]/
  // 日文字符范围
  const japaneseRegex = /[぀-ヿ㐀-䶿]/
  // 韩文字符范围
  const koreanRegex = /[가-힯ᄀ-ᇿ]/
  // 西里尔字母（俄语）
  const cyrillicRegex = /[Ѐ-ӿ]/
  // 阿拉伯文字
  const arabicRegex = /[؀-ۿ]/

  if (chineseRegex.test(text)) return 'zh'
  if (japaneseRegex.test(text)) return 'ja'
  if (koreanRegex.test(text)) return 'ko'
  if (cyrillicRegex.test(text)) return 'ru'
  if (arabicRegex.test(text)) return 'ar'

  // 默认为英文
  return 'en'
}
