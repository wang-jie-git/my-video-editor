/**
 * 视频滤镜工具函数
 *
 * 提供滤镜预设、工厂函数和快捷方法
 */

import type {
  VideoFilter,
  ColorCorrectionFilter,
  BlurFilter,
  SharpenFilter,
  LutFilter,
  FilterChain,
} from './filter-types'

// 全局计数器用于生成唯一 ID
let filterCounter = 0

/**
 * 生成唯一 ID
 */
function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++filterCounter}`
}

/**
 * 创建颜色校正滤镜
 */
export function createColorCorrectionFilter(
  overrides: Partial<ColorCorrectionFilter> = {}
): ColorCorrectionFilter {
  return {
    id: generateUniqueId('color-correction'),
    name: '颜色校正',
    description: '调整亮度、对比度、饱和度和色相',
    type: 'color-correction',
    enabled: true,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    hue: 0,
    ...overrides,
  }
}

/**
 * 创建模糊滤镜
 */
export function createBlurFilter(overrides: Partial<BlurFilter> = {}): BlurFilter {
  return {
    id: generateUniqueId('blur'),
    name: '模糊',
    description: '应用模糊效果',
    type: 'blur',
    enabled: true,
    strength: 5,
    blurType: 'gaussian',
    ...overrides,
  }
}

/**
 * 创建锐化滤镜
 */
export function createSharpenFilter(overrides: Partial<SharpenFilter> = {}): SharpenFilter {
  return {
    id: generateUniqueId('sharpen'),
    name: '锐化',
    description: '增强图像清晰度',
    type: 'sharpen',
    enabled: true,
    amount: 1,
    radius: 1,
    ...overrides,
  }
}

/**
 * 创建 LUT 滤镜
 */
export function createLutFilter(overrides: Partial<LutFilter> = {}): LutFilter {
  return {
    id: generateUniqueId('lut'),
    name: 'LUT',
    description: '应用 3D LUT 色彩映射',
    type: 'lut',
    enabled: true,
    intensity: 1,
    ...overrides,
  }
}

/**
 * 颜色校正预设
 */
export const COLOR_CORRECTION_PRESETS: Record<string, Partial<ColorCorrectionFilter>> = {
  default: { brightness: 0, contrast: 1, saturation: 1, hue: 0 },
  vivid: { brightness: 5, contrast: 1.2, saturation: 1.3, hue: 0 },
  muted: { brightness: 0, contrast: 0.9, saturation: 0.7, hue: 0 },
  warm: { brightness: 3, contrast: 1.1, saturation: 1.1, hue: -10 },
  cool: { brightness: 0, contrast: 1.05, saturation: 1.05, hue: 15 },
  vintage: { brightness: 5, contrast: 0.85, saturation: 0.7, hue: 20 },
  dramatic: { brightness: -5, contrast: 1.5, saturation: 1.2, hue: 0 },
}

/**
 * 模糊预设
 */
export const BLUR_PRESETS: Record<string, Partial<BlurFilter>> = {
  none: { strength: 0 },
  light: { strength: 3, blurType: 'gaussian' },
  medium: { strength: 8, blurType: 'gaussian' },
  strong: { strength: 15, blurType: 'gaussian' },
  box: { strength: 10, blurType: 'box' },
}

/**
 * 锐化预设
 */
export const SHARPEN_PRESETS: Record<string, Partial<SharpenFilter>> = {
  none: { amount: 0, radius: 1 },
  light: { amount: 0.5, radius: 1 },
  medium: { amount: 1, radius: 1.5 },
  strong: { amount: 1.8, radius: 2 },
}

/**
 * LUT 强度预设
 */
export const LUT_INTENSITY_PRESETS: Record<string, { intensity: number }> = {
  none: { intensity: 0 },
  light: { intensity: 0.25 },
  medium: { intensity: 0.5 },
  full: { intensity: 1 },
}

/**
 * 创建空滤镜链
 */
export function createEmptyFilterChain(): FilterChain {
  return {
    filters: [],
    enabled: true,
  }
}

/**
 * 克隆滤镜链
 */
export function cloneFilterChain(chain: FilterChain): FilterChain {
  return {
    ...chain,
    filters: chain.filters.map((f) => ({ ...f })),
  }
}

/**
 * 合并多个滤镜链
 */
export function mergeFilterChains(...chains: FilterChain[]): FilterChain {
  const allFilters = chains.flatMap((chain) => chain.filters)
  return {
    filters: allFilters,
    enabled: chains.every((chain) => chain.enabled),
  }
}

/**
 * 移除指定类型的滤镜
 */
export function removeFiltersByType(chain: FilterChain, type: VideoFilter['type']): FilterChain {
  return {
    ...chain,
    filters: chain.filters.filter((f) => f.type !== type),
  }
}

/**
 * 获取指定类型的滤镜
 */
export function getFiltersByType(chain: FilterChain, type: VideoFilter['type']): VideoFilter[] {
  return chain.filters.filter((f) => f.type === type)
}

/**
 * 检查滤镜链是否为空
 */
export function isFilterChainEmpty(chain: FilterChain): boolean {
  return chain.filters.length === 0
}

/**
 * 检查滤镜链是否有启用的滤镜
 */
export function hasEnabledFilters(chain: FilterChain): boolean {
  return chain.filters.some((f) => f.enabled)
}
