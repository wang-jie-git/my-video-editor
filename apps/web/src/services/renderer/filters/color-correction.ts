/**
 * 颜色校正滤镜实现
 *
 * 提供亮度、对比度、饱和度、色相调整功能
 */

import type { ColorCorrectionFilter } from './filter-types'

/**
 * 颜色校正滤镜类
 *
 * 提供颜色调整的纯函数实现
 */
export class ColorCorrection {
  /**
   * 创建颜色校正滤镜实例
   */
  constructor(private filter: ColorCorrectionFilter) {}

  /**
   * 获取滤镜参数
   */
  getParams(): ColorCorrectionFilter {
    return { ...this.filter }
  }

  /**
   * 更新滤镜参数
   */
  updateParams(updates: Partial<ColorCorrectionFilter>): ColorCorrectionFilter {
    return {
      ...this.filter,
      ...updates,
    }
  }

  /**
   * 验证参数是否有效
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (this.filter.brightness < -1 || this.filter.brightness > 1) {
      errors.push(`亮度超出范围: ${this.filter.brightness}（-1 到 1）`)
    }

    if (this.filter.contrast < 0 || this.filter.contrast > 2) {
      errors.push(`对比度超出范围: ${this.filter.contrast}（0 到 2）`)
    }

    if (this.filter.saturation < 0 || this.filter.saturation > 2) {
      errors.push(`饱和度超出范围: ${this.filter.saturation}（0 到 2）`)
    }

    if (this.filter.hue < -180 || this.filter.hue > 180) {
      errors.push(`色相超出范围: ${this.filter.hue}（-180 到 180）`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 检查滤镜是否有实际效果
   */
  hasEffect(): boolean {
    return (
      this.filter.brightness !== 0 ||
      this.filter.contrast !== 1 ||
      this.filter.saturation !== 1 ||
      this.filter.hue !== 0
    )
  }

  /**
   * 重置为默认值
   */
  reset(): ColorCorrectionFilter {
    return {
      ...this.filter,
      brightness: 0,
      contrast: 1,
      saturation: 1,
      hue: 0,
    }
  }

  /**
   * 应用预设
   */
  applyPreset(preset: 'default' | 'vivid' | 'muted' | 'warm' | 'cool' | 'vintage' | 'dramatic'): ColorCorrectionFilter {
    const presets: Record<string, Partial<ColorCorrectionFilter>> = {
      default: { brightness: 0, contrast: 1, saturation: 1, hue: 0 },
      vivid: { brightness: 5, contrast: 1.2, saturation: 1.3, hue: 0 },
      muted: { brightness: 0, contrast: 0.9, saturation: 0.7, hue: 0 },
      warm: { brightness: 3, contrast: 1.1, saturation: 1.1, hue: -10 },
      cool: { brightness: 0, contrast: 1.05, saturation: 1.05, hue: 15 },
      vintage: { brightness: 5, contrast: 0.85, saturation: 0.7, hue: 20 },
      dramatic: { brightness: -5, contrast: 1.5, saturation: 1.2, hue: 0 },
    }

    const selectedPreset = presets[preset]
    if (!selectedPreset) {
      console.warn(`[ColorCorrection] 未知预设: ${preset}`)
      return this.filter
    }

    return {
      ...this.filter,
      ...selectedPreset,
    }
  }
}
