/**
 * 视频滤镜服务
 *
 * 导出所有滤镜相关的类和工具函数
 */

export { FilterPipeline } from './filter-pipeline'
export { ColorCorrection } from './color-correction'
export { Blur } from './blur'
export { Sharpen } from './sharpen'
export { LutFilterImpl } from './lut'
export {
  createColorCorrectionFilter,
  createBlurFilter,
  createSharpenFilter,
  createLutFilter,
  COLOR_CORRECTION_PRESETS,
  BLUR_PRESETS,
  SHARPEN_PRESETS,
  LUT_INTENSITY_PRESETS,
  createEmptyFilterChain,
  cloneFilterChain,
  mergeFilterChains,
  removeFiltersByType,
  getFiltersByType,
  isFilterChainEmpty,
  hasEnabledFilters,
} from './filter-utils'

export type {
  FilterBase,
  ColorCorrectionFilter,
  BlurFilter,
  SharpenFilter,
  LutFilter,
  VideoFilter,
  FilterChain,
  FilterApplyOptions,
  FilterApplyResult,
  FilterPreset,
} from './filter-types'

export {
  COLOR_CORRECTION_DEFAULTS,
  BLUR_DEFAULTS,
  SHARPEN_DEFAULTS,
  LUT_DEFAULTS,
} from './filter-types'
