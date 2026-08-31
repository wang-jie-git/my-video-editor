/**
 * 模糊滤镜实现
 *
 * 提供高斯模糊、方框模糊、运动模糊功能
 */

import type { BlurFilter } from './filter-types'

/**
 * 模糊滤镜类
 *
 * 提供模糊效果的纯函数实现
 */
export class Blur {
  /**
   * 创建模糊滤镜实例
   */
  constructor(private filter: BlurFilter) {}

  /**
   * 获取滤镜参数
   */
  getParams(): BlurFilter {
    return { ...this.filter }
  }

  /**
   * 更新滤镜参数
   */
  updateParams(updates: Partial<BlurFilter>): BlurFilter {
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

    if (this.filter.strength < 0 || this.filter.strength > 20) {
      errors.push(`模糊强度超出范围: ${this.filter.strength}（0 到 20）`)
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
    return this.filter.strength > 0
  }

  /**
   * 重置为默认值
   */
  reset(): BlurFilter {
    return {
      ...this.filter,
      strength: 0,
    }
  }

  /**
   * 应用预设
   */
  applyPreset(preset: 'light' | 'medium' | 'strong' | 'none' | 'box'): BlurFilter {
    const presets: Record<string, { strength: number; blurType?: BlurFilter['blurType'] }> = {
      none: { strength: 0 },
      light: { strength: 3 },
      medium: { strength: 8 },
      strong: { strength: 15 },
      box: { strength: 10, blurType: 'box' },
    }

    const selectedPreset = presets[preset]
    if (!selectedPreset) {
      console.warn(`[Blur] 未知预设: ${preset}`)
      return this.filter
    }

    return {
      ...this.filter,
      ...selectedPreset,
    }
  }

  /**
   * 切换模糊类型
   */
  setBlurType(blurType: BlurFilter['blurType']): BlurFilter {
    return {
      ...this.filter,
      blurType,
    }
  }
}
