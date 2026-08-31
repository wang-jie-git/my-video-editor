/**
 * 锐化滤镜实现
 *
 * 提供图像锐化功能
 */

import type { SharpenFilter } from './filter-types'

/**
 * 锐化滤镜类
 *
 * 提供锐化效果的纯函数实现
 */
export class Sharpen {
  /**
   * 创建锐化滤镜实例
   */
  constructor(private filter: SharpenFilter) {}

  /**
   * 获取滤镜参数
   */
  getParams(): SharpenFilter {
    return { ...this.filter }
  }

  /**
   * 更新滤镜参数
   */
  updateParams(updates: Partial<SharpenFilter>): SharpenFilter {
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

    if (this.filter.amount < 0 || this.filter.amount > 2) {
      errors.push(`锐化强度超出范围: ${this.filter.amount}（0 到 2）`)
    }

    if (this.filter.radius < 1 || this.filter.radius > 5) {
      errors.push(`半径超出范围: ${this.filter.radius}（1 到 5）`)
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
    return this.filter.amount > 0
  }

  /**
   * 重置为默认值
   */
  reset(): SharpenFilter {
    return {
      ...this.filter,
      amount: 0,
      radius: 1,
    }
  }

  /**
   * 应用预设
   */
  applyPreset(preset: 'light' | 'medium' | 'strong' | 'none'): SharpenFilter {
    const presets: Record<string, { amount: number; radius: number }> = {
      none: { amount: 0, radius: 1 },
      light: { amount: 0.5, radius: 1 },
      medium: { amount: 1, radius: 1.5 },
      strong: { amount: 1.8, radius: 2 },
    }

    const selectedPreset = presets[preset]
    if (!selectedPreset) {
      console.warn(`[Sharpen] 未知预设: ${preset}`)
      return this.filter
    }

    return {
      ...this.filter,
      ...selectedPreset,
    }
  }
}
