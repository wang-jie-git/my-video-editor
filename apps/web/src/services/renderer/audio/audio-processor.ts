/**
 * 音频效果处理器
 *
 * 管理音频效果链的创建、连接和控制
 * 支持多种效果器：均衡器、压缩器、混响等
 */

import type { Equalizer, EqualizerOptions } from './equalizer'
import { createEqualizer, EQUALIZER_PRESETS } from './equalizer'
import type { Compressor, CompressorOptions } from './compressor'
import { createCompressor, COMPRESSOR_PRESETS } from './compressor'
import type { Reverb, ReverbOptions } from './reverb'
import { createReverb, REVERB_PRESETS } from './reverb'

/**
 * 效果器类型
 */
export type EffectType = 'equalizer' | 'compressor' | 'reverb'

/**
 * 效果器配置
 */
export interface EffectConfig {
  id: string
  type: EffectType
  enabled: boolean
  options: EqualizerOptions | CompressorOptions | ReverbOptions
}

/**
 * 音频效果链配置
 */
export interface AudioEffectsChainConfig {
  equalizer?: EffectConfig
  compressor?: EffectConfig
  reverb?: EffectConfig
}

/**
 * 音频效果链
 *
 * 管理多个音频效果器的串联连接
 */
export class AudioEffectsChain {
  private audioContext: AudioContext
  private inputGain: GainNode
  private outputGain: GainNode
  private equalizer?: Equalizer
  private compressor?: Compressor
  private reverb?: Reverb
  private effects: Map<string, EffectConfig> = new Map()

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext

    // 创建输入/输出增益节点
    this.inputGain = this.audioContext.createGain()
    this.outputGain = this.audioContext.createGain()

