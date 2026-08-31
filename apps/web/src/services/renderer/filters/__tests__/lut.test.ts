/**
 * LutFilter LUT 滤镜单元测试
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { LutFilterImpl } from '../lut'
import type { LutFilter } from '../filter-types'

describe('LutFilter', () => {
  let lut: LutFilterImpl

  const createFilter = (overrides: Partial<LutFilter> = {}): LutFilter => ({
    id: 'lut-1',
    name: 'LUT',
    description: '测试',
    type: 'lut',
    enabled: true,
    intensity: 1,
    ...overrides,
  })

  beforeEach(() => {
    lut = new LutFilterImpl(createFilter())
  })

  // ==================== 基础功能 ====================

  describe('getParams', () => {
    it('应该返回滤镜参数的副本', () => {
      const params = lut.getParams()

      expect(params).toEqual({
        id: 'lut-1',
        name: 'LUT',
        description: '测试',
        type: 'lut',
        enabled: true,
        intensity: 1,
      })

      // 修改返回的参数不应影响原始对象
      params.intensity = 0.5
      expect(lut.getParams().intensity).toBe(1)
    })
  })

  describe('updateParams', () => {
    it('应该更新单个参数', () => {
      const updated = lut.updateParams({ intensity: 0.5 })

      expect(updated.intensity).toBe(0.5)
    })

    it('应该更新多个参数', () => {
      const updated = lut.updateParams({
        intensity: 0.8,
        lutFile: '/path/to/lut.cube',
      })

      expect(updated.intensity).toBe(0.8)
      expect(updated.lutFile).toBe('/path/to/lut.cube')
    })

    it('应该保留元数据', () => {
      const updated = lut.updateParams({ intensity: 0.5 })

      expect(updated.id).toBe('lut-1')
      expect(updated.name).toBe('LUT')
      expect(updated.enabled).toBe(true)
    })
  })

  // ==================== 验证 ====================

  describe('validate', () => {
    it('应该验证有效的参数（有文件）', () => {
      const validLut = new LutFilterImpl(createFilter({
        lutFile: '/path/to/lut.cube',
      }))
      const result = validLut.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该验证有效的参数（有数据）', () => {
      const validLut = new LutFilterImpl(createFilter({
        lutData: 'base64data',
      }))
      const result = validLut.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测超出范围的强度', () => {
      const invalidLut = new LutFilterImpl(createFilter({
        lutFile: '/path/to/lut.cube',
        intensity: 2,
      }))
      const result = invalidLut.validate()

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('LUT 强度超出范围')
    })

    it('应该检测缺失的 LUT 文件和数据', () => {
      const invalidLut = new LutFilterImpl(createFilter())
      const result = invalidLut.validate()

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('LUT 文件或数据必须指定')
    })
  })

  // ==================== 效果检查 ====================

  describe('hasEffect', () => {
    it('应该在强度为 0 时返回 false', () => {
      const noLut = new LutFilterImpl(createFilter({
        lutFile: '/path/to/lut.cube',
        intensity: 0,
      }))
      expect(noLut.hasEffect()).toBe(false)
    })

    it('应该在没有 LUT 文件/数据时返回 false', () => {
      expect(lut.hasEffect()).toBe(false)
    })

    it('应该在有效配置时返回 true', () => {
      const validLut = new LutFilterImpl(createFilter({
        lutFile: '/path/to/lut.cube',
        intensity: 0.5,
      }))
      expect(validLut.hasEffect()).toBe(true)
    })
  })

  // ==================== 重置 ====================

  describe('reset', () => {
    it('应该重置强度为 0', () => {
      const modifiedLut = new LutFilterImpl(createFilter({
        lutFile: '/path/to/lut.cube',
        intensity: 1,
      }))
      const reset = modifiedLut.reset()

      expect(reset.intensity).toBe(0)
    })

    it('应该保留 LUT 文件', () => {
      const modifiedLut = new LutFilterImpl(createFilter({
        lutFile: '/path/to/lut.cube',
        intensity: 1,
      }))
      const reset = modifiedLut.reset()

      expect(reset.lutFile).toBe('/path/to/lut.cube')
    })

    it('应该保留元数据', () => {
      const reset = lut.reset()

      expect(reset.id).toBe('lut-1')
      expect(reset.name).toBe('LUT')
      expect(reset.enabled).toBe(true)
    })
  })

  // ==================== LUT 文件设置 ====================

  describe('setLutFile', () => {
    it('应该设置 LUT 文件', () => {
      const updated = lut.setLutFile('/path/to/new.cube')

      expect(updated.lutFile).toBe('/path/to/new.cube')
      expect(updated.lutData).toBeUndefined()
    })

    it('应该清除现有数据', () => {
      const lutWithData = new LutFilterImpl(createFilter({
        lutData: 'basedata',
      }))
      const updated = lutWithData.setLutFile('/path/to/file.cube')

      expect(updated.lutFile).toBe('/path/to/file.cube')
      expect(updated.lutData).toBeUndefined()
    })

    it('应该保留其他参数', () => {
      const updated = lut.setLutFile('/path/to/file.cube')

      expect(updated.intensity).toBe(1)
      expect(updated.id).toBe('lut-1')
    })
  })

  describe('setLutData', () => {
    it('应该设置 LUT 数据', () => {
      const updated = lut.setLutData('base64encodeddata')

      expect(updated.lutData).toBe('base64encodeddata')
      expect(updated.lutFile).toBeUndefined()
    })

    it('应该清除现有文件', () => {
      const lutWithFile = new LutFilterImpl(createFilter({
        lutFile: '/path/to/file.cube',
      }))
      const updated = lutWithFile.setLutData('base64data')

      expect(updated.lutData).toBe('base64data')
      expect(updated.lutFile).toBeUndefined()
    })

    it('应该保留其他参数', () => {
      const updated = lut.setLutData('base64data')

      expect(updated.intensity).toBe(1)
      expect(updated.id).toBe('lut-1')
    })
  })

  // ==================== 预设 ====================

  describe('applyPreset', () => {
    it('应该应用 none 预设（不应用 LUT）', () => {
      const lutWithFile = new LutFilterImpl(createFilter({
        lutFile: '/path/to/lut.cube',
        intensity: 1,
      }))
      const applied = lutWithFile.applyPreset('none')

      expect(applied.intensity).toBe(0)
    })

    it('应该应用 light 预设（轻微应用）', () => {
      const applied = lut.applyPreset('light')

      expect(applied.intensity).toBe(0.25)
    })

    it('应该应用 medium 预设（中等强度）', () => {
      const applied = lut.applyPreset('medium')

      expect(applied.intensity).toBe(0.5)
    })

    it('应该应用 full 预设（完全应用）', () => {
      const applied = lut.applyPreset('full')

      expect(applied.intensity).toBe(1)
    })

    it('应该保留元数据', () => {
      const applied = lut.applyPreset('medium')

      expect(applied.id).toBe('lut-1')
      expect(applied.name).toBe('LUT')
      expect(applied.enabled).toBe(true)
    })

    it('应该警告未知预设', () => {
      const consoleSpy = { called: false, message: '' }
      const originalWarn = console.warn
      console.warn = (msg: string) => {
        consoleSpy.called = true
        consoleSpy.message = msg
      }

      lut.applyPreset('unknown' as any)

      console.warn = originalWarn

      expect(consoleSpy.called).toBe(true)
      expect(consoleSpy.message).toContain('未知预设')
    })
  })

  // ==================== 文件信息 ====================

  describe('getLutFileName', () => {
    it('应该返回文件名', () => {
      const lutWithFile = new LutFilterImpl(createFilter({
        lutFile: '/path/to/my-lut.cube',
      }))

      expect(lutWithFile.getLutFileName()).toBe('my-lut.cube')
    })

    it('应该处理简单文件名', () => {
      const lutWithFile = new LutFilterImpl(createFilter({
        lutFile: 'my-lut.cube',
      }))

      expect(lutWithFile.getLutFileName()).toBe('my-lut.cube')
    })

    it('应该在无文件时返回 undefined', () => {
      expect(lut.getLutFileName()).toBeUndefined()
    })
  })

  describe('usesEmbeddedData', () => {
    it('应该在使用了内嵌数据时返回 true', () => {
      const lutWithData = new LutFilterImpl(createFilter({
        lutData: 'base64data',
      }))

      expect(lutWithData.usesEmbeddedData()).toBe(true)
    })

    it('应该在无数据时返回 false', () => {
      expect(lut.usesEmbeddedData()).toBe(false)
    })

    it('应该在只有文件时返回 false', () => {
      const lutWithFile = new LutFilterImpl(createFilter({
        lutFile: '/path/to/lut.cube',
      }))

      expect(lutWithFile.usesEmbeddedData()).toBe(false)
    })
  })
})
