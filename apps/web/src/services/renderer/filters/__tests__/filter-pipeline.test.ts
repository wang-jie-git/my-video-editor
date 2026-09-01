/**
 * FilterPipeline 单元测试
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { FilterPipeline } from '../filter-pipeline'
import type { FFmpegService } from '../../ffmpeg/ffmpeg-service'
import type {
  FilterChain,
  ColorCorrectionFilter,
  BlurFilter,
  SharpenFilter,
  LutFilter,
} from '../filter-types'

// Mock FFmpegService
const createMockFFmpegService = () =>
  ({
    load: async () => {},
    exec: async () => {},
    writeFile: async () => {},
    readFile: async () => new Uint8Array(1024),
    deleteFile: async () => {},
    isLoaded: () => true,
  } as unknown as FFmpegService)

describe('FilterPipeline', () => {
  let pipeline: FilterPipeline
  let mockFFmpegService: FFmpegService

  beforeEach(() => {
    mockFFmpegService = createMockFFmpegService()
    pipeline = new FilterPipeline(mockFFmpegService)
  })

  // ==================== 滤镜链管理 ====================

  describe('createFilterChain', () => {
    it('应该创建空的滤镜链', () => {
      const chain = pipeline.createFilterChain()

      expect(chain.filters).toEqual([])
      expect(chain.enabled).toBe(true)
    })

    it('应该创建包含初始滤镜的滤镜链', () => {
      const filters = [
        {
          id: 'test-1',
          name: '颜色校正',
          description: '测试',
          type: 'color-correction' as const,
          enabled: true,
          brightness: 0.1,
          contrast: 1.2,
          saturation: 1,
          hue: 0,
        },
      ]

      const chain = pipeline.createFilterChain(filters)

      expect(chain.filters).toHaveLength(1)
      expect(chain.filters[0].id).toBe('test-1')
    })
  })

  describe('addFilter', () => {
    it('应该添加滤镜到滤镜链', () => {
      const chain = pipeline.createFilterChain()
      const filter = {
        id: 'blur-1',
        name: '模糊',
        description: '测试',
        type: 'blur' as const,
        enabled: true,
        strength: 5,
        blurType: 'gaussian' as const,
      }

      const newChain = pipeline.addFilter(chain, filter)

      expect(newChain.filters).toHaveLength(1)
      expect(newChain.filters[0]).toEqual(filter)
      expect(chain.filters).toHaveLength(0) // 原链不变
    })

    it('应该支持添加多个滤镜', () => {
      let chain = pipeline.createFilterChain()

      chain = pipeline.addFilter(chain, {
        id: 'filter-1',
        name: '滤镜1',
        description: '测试',
        type: 'color-correction' as const,
        enabled: true,
        brightness: 0,
        contrast: 1,
        saturation: 1,
        hue: 0,
      })

      chain = pipeline.addFilter(chain, {
        id: 'filter-2',
        name: '滤镜2',
        description: '测试',
        type: 'sharpen' as const,
        enabled: true,
        amount: 1,
        radius: 1,
      })

      expect(chain.filters).toHaveLength(2)
      expect(chain.filters[0].id).toBe('filter-1')
      expect(chain.filters[1].id).toBe('filter-2')
    })
  })

  describe('removeFilter', () => {
    it('应该移除指定滤镜', () => {
      const filter1 = {
        id: 'filter-1',
        name: '滤镜1',
        description: '测试',
        type: 'color-correction' as const,
        enabled: true,
        brightness: 0,
        contrast: 1,
        saturation: 1,
        hue: 0,
      }

      const filter2 = {
        id: 'filter-2',
        name: '滤镜2',
        description: '测试',
        type: 'blur' as const,
        enabled: true,
        strength: 5,
        blurType: 'gaussian' as const,
      }

      const chain = pipeline.createFilterChain([filter1, filter2])
      const newChain = pipeline.removeFilter(chain, 'filter-1')

      expect(newChain.filters).toHaveLength(1)
      expect(newChain.filters[0].id).toBe('filter-2')
    })

    it('应该在滤镜不存在时不修改', () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '滤镜1',
        description: '测试',
        type: 'color-correction' as const,
        enabled: true,
        brightness: 0,
        contrast: 1,
        saturation: 1,
        hue: 0,
      }])

      const newChain = pipeline.removeFilter(chain, 'non-existent')

      expect(newChain.filters).toHaveLength(1)
    })
  })

  describe('updateFilter', () => {
    it('应该更新指定滤镜的参数', () => {
      const filter = {
        id: 'filter-1',
        name: '颜色校正',
        description: '测试',
        type: 'color-correction' as const,
        enabled: true,
        brightness: 0,
        contrast: 1,
        saturation: 1,
        hue: 0,
      }

      const chain = pipeline.createFilterChain([filter])
      const newChain = pipeline.updateFilter(chain, 'filter-1', { brightness: 0.5 })

      const updated0 = newChain.filters[0] as ColorCorrectionFilter
      expect(updated0.brightness).toBe(0.5)
      expect(updated0.contrast).toBe(1) // 其他参数不变
    })

    it('应该支持更新多个参数', () => {
      const filter = {
        id: 'filter-1',
        name: '颜色校正',
        description: '测试',
        type: 'color-correction' as const,
        enabled: true,
        brightness: 0,
        contrast: 1,
        saturation: 1,
        hue: 0,
      }

      const chain = pipeline.createFilterChain([filter])
      const newChain = pipeline.updateFilter(chain, 'filter-1', {
        brightness: 0.2,
        contrast: 1.3,
        saturation: 1.1,
      })

      const updated1 = newChain.filters[0] as ColorCorrectionFilter
      expect(updated1.brightness).toBe(0.2)
      expect(updated1.contrast).toBe(1.3)
      expect(updated1.saturation).toBe(1.1)
    })
  })

  describe('toggleFilter', () => {
    it('应该启用滤镜', () => {
      const filter = {
        id: 'filter-1',
        name: '滤镜1',
        description: '测试',
        type: 'blur' as const,
        enabled: false,
        strength: 5,
        blurType: 'gaussian' as const,
      }

      const chain = pipeline.createFilterChain([filter])
      const newChain = pipeline.toggleFilter(chain, 'filter-1', true)

      expect(newChain.filters[0].enabled).toBe(true)
    })

    it('应该禁用滤镜', () => {
      const filter = {
        id: 'filter-1',
        name: '滤镜1',
        description: '测试',
        type: 'blur' as const,
        enabled: true,
        strength: 5,
        blurType: 'gaussian' as const,
      }

      const chain = pipeline.createFilterChain([filter])
      const newChain = pipeline.toggleFilter(chain, 'filter-1', false)

      expect(newChain.filters[0].enabled).toBe(false)
    })
  })

  describe('toggleChain', () => {
    it('应该启用整个滤镜链', () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '滤镜1',
        description: '测试',
        type: 'blur' as const,
        enabled: true,
        strength: 5,
        blurType: 'gaussian' as const,
      }])

      chain.enabled = false
      const newChain = pipeline.toggleChain(chain, true)

      expect(newChain.enabled).toBe(true)
    })

    it('应该禁用整个滤镜链', () => {
      const chain = pipeline.createFilterChain()
      const newChain = pipeline.toggleChain(chain, false)

      expect(newChain.enabled).toBe(false)
    })
  })

  describe('clearChain', () => {
    it('应该清空滤镜链中的所有滤镜', () => {
      let chain = pipeline.createFilterChain()
      chain = pipeline.addFilter(chain, {
        id: 'filter-1',
        name: '滤镜1',
        description: '测试',
        type: 'blur' as const,
        enabled: true,
        strength: 5,
        blurType: 'gaussian' as const,
      })
      chain = pipeline.addFilter(chain, {
        id: 'filter-2',
        name: '滤镜2',
        description: '测试',
        type: 'sharpen' as const,
        enabled: true,
        amount: 1,
        radius: 1,
      })

      const newChain = pipeline.clearChain(chain)

      expect(newChain.filters).toHaveLength(0)
    })
  })

  describe('cloneChain', () => {
    it('应该克隆滤镜链', () => {
      const filter = {
        id: 'filter-1',
        name: '滤镜1',
        description: '测试',
        type: 'blur' as const,
        enabled: true,
        strength: 5,
        blurType: 'gaussian' as const,
      }

      const chain = pipeline.createFilterChain([filter])
      const cloned = pipeline.cloneChain(chain)

      expect(cloned.filters).toHaveLength(1)
      expect(cloned.filters[0]).toEqual(filter)
      expect(cloned).not.toBe(chain)
      expect(cloned.filters[0]).not.toBe(chain.filters[0])
    })
  })

  // ==================== 滤镜图构建 ====================

  describe('buildFilterGraph', () => {
    it('应该返回空字符串如果滤镜链被禁用', () => {
      const chain = pipeline.createFilterChain()
      chain.enabled = false

      const graph = pipeline.buildFilterGraph(chain)

      expect(graph).toBe('')
    })

    it('应该返回空字符串如果没有滤镜', () => {
      const chain = pipeline.createFilterChain()

      const graph = pipeline.buildFilterGraph(chain)

      expect(graph).toBe('')
    })

    it('应该返回空字符串如果所有滤镜都被禁用', () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '滤镜1',
        description: '测试',
        type: 'blur' as const,
        enabled: false,
        strength: 5,
        blurType: 'gaussian' as const,
      }])

      const graph = pipeline.buildFilterGraph(chain)

      expect(graph).toBe('')
    })

    it('应该构建颜色校正滤镜图', () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '颜色校正',
        description: '测试',
        type: 'color-correction' as const,
        enabled: true,
        brightness: 0.1,
        contrast: 1.2,
        saturation: 1,
        hue: 0,
      }])

      const graph = pipeline.buildFilterGraph(chain)

      expect(graph).toBe('eq=brightness=0.1:contrast=1.2')
    })

    it('应该构建模糊滤镜图', () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '模糊',
        description: '测试',
        type: 'blur' as const,
        enabled: true,
        strength: 5,
        blurType: 'gaussian' as const,
      }])

      const graph = pipeline.buildFilterGraph(chain)

      expect(graph).toBe('gaussian=sigma=5')
    })

    it('应该构建锐化滤镜图', () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '锐化',
        description: '测试',
        type: 'sharpen' as const,
        enabled: true,
        amount: 1.5,
        radius: 2,
      }])

      const graph = pipeline.buildFilterGraph(chain)

      expect(graph).toBe('unsharp=2:2:1.5')
    })

    it('应该构建组合滤镜图', () => {
      const chain = pipeline.createFilterChain([
        {
          id: 'filter-1',
          name: '颜色校正',
          description: '测试',
          type: 'color-correction' as const,
          enabled: true,
          brightness: 0.1,
          contrast: 1.2,
          saturation: 1,
          hue: 0,
        },
        {
          id: 'filter-2',
          name: '模糊',
          description: '测试',
          type: 'blur' as const,
          enabled: true,
          strength: 5,
          blurType: 'gaussian' as const,
        },
      ])

      const graph = pipeline.buildFilterGraph(chain)

      expect(graph).toBe('eq=brightness=0.1:contrast=1.2,gaussian=sigma=5')
    })
  })

  // ==================== 滤镜验证 ====================

  describe('validateFilterChain', () => {
    it('应该验证空滤镜链', () => {
      const chain = pipeline.createFilterChain()
      const result = pipeline.validateFilterChain(chain)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测无效的颜色校正参数', () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '颜色校正',
        description: '测试',
        type: 'color-correction' as const,
        enabled: true,
        brightness: 2,    // 超出范围
        contrast: 1,
        saturation: 1,
        hue: 0,
      }])

      const result = pipeline.validateFilterChain(chain)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('应该检测无效的模糊参数', () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '模糊',
        description: '测试',
        type: 'blur' as const,
        enabled: true,
        strength: 30,    // 超出范围
        blurType: 'gaussian' as const,
      }])

      const result = pipeline.validateFilterChain(chain)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('模糊强度超出范围')
    })

    it('应该检测无效的锐化参数', () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '锐化',
        description: '测试',
        type: 'sharpen' as const,
        enabled: true,
        amount: 3,    // 超出范围
        radius: 1,
      }])

      const result = pipeline.validateFilterChain(chain)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('锐化强度超出范围')
    })

    it('应该验证有效的滤镜链', () => {
      const chain = pipeline.createFilterChain([
        {
          id: 'filter-1',
          name: '颜色校正',
          description: '测试',
          type: 'color-correction' as const,
          enabled: true,
          brightness: 0.5,
          contrast: 1.2,
          saturation: 1.1,
          hue: 10,
        },
        {
          id: 'filter-2',
          name: '锐化',
          description: '测试',
          type: 'sharpen' as const,
          enabled: true,
          amount: 1.5,
          radius: 2,
        },
      ])

      const result = pipeline.validateFilterChain(chain)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  // ==================== 应用滤镜 ====================

  describe('applyFilters', () => {
    it('应该成功应用滤镜', async () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '颜色校正',
        description: '测试',
        type: 'color-correction' as const,
        enabled: true,
        brightness: 0.1,
        contrast: 1.2,
        saturation: 1,
        hue: 0,
      }])

      const result = await pipeline.applyFilters({
        inputFile: 'input.mp4',
        outputFile: 'output.mp4',
        filterChain: chain,
      })

      expect(result.success).toBe(true)
      expect(result.outputFile).toBe('output.mp4')
      expect(result.size).toBeGreaterThan(0)
    })

    it('应该在没有滤镜时直接复制', async () => {
      const chain = pipeline.createFilterChain()

      const result = await pipeline.applyFilters({
        inputFile: 'input.mp4',
        outputFile: 'output.mp4',
        filterChain: chain,
      })

      expect(result.success).toBe(true)
    })
  })

  // ==================== 批量应用 ====================

  describe('batchApplyFilters', () => {
    it('应该批量应用滤镜到多个文件', async () => {
      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '颜色校正',
        description: '测试',
        type: 'color-correction' as const,
        enabled: true,
        brightness: 0.1,
        contrast: 1.1,
        saturation: 1,
        hue: 0,
      }])

      const files = [
        { input: 'video1.mp4', output: 'output1.mp4' },
        { input: 'video2.mp4', output: 'output2.mp4' },
        { input: 'video3.mp4', output: 'output3.mp4' },
      ]

      const results = await pipeline.batchApplyFilters(files, chain)

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.success)).toBe(true)
    })

    it('应该在部分失败时继续处理其他文件', async () => {
      let callCount = 0
      mockFFmpegService.exec = (async () => {
        callCount++
        if (callCount === 2) {
          throw new Error('第 2 个文件失败')
        }
      }) as unknown as FFmpegService['exec']

      const chain = pipeline.createFilterChain([{
        id: 'filter-1',
        name: '模糊',
        description: '测试',
        type: 'blur' as const,
        enabled: true,
        strength: 5,
        blurType: 'gaussian' as const,
      }])

      const files = [
        { input: 'video1.mp4', output: 'output1.mp4' },
        { input: 'video2.mp4', output: 'output2.mp4' },
        { input: 'video3.mp4', output: 'output3.mp4' },
      ]

      const results = await pipeline.batchApplyFilters(files, chain)

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })
  })
})
