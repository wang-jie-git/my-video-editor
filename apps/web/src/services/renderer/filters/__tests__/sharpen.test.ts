/**
 * Sharpen 锐化滤镜单元测试
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Sharpen } from '../sharpen'
import type { SharpenFilter } from '../filter-types'

describe('Sharpen', () => {
  let sharpen: Sharpen

  const createFilter = (overrides: Partial<SharpenFilter> = {}): SharpenFilter => ({
    id: 'sharpen-1',
    name: '锐化',
    description: '测试',
    type: 'sharpen',
    enabled: true,
    amount: 1,
    radius: 1,
    ...overrides,
  })

  beforeEach(() => {
    sharpen = new Sharpen(createFilter())
  })

  // ==================== 基础功能 ====================

  describe('getParams', () => {
    it('应该返回滤镜参数的副本', () => {
      const params = sharpen.getParams()

      expect(params).toEqual({
        id: 'sharpen-1',
        name: '锐化',
        description: '测试',
        type: 'sharpen',
        enabled: true,
        amount: 1,
        radius: 1,
      })

      // 修改返回的参数不应影响原始对象
      params.amount = 2
      expect(sharpen.getParams().amount).toBe(1)
    })
  })

  describe('updateParams', () => {
    it('应该更新单个参数', () => {
      const updated = sharpen.updateParams({ amount: 1.5 })

      expect(updated.amount).toBe(1.5)
      expect(updated.radius).toBe(1)
    })

    it('应该更新多个参数', () => {
      const updated = sharpen.updateParams({
        amount: 1.8,
        radius: 2,
      })

      expect(updated.amount).toBe(1.8)
      expect(updated.radius).toBe(2)
    })

    it('应该保留元数据', () => {
      const updated = sharpen.updateParams({ amount: 1.5 })

      expect(updated.id).toBe('sharpen-1')
      expect(updated.name).toBe('锐化')
      expect(updated.enabled).toBe(true)
    })
  })

  // ==================== 验证 ====================

  describe('validate', () => {
    it('应该验证有效的参数', () => {
      const validSharpen = new Sharpen(createFilter({
        amount: 1.5,
        radius: 2,
      }))
      const result = validSharpen.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测超出范围的强度', () => {
      const invalidSharpen = new Sharpen(createFilter({ amount: 3 }))
      const result = invalidSharpen.validate()

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('锐化强度超出范围')
    })

    it('应该检测超出范围的半径', () => {
      const invalidSharpen = new Sharpen(createFilter({ radius: 6 }))
      const result = invalidSharpen.validate()

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('半径超出范围')
    })

    it('应该检测多个无效参数', () => {
      const invalidSharpen = new Sharpen(createFilter({
        amount: 3,
        radius: 0,
      }))

      const result = invalidSharpen.validate()

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(2)
    })
  })

  // ==================== 效果检查 ====================

  describe('hasEffect', () => {
    it('应该在强度为 0 时返回 false', () => {
      const noSharpen = new Sharpen(createFilter({ amount: 0 }))
      expect(noSharpen.hasEffect()).toBe(false)
    })

    it('应该在强度大于 0 时返回 true', () => {
      expect(sharpen.hasEffect()).toBe(true)
    })

    it('应该忽略 radius 参数', () => {
      const sharpenLargeRadius = new Sharpen(createFilter({
        amount: 1,
        radius: 5,
      }))
      expect(sharpenLargeRadius.hasEffect()).toBe(true)
    })
  })

  // ==================== 重置 ====================

  describe('reset', () => {
    it('应该重置强度为 0', () => {
      const modifiedSharpen = new Sharpen(createFilter({
        amount: 2,
        radius: 3,
      }))
      const reset = modifiedSharpen.reset()

      expect(reset.amount).toBe(0)
    })

    it('应该重置半径为 1', () => {
      const modifiedSharpen = new Sharpen(createFilter({
        amount: 2,
        radius: 3,
      }))
      const reset = modifiedSharpen.reset()

      expect(reset.radius).toBe(1)
    })

    it('应该保留元数据', () => {
      const reset = sharpen.reset()

      expect(reset.id).toBe('sharpen-1')
      expect(reset.name).toBe('锐化')
      expect(reset.enabled).toBe(true)
    })
  })

  // ==================== 预设 ====================

  describe('applyPreset', () => {
    it('应该应用 none 预设（无锐化）', () => {
      const applied = sharpen.applyPreset('none')

      expect(applied.amount).toBe(0)
      expect(applied.radius).toBe(1)
    })

    it('应该应用 light 预设（轻微锐化）', () => {
      const applied = sharpen.applyPreset('light')

      expect(applied.amount).toBe(0.5)
      expect(applied.radius).toBe(1)
    })

    it('应该应用 medium 预设（中等锐化）', () => {
      const applied = sharpen.applyPreset('medium')

      expect(applied.amount).toBe(1)
      expect(applied.radius).toBe(1.5)
    })

    it('应该应用 strong 预设（强烈锐化）', () => {
      const applied = sharpen.applyPreset('strong')

      expect(applied.amount).toBe(1.8)
      expect(applied.radius).toBe(2)
    })

    it('应该保留元数据', () => {
      const applied = sharpen.applyPreset('medium')

      expect(applied.id).toBe('sharpen-1')
      expect(applied.name).toBe('锐化')
      expect(applied.enabled).toBe(true)
    })

    it('应该警告未知预设', () => {
      const consoleSpy = { called: false, message: '' }
      const originalWarn = console.warn
      console.warn = (msg: string) => {
        consoleSpy.called = true
        consoleSpy.message = msg
      }

      sharpen.applyPreset('unknown' as any)

      console.warn = originalWarn

      expect(consoleSpy.called).toBe(true)
      expect(consoleSpy.message).toContain('未知预设')
    })
  })
})
