/**
 * LUT (Lookup Table) 滤镜实现
 *
 * 提供 3D LUT 色彩映射功能
 */

import type { LutFilter } from './filter-types'

/**
 * LUT 滤镜类
 *
 * 提供 LUT 应用的纯函数实现
 */
export class LutFilterImpl {
  /**
   * 创建 LUT 滤镜实例
   */
  constructor(private filter: LutFilter) {}

  /**
   * 获取滤镜参数
   */
  getParams(): LutFilter {
    return { ...this.filter }
  }

  /**
   * 更新滤镜参数
   */
  updateParams(updates: Partial<LutFilter>): LutFilter {
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

    if (this.filter.intensity < 0 || this.filter.intensity > 1) {
      errors.push(`LUT 强度超出范围: ${this.filter.intensity}（0 到 1）`)
    }

    if (!this.filter.lutFile && !this.filter.lutData) {
      errors.push('LUT 文件或数据必须指定')
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
    return this.filter.intensity > 0 && !!(this.filter.lutFile || this.filter.lutData)
  }

  /**
   * 重置为默认值
   */
  reset(): LutFilter {
    return {
      ...this.filter,
      intensity: 0,
    }
  }

  /**
   * 设置 LUT 文件
   */
  setLutFile(lutFile: string): LutFilter {
    return {
      ...this.filter,
      lutFile,
      lutData: undefined,
    }
  }

  /**
   * 设置 LUT 数据
   */
  setLutData(lutData: string): LutFilter {
    return {
      ...this.filter,
      lutData,
      lutFile: undefined,
    }
  }

  /**
   * 应用预设强度
   */
  applyPreset(preset: 'none' | 'light' | 'medium' | 'full'): LutFilter {
    const presets: Record<string, { intensity: number }> = {
      none: { intensity: 0 },
      light: { intensity: 0.25 },
      medium: { intensity: 0.5 },
      full: { intensity: 1 },
    }

    const selectedPreset = presets[preset]
    if (!selectedPreset) {
      console.warn(`[LutFilter] 未知预设: ${preset}`)
      return this.filter
    }

    return {
      ...this.filter,
      ...selectedPreset,
    }
  }

  /**
   * 获取 LUT 文件名
   */
  getLutFileName(): string | undefined {
    if (this.filter.lutFile) {
      const parts = this.filter.lutFile.split('/')
      return parts[parts.length - 1]
    }
    return undefined
  }

  /**
   * 检查是否使用内嵌数据
   */
  usesEmbeddedData(): boolean {
    return !!this.filter.lutData
  }
}