    // 默认连接输入到输出
    this.inputGain.connect(this.outputGain)
  }

  /**
   * 获取输入节点
   */
  getInput(): AudioNode {
    return this.inputGain
  }

  /**
   * 获取输出节点
   */
  getOutput(): AudioNode {
    return this.outputGain
  }

  /**
   * 添加均衡器
   */
  addEqualizer(id: string = 'equalizer', options?: EqualizerOptions): Equalizer {
    // 如果已存在，先移除
    this.removeEqualizer(id)

    this.equalizer = createEqualizer(this.audioContext, options)

    // 添加到效果链
    this.rebuildChain()

    // 保存配置
    this.effects.set(id, {
      id,
      type: 'equalizer',
      enabled: true,
      options: options ?? {},
    })

    return this.equalizer
  }

  /**
   * 移除均衡器
   */
  removeEqualizer(id: string): void {
    if (this.equalizer) {
      this.equalizer.dispose()
      this.equalizer = undefined
    }
    this.effects.delete(id)
    this.rebuildChain()
  }

  /**
   * 获取均衡器
   */
  getEqualizer(): Equalizer | undefined {
    return this.equalizer
  }

  /**
   * 添加压缩器
   */
  addCompressor(id: string = 'compressor', options?: CompressorOptions): Compressor {
    // 如果已存在，先移除
    this.removeCompressor(id)

    this.compressor = createCompressor(this.audioContext, options)

    // 添加到效果链
    this.rebuildChain()

    // 保存配置
    this.effects.set(id, {
      id,
      type: 'compressor',
      enabled: true,
      options: options ?? {},
    })

    return this.compressor
  }

  /**
   * 移除压缩器
   */
  removeCompressor(id: string): void {
    if (this.compressor) {
      this.compressor.dispose()
      this.compressor = undefined
    }
    this.effects.delete(id)
    this.rebuildChain()
  }

  /**
   * 获取压缩器
   */
  getCompressor(): Compressor | undefined {
    return this.compressor
  }

  /**
   * 添加混响
   */
  addReverb(id: string = 'reverb', options?: ReverbOptions): Reverb {
    // 如果已存在，先移除
    this.removeReverb(id)

    this.reverb = createReverb(this.audioContext, options)

    // 添加到效果链
    this.rebuildChain()

    // 保存配置
    this.effects.set(id, {
      id,
      type: 'reverb',
      enabled: true,
      options: options ?? {},
    })

    return this.reverb
  }

  /**
   * 移除混响
   */
  removeReverb(id: string): void {
    if (this.reverb) {
      this.reverb.dispose()
      this.reverb = undefined
    }
    this.effects.delete(id)
    this.rebuildChain()
  }

  /**
   * 获取混响
   */
  getReverb(): Reverb | undefined {
    return this.reverb
  }

  /**
   * 重建效果链连接
   *
   * 连接顺序：输入 → 均衡器 → 压缩器 → 混响 → 输出
   */
  private rebuildChain(): void {
    // 断开所有连接
    this.disconnectInternal()

    // 重新连接
    let currentNode: AudioNode = this.inputGain

    if (this.equalizer) {
      currentNode.connect(this.equalizer.getInput())
      currentNode = this.equalizer.getOutput()
    }

    if (this.compressor) {
      currentNode.connect(this.compressor.getInput())
      currentNode = this.compressor.getOutput()
    }

    if (this.reverb) {
      currentNode.connect(this.reverb.getInput())
      currentNode = this.reverb.getOutput()
    }

    // 连接到输出
    currentNode.connect(this.outputGain)
  }

  /**
   * 断开内部连接
   */
  private disconnectInternal(): void {
    this.inputGain.disconnect()
    this.outputGain.disconnect()

    if (this.equalizer) {
      this.equalizer.disconnect()
    }
    if (this.compressor) {
      this.compressor.disconnect()
    }
    if (this.reverb) {
      this.reverb.disconnect()
    }
  }

  /**
   * 启用/禁用指定效果器
   */
  setEffectEnabled(id: string, enabled: boolean): void {
    const effect = this.effects.get(id)
    if (!effect) return

    effect.enabled = enabled

    switch (effect.type) {
      case 'equalizer':
        this.equalizer?.setEnabled(enabled)
        break
      case 'compressor':
        this.compressor?.setEnabled(enabled)
        break
      case 'reverb':
        this.reverb?.setEnabled(enabled)
        break
    }
  }

  /**
   * 获取效果器状态
   */
  getEffectStatus(): Record<string, { enabled: boolean; type: EffectType }> {
    const status: Record<string, { enabled: boolean; type: EffectType }> = {}
    this.effects.forEach((config, id) => {
      status[id] = {
        enabled: config.enabled,
        type: config.type,
      }
    })
    return status
  }

  /**
   * 应用预设配置
   */
  applyPreset(
    type: EffectType,
    presetName: string,
    id?: string
  ): void {
    const effectId = id || type

    switch (type) {
      case 'equalizer':
        if (!this.equalizer) {
          this.addEqualizer(effectId)
        }
        this.equalizer?.applyPreset(presetName as keyof typeof EQUALIZER_PRESETS)
        break

      case 'compressor':
        if (!this.compressor) {
          this.addCompressor(effectId)
        }
        this.compressor?.applyPreset(presetName as keyof typeof COMPRESSOR_PRESETS)
        break

      case 'reverb':
        if (!this.reverb) {
          this.addReverb(effectId)
        }
        this.reverb?.applyPreset(presetName as keyof typeof REVERB_PRESETS)
        break
    }
  }

  /**
   * 获取所有可用的预设
   */
  static getAvailablePresets(): {
    equalizer: string[]
    compressor: string[]
    reverb: string[]
  } {
    return {
      equalizer: Object.keys(EQUALIZER_PRESETS),
      compressor: Object.keys(COMPRESSOR_PRESETS),
      reverb: Object.keys(REVERB_PRESETS),
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): AudioEffectsChainConfig {
    return {
      equalizer: this.equalizer
        ? {
            id: 'equalizer',
            type: 'equalizer',
            enabled: true,
            options: this.equalizer.exportConfig() as EqualizerOptions,
          }
        : undefined,
      compressor: this.compressor
        ? {
            id: 'compressor',
            type: 'compressor',
            enabled: true,
            options: this.compressor.exportConfig() as CompressorOptions,
          }
        : undefined,
      reverb: this.reverb
        ? {
            id: 'reverb',
            type: 'reverb',
            enabled: true,
            options: this.reverb.exportConfig() as ReverbOptions,
          }
        : undefined,
    }
  }

  /**
   * 从配置恢复效果链
   */
  fromConfig(config: AudioEffectsChainConfig): void {
    // 清除现有效果
    this.clear()

    // 均衡器
    if (config.equalizer) {
      this.addEqualizer('equalizer', config.equalizer.options as EqualizerOptions)
      this.setEffectEnabled('equalizer', config.equalizer.enabled)
    }

    // 压缩器
    if (config.compressor) {
      this.addCompressor('compressor', config.compressor.options as CompressorOptions)
      this.setEffectEnabled('compressor', config.compressor.enabled)
    }

    // 混响
    if (config.reverb) {
      this.addReverb('reverb', config.reverb.options as ReverbOptions)
      this.setEffectEnabled('reverb', config.reverb.enabled)
    }
  }

  /**
   * 重置所有效果
   */
  reset(): void {
    this.clear()
  }

  /**
   * 清除所有效果
   */
  clear(): void {
    this.removeEqualizer('equalizer')
    this.removeCompressor('compressor')
    this.removeReverb('reverb')
    this.effects.clear()
    this.rebuildChain()
  }

  /**
   * 连接音频源
   */
  connect(source: AudioNode): void {
    source.connect(this.getInput())
  }

  /**
   * 连接到目标节点
   */
  connectTo(destination: AudioNode): void {
    this.getOutput().connect(destination)
  }

  /**
   * 断开所有连接
   */
  disconnect(): void {
    this.disconnectInternal()
  }

  /**
   * 销毁效果链
   */
  dispose(): void {
    this.disconnect()
    this.clear()
    this.inputGain.disconnect()
    this.outputGain.disconnect()
  }
}

/**
 * 创建音频效果链
 */
export function createAudioEffectsChain(
  audioContext: AudioContext
): AudioEffectsChain {
  return new AudioEffectsChain(audioContext)
}
