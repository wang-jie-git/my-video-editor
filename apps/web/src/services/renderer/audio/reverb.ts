/**
 * 混响效果器
 *
 * 提供卷积混响和算法混响
 * 支持多种预设和自定义脉冲响应
 */

/**
 * 混响类型
 */
export type ReverbType = 'convolver' | 'algorithm'

/**
 * 混响预设
 */
export interface ReverbPreset {
  name: string
  description: string
  decay: number
  damping: number
  preDelay: number
  wetMix: number
  dryMix: number
}

/**
 * 混响配置选项
 */
export interface ReverbOptions {
  type?: ReverbType
  decay?: number
  damping?: number
  preDelay?: number
  wetMix?: number
  dryMix?: number
  preset?: keyof typeof REVERB_PRESETS
}

/**
 * 混响预设配置
 */
export const REVERB_PRESETS: Record<string, ReverbPreset> = {
  off: {
    name: 'Off',
    description: '无混响',
    decay: 0,
    damping: 0,
    preDelay: 0,
    wetMix: 0,
    dryMix: 1,
  },
  smallRoom: {
    name: 'Small Room',
    description: '小房间，自然混响',
    decay: 0.8,
    damping: 0.5,
    preDelay: 10,
    wetMix: 0.3,
    dryMix: 0.7,
  },
  largeRoom: {
    name: 'Large Room',
    description: '大房间，宽敞空间',
    decay: 1.5,
    damping: 0.4,
    preDelay: 15,
    wetMix: 0.4,
    dryMix: 0.6,
  },
  hall: {
    name: 'Concert Hall',
    description: '音乐厅，悠长混响',
    decay: 2.5,
    damping: 0.3,
    preDelay: 20,
    wetMix: 0.5,
    dryMix: 0.5,
  },
  cathedral: {
    name: 'Cathedral',
    description: '大教堂，非常长的混响',
    decay: 4.0,
    damping: 0.2,
    preDelay: 30,
    wetMix: 0.6,
    dryMix: 0.4,
  },
  plate: {
    name: 'Plate',
    description: '板式混响，经典效果',
    decay: 1.2,
    damping: 0.6,
    preDelay: 5,
    wetMix: 0.4,
    dryMix: 0.6,
  },
  spring: {
    name: 'Spring',
    description: '弹簧混响，复古效果',
    decay: 1.0,
    damping: 0.7,
    preDelay: 5,
    wetMix: 0.35,
    dryMix: 0.65,
  },
  vocal: {
    name: 'Vocal',
    description: '人声混响，增加空间感',
    decay: 1.5,
    damping: 0.5,
    preDelay: 15,
    wetMix: 0.25,
    dryMix: 0.75,
  },
}

/**
 * 生成简化的脉冲响应（用于卷积混响）
 */
export async function generateImpulseResponse(
  audioContext: AudioContext,
  duration: number,
  decay: number,
  reverse: boolean = false
): Promise<AudioBuffer> {
  const sampleRate = audioContext.sampleRate
  const length = sampleRate * duration
  const impulse = audioContext.createBuffer(2, length, sampleRate)

  const impulseLeft = impulse.getChannelData(0)
  const impulseRight = impulse.getChannelData(1)

  for (let i = 0; i < length; i++) {
    const n = reverse ? length - i : i
    // 指数衰减噪声
    const value = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay)
    impulseLeft[i] = value
    impulseRight[i] = value
  }

  return impulse
}

/**
 * 混响效果器
 *
 * 支持卷积混响（ConvolverNode）和算法混响（FeedbackDelay + Gain）
 */
export class Reverb {
  private audioContext: AudioContext
  private type: ReverbType
  private convolver: ConvolverNode | null = null
  private inputGain: GainNode
  private outputGain: GainNode
  private wetGain: GainNode
  private dryGain: GainNode
  private preDelay: DelayNode
  private dampingFilter: BiquadFilterNode
  private options: Required<ReverbOptions>
  private enabled: boolean = true

