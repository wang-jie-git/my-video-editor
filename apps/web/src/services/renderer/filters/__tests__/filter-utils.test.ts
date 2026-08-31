/**
 * filter-utils 工具函数单元测试
 */

import { describe, it, expect } from 'bun:test'
import {
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
} from '../filter-utils'
import type { FilterChain, VideoFilter } from '../filter-types'

describe('filter-utils', () => {
  // ==================== 工厂函数 ====================

  describe('createColorCorrectionFilter', () => {
    it('应该使用默认值创建滤镜', () => {
      const filter = createColorCorrectionFilter()

      expect(filter.id).toBeDefined()
      expect(filter.name).toBe('颜色校正')
      expect(filter.type).toBe('color-correction')
      expect(filter.enabled).toBe(true)
      expect(filter.brightness).toBe(0)
      expect(filter.contrast).toBe(1)
      expect(filter.saturation).toBe(1)
      expect(filter.hue).toBe(0)
    })

    it('应该合并自定义参数', () => {
      const filter = createColorCorrectionFilter({
        brightness: 0.5,
        contrast: 1.3,
      })

      expect(filter.brightness).toBe(0.5)
      expect(filter.contrast).toBe(1.3)
      expect(filter.saturation).toBe(1) // 默认值
      expect(filter.hue).toBe(0) // 默认值
    })

    it('应该生成唯一的 ID', () => {
      const filter1 = createColorCorrectionFilter()
      const filter2 = createColorCorrectionFilter()

      expect(filter1.id).not.toBe(filter2.id)
    })
  })

  describe('createBlurFilter', () => {
    it('应该使用默认值创建滤镜', () => {
      const filter = createBlurFilter()

      expect(filter.id).toBeDefined()
      expect(filter.name).toBe('模糊')
      expect(filter.type).toBe('blur')
      expect(filter.enabled).toBe(true)
      expect(filter.strength).toBe(5)
      expect(filter.blurType).toBe('gaussian')
    })

    it('应该合并自定义参数', () => {
      const filter = createBlurFilter({
        strength: 10,
        blurType: 'motion',
      })

      expect(filter.strength).toBe(10)
      expect(filter.blurType).toBe('motion')
    })
  })

  describe('createSharpenFilter', () => {
    it('应该使用默认值创建滤镜', () => {
      const filter = createSharpenFilter()

      expect(filter.id).toBeDefined()
      expect(filter.name).toBe('锐化')
      expect(filter.type).toBe('sharpen')
      expect(filter.enabled).toBe(true)
      expect(filter.amount).toBe(1)
      expect(filter.radius).toBe(1)
    })

    it('应该合并自定义参数', () => {
      const filter = createSharpenFilter({
        amount: 1.5,
        radius: 2,
      })

      expect(filter.amount).toBe(1.5)
      expect(filter.radius).toBe(2)
    })
  })

  describe('createLutFilter', () => {
    it('应该使用默认值创建滤镜', () => {
      const filter = createLutFilter()

      expect(filter.id).toBeDefined()
      expect(filter.name).toBe('LUT')
      expect(filter.type).toBe('lut')
      expect(filter.enabled).toBe(true)
      expect(filter.intensity).toBe(1)
    })

    it('应该合并自定义参数', () => {
      const filter = createLutFilter({
        lutFile: '/path/to/lut.cube',
        intensity: 0.8,
      })

      expect(filter.lutFile).toBe('/path/to/lut.cube')
      expect(filter.intensity).toBe(0.8)
    })
  })

  // ==================== 滤镜链工具 ====================

  describe('createEmptyFilterChain', () => {
    it('应该创建空的滤镜链', () => {
      const chain = createEmptyFilterChain()

      expect(chain.filters).toHaveLength(0)
      expect(chain.enabled).toBe(true)
    })
  })

  describe('cloneFilterChain', () => {
    it('应该克隆滤镜链', () => {
      const chain: FilterChain = {
        filters: [
          {
            id: 'filter-1',
            name: '滤镜1',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 5,
            blurType: 'gaussian' as const,
          },
        ],
        enabled: true,
      }

      const cloned = cloneFilterChain(chain)

      expect(cloned.filters).toHaveLength(1)
      expect(cloned.filters[0]).toEqual(chain.filters[0])
      expect(cloned).not.toBe(chain)
      expect(cloned.filters[0]).not.toBe(chain.filters[0])
    })
  })

  describe('mergeFilterChains', () => {
    it('应该合并两个滤镜链', () => {
      const chain1: FilterChain = {
        filters: [
          {
            id: 'filter-1',
            name: '滤镜1',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 5,
            blurType: 'gaussian' as const,
          },
        ],
        enabled: true,
      }

      const chain2: FilterChain = {
        filters: [
          {
            id: 'filter-2',
            name: '滤镜2',
            description: '测试',
            type: 'sharpen' as const,
            enabled: true,
            amount: 1,
            radius: 1,
          },
        ],
        enabled: true,
      }

      const merged = mergeFilterChains(chain1, chain2)

      expect(merged.filters).toHaveLength(2)
      expect(merged.filters[0].id).toBe('filter-1')
      expect(merged.filters[1].id).toBe('filter-2')
    })

    it('应该在链都被启用时启用', () => {
      const chain1: FilterChain = {
        filters: [],
        enabled: true,
      }

      const chain2: FilterChain = {
        filters: [],
        enabled: true,
      }

      const merged = mergeFilterChains(chain1, chain2)

      expect(merged.enabled).toBe(true)
    })

    it('应该在任一链被禁用时禁用', () => {
      const chain1: FilterChain = {
        filters: [],
        enabled: false,
      }

      const chain2: FilterChain = {
        filters: [],
        enabled: true,
      }

      const merged = mergeFilterChains(chain1, chain2)

      expect(merged.enabled).toBe(false)
    })
  })

  describe('removeFiltersByType', () => {
    it('应该移除指定类型的滤镜', () => {
      const chain: FilterChain = {
        filters: [
          {
            id: 'filter-1',
            name: '模糊1',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 5,
            blurType: 'gaussian' as const,
          },
          {
            id: 'filter-2',
            name: '锐化',
            description: '测试',
            type: 'sharpen' as const,
            enabled: true,
            amount: 1,
            radius: 1,
          },
          {
            id: 'filter-3',
            name: '模糊2',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 10,
            blurType: 'box' as const,
          },
        ],
        enabled: true,
      }

      const newChain = removeFiltersByType(chain, 'blur')

      expect(newChain.filters).toHaveLength(1)
      expect(newChain.filters[0].type).toBe('sharpen')
    })

    it('应该在无匹配类型时保留所有滤镜', () => {
      const chain: FilterChain = {
        filters: [
          {
            id: 'filter-1',
            name: '模糊',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 5,
            blurType: 'gaussian' as const,
          },
        ],
        enabled: true,
      }

      const newChain = removeFiltersByType(chain, 'sharpen')

      expect(newChain.filters).toHaveLength(1)
    })
  })

  describe('getFiltersByType', () => {
    it('应该获取指定类型的滤镜', () => {
      const chain: FilterChain = {
        filters: [
          {
            id: 'filter-1',
            name: '模糊1',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 5,
            blurType: 'gaussian' as const,
          },
          {
            id: 'filter-2',
            name: '锐化',
            description: '测试',
            type: 'sharpen' as const,
            enabled: true,
            amount: 1,
            radius: 1,
          },
          {
            id: 'filter-3',
            name: '模糊2',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 10,
            blurType: 'box' as const,
          },
        ],
        enabled: true,
      }

      const blurFilters = getFiltersByType(chain, 'blur')

      expect(blurFilters).toHaveLength(2)
      expect(blurFilters.every((f) => f.type === 'blur')).toBe(true)
    })

    it('应该在无匹配类型时返回空数组', () => {
      const chain: FilterChain = {
        filters: [
          {
            id: 'filter-1',
            name: '模糊',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 5,
            blurType: 'gaussian' as const,
          },
        ],
        enabled: true,
      }

      const sharpenFilters = getFiltersByType(chain, 'sharpen')

      expect(sharpenFilters).toHaveLength(0)
    })
  })

  describe('isFilterChainEmpty', () => {
    it('应该在滤镜链为空时返回 true', () => {
      const chain: FilterChain = {
        filters: [],
        enabled: true,
      }

      expect(isFilterChainEmpty(chain)).toBe(true)
    })

    it('应该在滤镜链非空时返回 false', () => {
      const chain: FilterChain = {
        filters: [
          {
            id: 'filter-1',
            name: '模糊',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 5,
            blurType: 'gaussian' as const,
          },
        ],
        enabled: true,
      }

      expect(isFilterChainEmpty(chain)).toBe(false)
    })
  })

  describe('hasEnabledFilters', () => {
    it('应该在至少一个滤镜启用时返回 true', () => {
      const chain: FilterChain = {
        filters: [
          {
            id: 'filter-1',
            name: '模糊',
            description: '测试',
            type: 'blur' as const,
            enabled: true,
            strength: 5,
            blurType: 'gaussian' as const,
          },
          {
            id: 'filter-2',
            name: '锐化',
            description: '测试',
            type: 'sharpen' as const,
            enabled: false,
            amount: 0,
            radius: 1,
          },
        ],
        enabled: true,
      }

      expect(hasEnabledFilters(chain)).toBe(true)
    })

    it('应该在没有启用滤镜时返回 false', () => {
      const chain: FilterChain = {
        filters: [
          {
            id: 'filter-1',
            name: '模糊',
            description: '测试',
            type: 'blur' as const,
            enabled: false,
            strength: 5,
            blurType: 'gaussian' as const,
          },
        ],
        enabled: true,
      }

      expect(hasEnabledFilters(chain)).toBe(false)
    })
  })

  // ==================== 预设集合 ====================

  describe('COLOR_CORRECTION_PRESETS', () => {
    it('应该有正确的预设数量', () => {
      expect(Object.keys(COLOR_CORRECTION_PRESETS)).toHaveLength(7)
    })

    it('应该有 default 预设', () => {
      expect(COLOR_CORRECTION_PRESETS.default).toEqual({
        brightness: 0,
        contrast: 1,
        saturation: 1,
        hue: 0,
      })
    })

    it('应该有 vivid 预设', () => {
      expect(COLOR_CORRECTION_PRESETS.vivid.brightness).toBe(5)
      expect(COLOR_CORRECTION_PRESETS.vivid.contrast).toBe(1.2)
      expect(COLOR_CORRECTION_PRESETS.vivid.saturation).toBe(1.3)
    })
  })

  describe('BLUR_PRESETS', () => {
    it('应该有正确的预设数量', () => {
      expect(Object.keys(BLUR_PRESETS)).toHaveLength(5)
    })

    it('应该有 none 预设', () => {
      expect(BLUR_PRESETS.none.strength).toBe(0)
    })
  })

  describe('SHARPEN_PRESETS', () => {
    it('应该有正确的预设数量', () => {
      expect(Object.keys(SHARPEN_PRESETS)).toHaveLength(4)
    })
  })

  describe('LUT_INTENSITY_PRESETS', () => {
    it('应该有正确的预设数量', () => {
      expect(Object.keys(LUT_INTENSITY_PRESETS)).toHaveLength(4)
    })

    it('应该有正确的强度值', () => {
      expect(LUT_INTENSITY_PRESETS.none.intensity).toBe(0)
      expect(LUT_INTENSITY_PRESETS.light.intensity).toBe(0.25)
      expect(LUT_INTENSITY_PRESETS.medium.intensity).toBe(0.5)
      expect(LUT_INTENSITY_PRESETS.full.intensity).toBe(1)
    })
  })
})
