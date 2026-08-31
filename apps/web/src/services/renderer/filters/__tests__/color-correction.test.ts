/**
 * ColorCorrection 颜色校正滤镜单元测试
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { ColorCorrection } from '../color-correction'
import type { ColorCorrectionFilter } from '../filter-types'

describe('ColorCorrection', () => {
  let cc: ColorCorrection

  const createFilter = (overrides: Partial<ColorCorrectionFilter> = {}): ColorCorrectionFilter => ({
    id: 'color-1',
    name: '颜色校正',
    description: '测试',
    type: 'color-correction',
    enabled: true,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    hue: 0,
    ...overrides,
  })

  beforeEach(() => {
    cc = new ColorCorrection(createFilter())
  })

  // ==================== 基础功能 ====================

  describe('getParams', () => {
    it('应该返回滤镜参数的副本', () => {
      const params = cc.getParams()

      expect(params).toEqual({
        id: 'color-1',
        name: '颜色校正',
        description: '测试',
        type: 'color-correction',
        enabled: true,
        brightness: 0,
        contrast: 1,
        saturation: 1,
        hue: 0,
      })

      // 修改返回的参数不应影响原始对象
      params.brightness = 1
      expect(cc.getParams().brightness).toBe(0)
    })
  })

  describe('updateParams', () => {
    it('应该更新单个参数', () => {
      const updated = cc.updateParams({ brightness: 0.5 })

      expect(updated.brightness).toBe(0.5)
      expect(updated.contrast).toBe(1)
      expect(updated.saturation).toBe(1)
      expect(updated.hue).toBe(0)
    })

    it('应该更新多个参数', () => {
      const updated = cc.updateParams({
        brightness: 0.2,
        contrast: 1.3,
        saturation: 1.1,
        hue: 15,
      })

      expect(updated.brightness).toBe(0.2)
      expect(updated.contrast).toBe(1.3)
      expect(updated.saturation).toBe(1.1)
      expect(updated.hue).toBe(15)
    })

    it('应该保留未修改的参数', () => {
      const updated = cc.updateParams({ brightness: 0.5 })

      expect(updated.name).toBe('颜色校正')
      expect(updated.id).toBe('color-1')
      expect(updated.enabled).toBe(true)
    })
  })

  // ==================== 验证 ====================

  describe('validate', () => {
    it('应该验证有效的参数', () => {
      const validCC = new ColorCorrection(createFilter({
        brightness: 0.5,
        contrast: 1.2,
        saturation: 1.1,
        hue: 10,
      }))

      const result = validCC.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测超出范围的亮度', () => {
      const invalidCC = new ColorCorrection(createFilter({ brightness: 2 }))
      const result = invalidCC.validate()

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('亮度超出范围')
    })

    it('应该检测超出范围的对比度', () => {
      const invalidCC = new ColorCorrection(createFilter({ contrast: 3 }))
      const result = invalidCC.validate()

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('对比度超出范围')
    })

    it('应该检测超出范围的饱和度', () => {
      const invalidCC = new ColorCorrection(createFilter({ saturation: 3 }))
      const result = invalidCC.validate()

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('饱和度超出范围')
    })

    it('应该检测超出范围的色相', () => {
      const invalidCC = new ColorCorrection(createFilter({ hue: 200 }))
      const result = invalidCC.validate()

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('色相超出范围')
    })

    it('应该检测多个无效参数', () => {
      const invalidCC = new ColorCorrection(createFilter({
        brightness: 2,
        contrast: 3,
        saturation: 3,
        hue: 200,
      }))

      const result = invalidCC.validate()

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(4)
    })
  })

  // ==================== 效果检查 ====================

  describe('hasEffect', () => {
    it('应该在默认参数时返回 false', () => {
      expect(cc.hasEffect()).toBe(false)
    })

    it('应该在调整亮度时返回 true', () => {
      const brightCC = new ColorCorrection(createFilter({ brightness: 0.1 }))
      expect(brightCC.hasEffect()).toBe(true)
    })

    it('应该在调整对比度时返回 true', () => {
      const contrastCC = new ColorCorrection(createFilter({ contrast: 1.2 }))
      expect(contrastCC.hasEffect()).toBe(true)
    })

    it('应该在调整饱和度时返回 true', () => {
      const satCC = new ColorCorrection(createFilter({ saturation: 1.1 }))
      expect(satCC.hasEffect()).toBe(true)
    })

    it('应该在调整色相时返回 true', () => {
      const hueCC = new ColorCorrection(createFilter({ hue: 10 }))
      expect(hueCC.hasEffect()).toBe(true)
    })
  })

  // ==================== 重置 ====================

  describe('reset', () => {
    it('应该重置所有参数为默认值', () => {
      const modifiedCC = new ColorCorrection(createFilter({
        brightness: 0.5,
        contrast: 1.3,
        saturation: 1.2,
        hue: 15,
      }))

      const reset = modifiedCC.reset()

      expect(reset.brightness).toBe(0)
      expect(reset.contrast).toBe(1)
      expect(reset.saturation).toBe(1)
      expect(reset.hue).toBe(0)
    })

    it('应该保留元数据', () => {
      const modifiedCC = new ColorCorrection(createFilter({
        brightness: 0.5,
      }))

      const reset = modifiedCC.reset()

      expect(reset.id).toBe('color-1')
      expect(reset.name).toBe('颜色校正')
      expect(reset.enabled).toBe(true)
    })
  })

  // ==================== 预设 ====================

  describe('applyPreset', () => {
    it('应该应用 default 预设', () => {
      const applied = cc.applyPreset('default')

      expect(applied.brightness).toBe(0)
      expect(applied.contrast).toBe(1)
      expect(applied.saturation).toBe(1)
      expect(applied.hue).toBe(0)
    })

    it('应该应用 vivid 预设（鲜艳风格）', () => {
      const applied = cc.applyPreset('vivid')

      expect(applied.brightness).toBe(5)
      expect(applied.contrast).toBe(1.2)
      expect(applied.saturation).toBe(1.3)
    })

    it('应该应用 muted 预设（柔和风格）', () => {
      const applied = cc.applyPreset('muted')

      expect(applied.saturation).toBeLessThan(1)
      expect(applied.contrast).toBeLessThan(1)
    })

    it('应该应用 warm 预设（暖色调）', () => {
      const applied = cc.applyPreset('warm')

      expect(applied.hue).toBeLessThan(0)
      expect(applied.brightness).toBeGreaterThan(0)
    })

    it('应该应用 cool 预设（冷色调）', () => {
      const applied = cc.applyPreset('cool')

      expect(applied.hue).toBeGreaterThan(0)
    })

    it('应该应用 vintage 预设（复古风格）', () => {
      const applied = cc.applyPreset('vintage')

      expect(applied.contrast).toBeLessThan(1)
      expect(applied.saturation).toBeLessThan(1)
    })

    it('应该应用 dramatic 预设（戏剧化）', () => {
      const applied = cc.applyPreset('dramatic')

      expect(applied.contrast).toBeGreaterThan(1)
      expect(applied.brightness).toBeLessThan(0)
    })

    it('应该保留元数据', () => {
      const applied = cc.applyPreset('vivid')

      expect(applied.id).toBe('color-1')
      expect(applied.name).toBe('颜色校正')
      expect(applied.enabled).toBe(true)
    })

    it('应该警告未知预设', () => {
      const consoleSpy = { called: false, message: '' }
      const originalWarn = console.warn
      console.warn = (msg: string) => {
        consoleSpy.called = true
        consoleSpy.message = msg
      }

      cc.applyPreset('unknown' as any)

      console.warn = originalWarn

      expect(consoleSpy.called).toBe(true)
      expect(consoleSpy.message).toContain('未知预设')
    })
  })
})
