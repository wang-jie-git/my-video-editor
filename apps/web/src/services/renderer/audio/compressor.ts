/**
 * 音频压缩器
 *
 * 提供动态范围压缩功能
 * 用于平衡音频音量，防止削波
 */

/**
 * 压缩器配置选项
 */
export interface CompressorOptions {
  /** 阈值（dB），范围 -60 到 0 */
  threshold?: number
  /** 压缩比，范围 1 到 20 */
  ratio?: number
  /** 启动时间（ms），范围 0 到 1000 */
  attack?: number
  /** 释放时间（ms），范围 0 到 1000 */
  release?: number
  /** 软拐点（dB），范围 0 到 24 */
  knee?: number
}

/**
 * 压缩器预设
 */
export interface CompressorPreset {
  name: string
  description: string
  options: CompressorOptions
}

/**
 * 压缩器预设配置
 */
export const COMPRESSOR_PRESETS: Record<string, CompressorPreset> = {
  off: {
    name: 'Off',
    description: '无压缩',
    options: {
      threshold: -60,
      ratio: 1,
      attack: 0,
      release: 0,
      knee: 0,
    },
  },
  gentle: {
    name: 'Gentle',
    description: '轻度压缩，适合日常使用',
    options: {
      threshold: -20,
      ratio: 2,
      attack: 10,
      release: 50,
      knee: 10,
    },
  },
  moderate: {
    name: 'Moderate',
    description: '中度压缩，适合播客和语音',
    options: {
      threshold: -15,
      ratio: 4,
      attack: 5,
      release: 30,
      knee: 8,
    },
  },
  heavy: {
    name: 'Heavy',
    description: '重度压缩，适合音乐混音',
    options: {
      threshold: -12,
      ratio: 8,
      attack: 3,
      release: 20,
      knee: 6,
    },
  },
  vocal: {
    name: 'Vocal',
    description: '人声专用压缩，保持清晰度',
    options: {
      threshold: -18,
      ratio: 3,
      attack: 3,
      release: 40,
      knee: 10,
    },
  },
  podcast: {
    name: 'Podcast',
    description: '播客优化，平衡音量',
    options: {
      threshold: -16,
      ratio: 5,
      attack: 4,
      release: 35,
      knee: 8,
    },
  },
  mastering: {
    name: 'Mastering',
    description: '母带处理，微动态增强',
    options: {
      threshold: -24,
      ratio: 2,
      attack: 20,
      release: 100,
      knee: 12,
    },
  },
}

/**
 * 压缩器状态信息
 */
export interface CompressorState {
  /** 当前阈值 */
  threshold: number
  /** 压缩比 */
  ratio: number
  /** 启动时间 */
  attack: number
  /** 释放时间 */
  release: number
  /** 软拐点 */
  knee: number
  /** 输入电平（dB） */
  inputLevel: number
  /** 输出电平（dB） */
  outputLevel: number
  /** 增益衰减量（dB） */
  gainReduction: number
  /** 是否启用 */
  enabled: boolean
}

/**
 * 音频压缩器
 *
 * 基于 Web Audio API 的 DynamicsCompressorNode
 */
export class Compressor {
  private audioContext: AudioContext
  private compressorNode: DynamicsCompressorNode
  private analyser: AnalyserNode
  private inputGain: GainNode
  private outputGain: GainNode
  private options: Required<CompressorOptions>
  private enabled: boolean = true
  private animationFrameId: number | null = null
  private onStateChange?: (state: CompressorState) => void

  constructor(audioContext: AudioContext, options: CompressorOptions = {}) {
    this.audioContext = audioContext

    // 默认配置
    this.options = {
      threshold: options.threshold ?? -24,
      ratio: options.ratio ?? 12,
      attack: options.attack ?? 0.003,
      release: options.release ?? 0.25,
      knee: options.knee ?? 30,
    }

    // 创建压缩器节点
    this.compressorNode = this.audioContext.createDynamicsCompressor()
    this.compressorNode.threshold.value = this.options.threshold
    this.compressorNode.ratio.value = this.options.ratio
    this.compressorNode.attack.value = this.options.attack
    this.compressorNode.release.value = this.options.release
    this.compressorNode.knee.value = this.options.knee

    // 创建分析器（用于监控增益衰减）
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256

    // 创建输入/输出增益节点
    this.inputGain = this.audioContext.createGain()
    this.outputGain = this.audioContext.createGain()

    // 连接节点链：输入 → 压缩器 → 分析器 → 输出增益 → 输出
    this.inputGain.connect(this.compressorNode)
    this.compressorNode.connect(this.analyser)
    this.analyser.connect(this.outputGain)
  }

