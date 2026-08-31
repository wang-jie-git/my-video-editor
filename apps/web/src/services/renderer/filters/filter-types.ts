/**
 * 视频滤镜类型定义
 */

/**
 * 滤镜基类
 */
export interface FilterBase {
  /** 滤镜 ID */
  id: string
  /** 滤镜名称 */
  name: string
  /** 滤镜描述 */
  description: string
  /** 是否启用 */
  enabled: boolean
}

/**
 * 颜色校正滤镜参数
 */
export interface ColorCorrectionFilter extends FilterBase {
  /** 滤镜类型 */
  type: 'color-correction'
  /** 亮度（-1 到 1） */
  brightness: number
  /** 对比度（0 到 2） */
  contrast: number
  /** 饱和度（0 到 2） */
  saturation: number
  /** 色相（-180 到 180） */
  hue: number
}

/**
 * 模糊滤镜参数
 */
export interface BlurFilter extends FilterBase {
  /** 滤镜类型 */
  type: 'blur'
  /** 模糊强度（0 到 20） */
  strength: number
  /** 模糊类型 */
  blurType: 'gaussian' | 'box' | 'motion'
}

/**
 * 锐化滤镜参数
 */
export interface SharpenFilter extends FilterBase {
  /** 滤镜类型 */
  type: 'sharpen'
  /** 锐化强度（0 到 2） */
  amount: number
  /** 半径 */
  radius: number
}

/**
 * 3D LUT 滤镜参数
 */
export interface LutFilter extends FilterBase {
  /** 滤镜类型 */
  type: 'lut'
  /** LUT 文件路径或数据 */
  lutFile?: string
  /** LUT 数据（Base64 编码的 .cube 文件） */
  lutData?: string
  /** 强度（0 到 1） */
  intensity: number
}

/**
 * 滤镜类型联合
 */
export type VideoFilter = ColorCorrectionFilter | BlurFilter | SharpenFilter | LutFilter

/**
 * 滤镜链
 */
export interface FilterChain {
  /** 滤镜列表 */
  filters: VideoFilter[]
  /** 是否启用整个滤镜链 */
  enabled: boolean
}

/**
 * 滤镜应用选项
 */
export interface FilterApplyOptions {
  /** 输入文件 */
  inputFile: string
  /** 输出文件 */
  outputFile: string
  /** 滤镜链 */
  filterChain: FilterChain
  /** 进度回调 */
  onProgress?: (progress: number) => void
}

/**
 * 滤镜应用结果
 */
export interface FilterApplyResult {
  /** 是否成功 */
  success: boolean
  /** 输出文件 */
  outputFile?: string
  /** 文件大小（字节） */
  size?: number
  /** 错误信息 */
  error?: string
}

/**
 * 滤镜预设
 */
export interface FilterPreset {
  /** 预设 ID */
  id: string
  /** 预设名称 */
  name: string
  /** 预设描述 */
  description: string
  /** 滤镜链 */
  filterChain: FilterChain
  /** 缩略图（可选） */
  thumbnail?: string
}

/**
 * 颜色校正预设值
 */
export const COLOR_CORRECTION_DEFAULTS = {
  brightness: 0,      // -1 to 1
  contrast: 1,        // 0 to 2
  saturation: 1,      // 0 to 2
  hue: 0,             // -180 to 180
} as const

/**
 * 模糊预设值
 */
export const BLUR_DEFAULTS = {
  strength: 5,        // 0 to 20
  blurType: 'gaussian' as const,
} as const

/**
 * 锐化预设值
 */
export const SHARPEN_DEFAULTS = {
  amount: 1,          // 0 to 2
  radius: 1,          // 1 to 5
} as const

/**
 * LUT 预设值
 */
export const LUT_DEFAULTS = {
  intensity: 1,       // 0 to 1
} as const