  constructor(audioContext: AudioContext, options: ReverbOptions = {}) {
    this.audioContext = audioContext
    this.type = options.type || 'convolver'

    // 默认配置
    this.options = {
      type: options.type || 'convolver',
      decay: options.decay ?? 1.5,
      damping: options.damping ?? 0.5,
      preDelay: options.preDelay ?? 15,
      wetMix: options.wetMix ?? 0.3,
      dryMix: options.dryMix ?? 0.7,
    }

    // 应用预设（如果指定）
    if (options.preset && REVERB_PRESETS[options.preset]) {
      const preset = REVERB_PRESETS[options.preset]
      this.options = {
        ...this.options,
        ...preset,
        type: options.type || 'convolver',
      }
    }

    // 创建音频节点
    this.inputGain = this.audioContext.createGain()
    this.outputGain = this.audioContext.createGain()
    this.wetGain = this.audioContext.createGain()
    this.dryGain = this.audioContext.createGain()
    this.preDelay = this.audioContext.createDelay()
    this.preDelay.delayTime.value = this.options.preDelay / 1000 // 转换为秒

    // 创建阻尼滤波器（低通）
    this.dampingFilter = this.audioContext.createBiquadFilter()
    this.dampingFilter.type = 'lowpass'
    this.dampingFilter.frequency.value = this.options.damping * 10000 // 映射到 0-10kHz

    // 配置增益
    this.updateGains()

    // 根据类型创建混响
    if (this.type === 'convolver') {
      this.convolver = this.audioContext.createConvolver()
      // 注意：setupConvolver() 是异步的，但我们不等待它完成
      // 脉冲响应会在 setupConvolver() 完成后自动设置
      void this.setupConvolver()
    }

    this.setupConnections()
  }

  /**
   * 设置卷积混响
   */
  private async setupConvolver(): Promise<void> {
    if (!this.convolver) return

    // 生成默认脉冲响应
    const impulse = await generateImpulseResponse(
      this.audioContext,
      3, // 3 秒
      this.options.decay
    )

    // 再次检查，因为可能在等待期间 this.convolver 被设为 null
    if (this.convolver) {
      this.convolver.buffer = impulse
    }
  }

  /**
   * 设置节点连接
   */
  private setupConnections(): void {
    if (this.type === 'convolver' && this.convolver) {
      // 干声路径
      this.inputGain.connect(this.dryGain)

      // 湿声路径
      this.inputGain.connect(this.preDelay)
      this.preDelay.connect(this.dampingFilter)
      this.dampingFilter.connect(this.convolver)
      this.convolver.connect(this.wetGain)
    } else {
      // 算法混响（简化版）
      const delay1 = this.audioContext.createDelay()
      delay1.delayTime.value = 0.03

      const delay2 = this.audioContext.createDelay()
      delay2.delayTime.value = 0.04

      const feedback1 = this.audioContext.createGain()
      feedback1.gain.value = 0.5

      const feedback2 = this.audioContext.createGain()
      feedback2.gain.value = 0.5

      // 干声路径
      this.inputGain.connect(this.dryGain)

      // 湿声路径（反馈延迟网络）
      this.inputGain.connect(delay1)
      delay1.connect(this.dampingFilter)
      this.dampingFilter.connect(feedback1)
      feedback1.connect(delay2)
      delay2.connect(feedback2)
      feedback2.connect(delay1)
      feedback2.connect(this.wetGain)
    }

    // 输出
    this.dryGain.connect(this.outputGain)
    this.wetGain.connect(this.outputGain)
  }

  /**
   * 更新增益值
   */
  private updateGains(): void {
    this.dryGain.gain.setTargetAtTime(
      this.options.dryMix * (this.enabled ? 1 : 0),
      this.audioContext.currentTime,
      0.01
    )
    this.wetGain.gain.setTargetAtTime(
      this.options.wetMix * (this.enabled ? 1 : 0),
      this.audioContext.currentTime,
      0.01
    )
  }