  /**
   * 设置压缩阈值
   */
  setThreshold(db: number): void {
    this.options.threshold = Math.max(-60, Math.min(0, db))
    this.compressorNode.threshold.setTargetAtTime(
      this.options.threshold,
      this.audioContext.currentTime,
      0.01
    )
  }

  /**
   * 设置压缩比
   */
  setRatio(ratio: number): void {
    this.options.ratio = Math.max(1, Math.min(20, ratio))
    this.compressorNode.ratio.setTargetAtTime(
      this.options.ratio,
      this.audioContext.currentTime,
      0.01
    )
  }

  /**
   * 设置启动时间
   */
  setAttack(ms: number): void {
    this.options.attack = Math.max(0, Math.min(1000, ms)) / 1000 // 转换为秒
    this.compressorNode.attack.setTargetAtTime(
      this.options.attack,
      this.audioContext.currentTime,
      0.01
    )
  }

  /**
   * 设置释放时间
   */
  setRelease(ms: number): void {
    this.options.release = Math.max(0, Math.min(1000, ms)) / 1000 // 转换为秒
    this.compressorNode.release.setTargetAtTime(
      this.options.release,
      this.audioContext.currentTime,
      0.01
    )
  }

  /**
   * 设置软拐点
   */
  setKnee(db: number): void {
    this.options.knee = Math.max(0, Math.min(24, db))
    this.compressorNode.knee.setTargetAtTime(
      this.options.knee,
      this.audioContext.currentTime,
      0.01
    )
  }

  /**
   * 应用预设
   */
  applyPreset(presetName: keyof typeof COMPRESSOR_PRESETS): void {
    const preset = COMPRESSOR_PRESETS[presetName]
    if (!preset) {
      throw new Error(`未知的压缩器预设: ${presetName}`)
    }

    this.setThreshold(preset.options.threshold)
    this.setRatio(preset.options.ratio)
    this.setAttack(preset.options.attack * 1000) // 转换回 ms
    this.setRelease(preset.options.release * 1000) // 转换回 ms
    this.setKnee(preset.options.knee)
  }

  /**
   * 获取所有可用的预设名称
   */
  getAvailablePresets(): string[] {
    return Object.keys(COMPRESSOR_PRESETS)
  }

  /**
   * 获取当前配置
   */
  getOptions(): Required<CompressorOptions> {
    return { ...this.options }
  }

  /**
   * 启用/禁用压缩器
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.outputGain.gain.setTargetAtTime(
      enabled ? 1 : 0,
      this.audioContext.currentTime,
      0.01
    )
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.enabled
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
   * 获取当前状态
   */
  getState(): CompressorState {
    return {
      threshold: this.options.threshold,
      ratio: this.options.ratio,
      attack: this.options.attack * 1000, // 转换回 ms
      release: this.options.release * 1000, // 转换回 ms
      knee: this.options.knee,
      inputLevel: 0,
      outputLevel: 0,
      gainReduction: 0,
      enabled: this.enabled,
    }
  }

  /**
   * 开始监控状态变化
   */
  startMonitoring(onStateChange: (state: CompressorState) => void): void {
    this.onStateChange = onStateChange
    this.updateState()
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.onStateChange = undefined
  }

  /**
   * 更新状态
   */
  private updateState(): void {
    if (!this.onStateChange) return

    const state = this.getState()

    // 获取实际增益衰减值
    if (this.compressorNode.reduction) {
      state.gainReduction = -this.compressorNode.reduction.value
    }

    this.onStateChange(state)

    this.animationFrameId = requestAnimationFrame(() => this.updateState())
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
    this.inputGain.disconnect()
    this.compressorNode.disconnect()
    this.analyser.disconnect()
    this.outputGain.disconnect()
  }

  /**
   * 销毁压缩器
   */
  dispose(): void {
    this.stopMonitoring()
    this.disconnect()
  }

  /**
   * 导出当前配置
   */
  exportConfig(): Required<CompressorOptions> {
    return { ...this.options }
  }

  /**
   * 导入配置
   */
  importConfig(options: CompressorOptions): void {
    this.setThreshold(options.threshold ?? this.options.threshold)
    this.setRatio(options.ratio ?? this.options.ratio)
    this.setAttack(options.attack ?? this.options.attack)
    this.setRelease(options.release ?? this.options.release)
    this.setKnee(options.knee ?? this.options.knee)
  }
}

/**
 * 创建压缩器实例
 */
export function createCompressor(
  audioContext: AudioContext,
  options?: CompressorOptions
): Compressor {
  return new Compressor(audioContext, options)
}
