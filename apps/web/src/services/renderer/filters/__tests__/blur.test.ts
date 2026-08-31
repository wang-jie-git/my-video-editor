/**
 * Blur 模糊滤镜单元测试
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Blur } from '../blur'
import type { BlurFilter } from '../filter-types'

describe('Blur', () => {
  let blur: Blur

  const createFilter = (overrides: Partial<BlurFilter> = {}): BlurFilter => ({
    id: 'blur-1',
    name: '模糊',
    description: '测试',
    type: 'blur',
    enabled: true,
    strength: 5,
    blurType: 'gaussian',
    ...overrides,
  })

  beforeEach(() => {
    blur = new Blur(createFilter())
  })

  // ==================== 基础功能 ====================

  describe('getParams', () => {
    it('应该返回滤镜参数的副本', () => {
      const params = blur.getParams()

      expect(params).toEqual({
        id: 'blur-1',
        name: '模糊',
        description: '测试',
        type: 'blur',
        enabled: true,
        strength: 5,
        blurType: 'gaussian',
      })

      // 修改返回的参数不应影响原始对象
      params.strength = 10
      expect(blur.getParams().strength).toBe(5)
    })
  })

  describe('updateParams', () => {
    it('应该更新单个参数', () => {
      const updated = blur.updateParams({ strength: 10 })

      expect(updated.strength).toBe(10)
      expect(updated.blurType).toBe('gaussian')
    })

    it('应该更新多个参数', () => {
      const updated = blur.updateParams({
        strength: 15,
        blurType: 'box',
      })

      expect(updated.strength).toBe(15)
      expect(updated.blurType).toBe('box')
    })

    it('应该保留元数据', () => {
      const updated = blur.updateParams({ strength: 10 })

      expect(updated.id).toBe('blur-1')
      expect(updated.name).toBe('模糊')
      expect(updated.enabled).toBe(true)
    })
  })

  // ==================== 验证 ====================

  describe('validate', () => {
    it('应该验证有效的参数', () => {
      const validBlur = new Blur(createFilter({ strength: 10 }))
      const result = validBlur.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测超出范围的强度', () => {
      const invalidBlur = new Blur(createFilter({ strength: 25 }))
      const result = invalidBlur.validate()

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('模糊强度超出范围')
    })

    it('应该允许零强度', () => {
      const zeroBlur = new Blur(createFilter({ strength: 0 }))
      const result = zeroBlur.validate()

      expect(result.valid).toBe(true)
    })
  })

  // ==================== 效果检查 ====================

  describe('hasEffect', () => {
    it('应该在强度为 0 时返回 false', () => {
      const noBlur = new Blur(createFilter({ strength: 0 }))
      expect(noBlur.hasEffect()).toBe(false)
    })

    it('应该在强度大于 0 时返回 true', () => {
      expect(blur.hasEffect()).toBe(true)
    })

    it('应该忽略 blurType 参数', () => {
      const blurBox = new Blur(createFilter({ strength: 1, blurType: 'box' }))
      expect(blurBox.hasEffect()).toBe(true)
    })
  })

  // ==================== 重置 ====================

  describe('reset', () => {
    it('应该重置强度为 0', () => {
      const modifiedBlur = new Blur(createFilter({ strength: 20 }))
      const reset = modifiedBlur.reset()

      expect(reset.strength).toBe(0)
    })

    it('应该保留 blurType', () => {
      const modifiedBlur = new Blur(createFilter({
        strength: 20,
        blurType: 'motion',
      }))
      const reset = modifiedBlur.reset()

      expect(reset.blurType).toBe('motion')
    })

    it('应该保留元数据', () => {
      const reset = blur.reset()

      expect(reset.id).toBe('blur-1')
      expect(reset.name).toBe('模糊')
      expect(reset.enabled).toBe(true)
    })
  })

  // ==================== 预设 ====================

  describe('applyPreset', () => {
    it('应该应用 none 预设（无模糊）', () => {
      const applied = blur.applyPreset('none')

      expect(applied.strength).toBe(0)
    })

    it('应该应用 light 预设（轻微模糊）', () => {
      const applied = blur.applyPreset('light')

      expect(applied.strength).toBe(3)
    })

    it('应该应用 medium 预设（中等模糊）', () => {
      const applied = blur.applyPreset('medium')

      expect(applied.strength).toBe(8)
    })

    it('应该应用 strong 预设（强烈模糊）', () => {
      const applied = blur.applyPreset('strong')

      expect(applied.strength).toBe(15)
    })

    it('应该应用 box 预设（方框模糊）', () => {
      const applied = blur.applyPreset('box')

      expect(applied.strength).toBe(10)
      expect(applied.blurType).toBe('box')
    })

    it('应该保留元数据', () => {
      const applied = blur.applyPreset('medium')

      expect(applied.id).toBe('blur-1')
      expect(applied.name).toBe('模糊')
      expect(applied.enabled).toBe(true)
    })

    it('应该警告未知预设', () => {
      const consoleSpy = { called: false, message: '' }
      const originalWarn = console.warn
      console.warn = (msg: string) => {
        consoleSpy.called = true
        consoleSpy.message = msg
      }

      blur.applyPreset('unknown' as any)

      console.warn = originalWarn

      expect(consoleSpy.called).toBe(true)
      expect(consoleSpy.message).toContain('未知预设')
    })
  })

  // ==================== 模糊类型切换 ====================

  describe('setBlurType', () => {
    it('应该切换到 gaussian 模糊', () => {
      const updated = blur.setBlurType('gaussian')

      expect(updated.blurType).toBe('gaussian')
      expect(updated.strength).toBe(5) // 强度不变
    })

    it('应该切换到 box 模糊', () => {
      const updated = blur.setBlurType('box')

      expect(updated.blurType).toBe('box')
    })

    it('应该切换到 motion 模糊', () => {
      const updated = blur.setBlurType('motion')

      expect(updated.blurType).toBe('motion')
    })

    it('应该保留其他参数', () => {
      const updated = blur.setBlurType('motion')

      expect(updated.strength).toBe(5)
      expect(updated.id).toBe('blur-1')
      expect(updated.enabled).toBe(true)
    })
  })
})