  /**
   * 设置混响衰减时间
   */
  setDecay(seconds: number): void {
    this.options.decay = Math.max(0.1, Math.min(10, seconds))

    if (this.type === 'convolver' && this.convolver) {
      // 重新生成脉冲响应
      generateImpulseResponse(
        this.audioContext,
        3,
        this.options.decay
      ).then(impulse => {
        if (this.convolver) {
          this.convolver.buffer = impulse
        }
      })
    }
  }

  /**
   * 设置阻尼（高频衰减）
   */
  setDamping(value: number): void {
    this.options.damping = Math.max(0, Math.min(1, value))
    this.dampingFilter.frequency.setTargetAtTime(
      this.options.damping * 10000,
      this.audioContext.currentTime,
      0.01
    )
  }

  /**
   * 设置预延迟
   */
  setPreDelay(ms: number): void {
    this.options.preDelay = Math.max(0, Math.min(100, ms))
    this.preDelay.delayTime.setTargetAtTime(
      this.options.preDelay / 1000,
      this.audioContext.currentTime,
      0.01
    )
  }

  /**
   * 设置湿声混合比例
   */
  setWetMix(ratio: number): void {
    this.options.wetMix = Math.max(0, Math.min(1, ratio))
    this.updateGains()
  }

  /**
   * 设置干声混合比例
   */
  setDryMix(ratio: number): void {
    this.options.dryMix = Math.max(0, Math.min(1, ratio))
    this.updateGains()
  }

  /**
   * 应用预设
   */
  applyPreset(presetName: keyof typeof REVERB_PRESETS): void {
    const preset = REVERB_PRESETS[presetName]
    if (!preset) {
      throw new Error(`未知的混响预设: ${presetName}`)
    }

    this.setDecay(preset.decay)
    this.setDamping(preset.damping)
    this.setPreDelay(preset.preDelay)
    this.setWetMix(preset.wetMix)
    this.setDryMix(preset.dryMix)
  }

  /**
   * 获取所有可用的预设名称
   */
  getAvailablePresets(): string[] {
    return Object.keys(REVERB_PRESETS)
  }

  /**
   * 获取当前配置
   */
  getOptions(): Required<ReverbOptions> {
    return { ...this.options }
  }

  /**
   * 启用/禁用混响
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.updateGains()
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
    this.dryGain.disconnect()
    this.wetGain.disconnect()
    this.preDelay.disconnect()
    this.dampingFilter.disconnect()

    if (this.convolver) {
      this.convolver.disconnect()
    }
  }

  /**
   * 销毁混响器
   */
  dispose(): void {
    this.disconnect()

    if (this.convolver) {
      this.convolver.buffer = null
      this.convolver = null
    }
  }

  /**
   * 导出当前配置
   */
  exportConfig(): Required<ReverbOptions> {
    return { ...this.options }
  }

  /**
   * 导入配置
   */
  importConfig(options: ReverbOptions): void {
    if (options.type) {
      this.type = options.type
    }

    if (options.decay !== undefined) {
      this.setDecay(options.decay)
    }
    if (options.damping !== undefined) {
      this.setDamping(options.damping)
    }
    if (options.preDelay !== undefined) {
      this.setPreDelay(options.preDelay)
    }
    if (options.wetMix !== undefined) {
      this.setWetMix(options.wetMix)
    }
    if (options.dryMix !== undefined) {
      this.setDryMix(options.dryMix)
    }
  }

  /**
   * 加载自定义脉冲响应
   */
  async loadImpulseResponse(audioBuffer: AudioBuffer): Promise<void> {
    if (!this.convolver) {
      throw new Error('当前混响类型不支持自定义脉冲响应')
    }

    this.convolver.buffer = audioBuffer
  }

  /**
   * 从文件加载脉冲响应
   */
  async loadImpulseResponseFromFile(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    await this.loadImpulseResponse(audioBuffer)
  }
}

/**
 * 创建混响器实例
 */
export function createReverb(
  audioContext: AudioContext,
  options?: ReverbOptions
): Reverb {
  return new Reverb(audioContext, options)
}
