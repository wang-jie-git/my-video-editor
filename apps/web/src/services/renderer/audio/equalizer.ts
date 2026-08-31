/**
 * 10 段参数均衡器
 *
 * 提供专业的音频频率调节功能
 * 支持 ISO 标准频率点
 */

/**
 * 均衡器频段定义
 */
export interface EqualizerBand {
  /** 频率（Hz） */
  frequency: number
  /** 增益（dB），范围 -12 到 +12 */
  gain: number
  /** 品质因数（Q 值），范围 0.1 到 10 */
  q: number
  /** 是否启用 */
  enabled: boolean
}

/**
 * 均衡器预设
 */
export interface EqualizerPreset {
  name: string
  description: string
  bands: Omit<EqualizerBand, 'enabled'>[]
}

/**
 * ISO 标准 10 段均衡器频率点
 */
export const STANDARD_10_BAND_FREQUENCIES = [
  { frequency: 31, label: '31Hz' },
  { frequency: 62, label: '62Hz' },
  { frequency: 125, label: '125Hz' },
  { frequency: 250, label: '250Hz' },
  { frequency: 500, label: '500Hz' },
  { frequency: 1000, label: '1kHz' },
  { frequency: 2000, label: '2kHz' },
  { frequency: 4000, label: '4kHz' },
  { frequency: 8000, label: '8kHz' },
  { frequency: 16000, label: '16kHz' },
] as const

/**
 * 均衡器预设配置
 */
export const EQUALIZER_PRESETS: Record<string, EqualizerPreset> = {
  flat: {
    name: 'Flat',
    description: '平直响应，无频率调整',
    bands: STANDARD_10_BAND_FREQUENCIES.map(f => ({ frequency: f.frequency, gain: 0, q: 1 })),
  },
  bass: {
    name: 'Bass Boost',
    description: '增强低频，适合电子音乐',
    bands: [
      { frequency: 31, gain: 8, q: 1 },
      { frequency: 62, gain: 6, q: 1 },
      { frequency: 125, gain: 3, q: 1 },
      { frequency: 250, gain: 0, q: 1 },
      { frequency: 500, gain: 0, q: 1 },
      { frequency: 1000, gain: 0, q: 1 },
      { frequency: 2000, gain: 0, q: 1 },
      { frequency: 4000, gain: 0, q: 1 },
      { frequency: 8000, gain: 0, q: 1 },
      { frequency: 16000, gain: 0, q: 1 },
    ],
  },
  treble: {
    name: 'Treble Boost',
    description: '增强高频，提升清晰度',
    bands: [
      { frequency: 31, gain: 0, q: 1 },
      { frequency: 62, gain: 0, q: 1 },
      { frequency: 125, gain: 0, q: 1 },
      { frequency: 250, gain: 0, q: 1 },
      { frequency: 500, gain: 0, q: 1 },
      { frequency: 1000, gain: 0, q: 1 },
      { frequency: 2000, gain: 2, q: 1 },
      { frequency: 4000, gain: 4, q: 1 },
      { frequency: 8000, gain: 6, q: 1 },
      { frequency: 16000, gain: 8, q: 1 },
    ],
  },
  vocal: {
    name: 'Vocal',
    description: '突出人声频率',
    bands: [
      { frequency: 31, gain: -2, q: 1 },
      { frequency: 62, gain: -2, q: 1 },
      { frequency: 125, gain: -1, q: 1 },
      { frequency: 250, gain: 0, q: 1 },
      { frequency: 500, gain: 3, q: 1 },
      { frequency: 1000, gain: 4, q: 1 },
      { frequency: 2000, gain: 3, q: 1 },
      { frequency: 4000, gain: 2, q: 1 },
      { frequency: 8000, gain: 0, q: 1 },
      { frequency: 16000, gain: -2, q: 1 },
    ],
  },
  rock: {
    name: 'Rock',
    description: '摇滚风格，强调中低频',
    bands: [
      { frequency: 31, gain: 6, q: 1 },
      { frequency: 62, gain: 5, q: 1 },
      { frequency: 125, gain: 3, q: 1 },
      { frequency: 250, gain: -1, q: 1 },
      { frequency: 500, gain: -1, q: 1 },
      { frequency: 1000, gain: 2, q: 1 },
      { frequency: 2000, gain: 4, q: 1 },
      { frequency: 4000, gain: 4, q: 1 },
      { frequency: 8000, gain: 3, q: 1 },
      { frequency: 16000, gain: 3, q: 1 },
    ],
  },
  jazz: {
    name: 'Jazz',
    description: '爵士风格，平衡的中高频',
    bands: [
      { frequency: 31, gain: 3, q: 1 },
      { frequency: 62, gain: 2, q: 1 },
      { frequency: 125, gain: 1, q: 1 },
      { frequency: 250, gain: 2, q: 1 },
      { frequency: 500, gain: -1, q: 1 },
      { frequency: 1000, gain: -1, q: 1 },
      { frequency: 2000, gain: 0, q: 1 },
      { frequency: 4000, gain: 2, q: 1 },
      { frequency: 8000, gain: 4, q: 1 },
      { frequency: 16000, gain: 5, q: 1 },
    ],
  },
  classical: {
    name: 'Classical',
    description: '古典音乐，保持动态范围',
    bands: [
      { frequency: 31, gain: 3, q: 1 },
      { frequency: 62, gain: 2, q: 1 },
      { frequency: 125, gain: 2, q: 1 },
      { frequency: 250, gain: 2, q: 1 },
      { frequency: 500, gain: 0, q: 1 },
      { frequency: 1000, gain: 0, q: 1 },
      { frequency: 2000, gain: 0, q: 1 },
      { frequency: 4000, gain: 2, q: 1 },
      { frequency: 8000, gain: 3, q: 1 },
      { frequency: 16000, gain: 4, q: 1 },
    ],
  },
}

/**
 * 均衡器配置选项
 */
export interface EqualizerOptions {
  bands?: EqualizerBand[]
  preset?: keyof typeof EQUALIZER_PRESETS
}

/**
 * 10 段参数均衡器
 *
 * 基于 Web Audio API 的 BiquadFilterNode
 */
export class Equalizer {
  private audioContext: AudioContext
  private filters: BiquadFilterNode[] = []
  private bands: EqualizerBand[]

  constructor(audioContext: AudioContext, options: EqualizerOptions = {}) {
    this.audioContext = audioContext

    // 初始化频段
    if (options.preset && EQUALIZER_PRESETS[options.preset]) {
      this.bands = EQUALIZER_PRESETS[options.preset].bands.map(b => ({
        ...b,
        enabled: true,
      }))
    } else if (options.bands) {
      this.bands = options.bands
    } else {
      // 默认使用 Flat 预设
      this.bands = EQUALIZER_PRESETS.flat.bands.map(b => ({
        ...b,
        enabled: true,
      }))
    }

    // 创建滤波器链
    this.createFilters()
  }

  /**
   * 创建滤波器链
   */
  private createFilters(): void {
    // 清理现有滤波器
    this.filters.forEach(filter => filter.disconnect())
    this.filters = []

    // 为每个频段创建峰型滤波器
    this.bands.forEach(band => {
      const filter = this.audioContext.createBiquadFilter()
      filter.type = 'peaking'
      filter.frequency.value = band.frequency
      filter.gain.value = band.enabled ? band.gain : 0
      filter.Q.value = band.q

      this.filters.push(filter)
    })

    // 连接滤波器链
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1])
    }
  }

  /**
   * 获取输入节点
   */
  getInput(): BiquadFilterNode {
    return this.filters[0]
  }

  /**
   * 获取输出节点
   */
  getOutput(): BiquadFilterNode {
    return this.filters[this.filters.length - 1]
  }

  /**
   * 获取所有频段配置
   */
  getBands(): EqualizerBand[] {
    return this.bands.map(band => ({ ...band }))
  }

  /**
   * 获取指定频段的增益
   */
  getBandGain(frequency: number): number {
    const band = this.bands.find(b => b.frequency === frequency)
    return band?.gain ?? 0
  }

  /**
   * 设置指定频段的增益
   */
  setBandGain(frequency: number, gain: number): void {
    const bandIndex = this.bands.findIndex(b => b.frequency === frequency)
    if (bandIndex === -1) return

    // 限制增益范围
    const clampedGain = Math.max(-12, Math.min(12, gain))

    this.bands[bandIndex].gain = clampedGain
    this.bands[bandIndex].enabled = clampedGain !== 0

    // 平滑更新滤波器增益
    const filter = this.filters[bandIndex]
    if (filter) {
      filter.gain.setTargetAtTime(clampedGain, this.audioContext.currentTime, 0.01)
    }
  }

  /**
   * 设置指定频段的品质因数（Q 值）
   */
  setBandQ(frequency: number, q: number): void {
    const bandIndex = this.bands.findIndex(b => b.frequency === frequency)
    if (bandIndex === -1) return

    // 限制 Q 值范围
    const clampedQ = Math.max(0.1, Math.min(10, q))

    this.bands[bandIndex].q = clampedQ

    const filter = this.filters[bandIndex]
    if (filter) {
      filter.Q.setTargetAtTime(clampedQ, this.audioContext.currentTime, 0.01)
    }
  }

  /**
   * 启用/禁用指定频段
   */
  setBandEnabled(frequency: number, enabled: boolean): void {
    const bandIndex = this.bands.findIndex(b => b.frequency === frequency)
    if (bandIndex === -1) return

    this.bands[bandIndex].enabled = enabled

    const filter = this.filters[bandIndex]
    if (filter) {
      const targetGain = enabled ? this.bands[bandIndex].gain : 0
      filter.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.01)
    }
  }

  /**
   * 应用预设
   */
  applyPreset(presetName: keyof typeof EQUALIZER_PRESETS): void {
    const preset = EQUALIZER_PRESETS[presetName]
    if (!preset) {
      throw new Error(`未知的均衡器预设: ${presetName}`)
    }

    // 更新频段配置
    this.bands = preset.bands.map(b => ({
      ...b,
      enabled: b.gain !== 0,
    }))

    // 重新创建滤波器链
    this.createFilters()
  }

  /**
   * 获取所有可用的预设名称
   */
  getAvailablePresets(): string[] {
    return Object.keys(EQUALIZER_PRESETS)
  }

  /**
   * 重置所有频段为平直
   */
  reset(): void {
    this.applyPreset('flat')
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
    this.filters.forEach(filter => filter.disconnect())
  }

  /**
   * 销毁均衡器
   */
  dispose(): void {
    this.disconnect()
    this.filters = []
  }

  /**
   * 启用/禁用均衡器
   */
  setEnabled(enabled: boolean): void {
    this.bands.forEach((band, index) => {
      band.enabled = enabled
      const filter = this.filters[index]
      if (filter) {
        filter.gain.value = enabled ? band.gain : 0
      }
    })
  }

  /**
   * 检查均衡器是否启用
   */
  isEnabled(): boolean {
    return this.bands.every(band => band.enabled)
  }

  /**
   * 导出当前配置
   */
  exportConfig(): EqualizerBand[] {
    return this.getBands()
  }

  /**
   * 导入配置
   */
  importConfig(bands: EqualizerBand[]): void {
    this.bands = bands.map(band => ({
      ...band,
      enabled: band.enabled ?? true,
    }))
    this.createFilters()
  }
}

/**
 * 创建均衡器实例
 */
export function createEqualizer(
  audioContext: AudioContext,
  options?: EqualizerOptions
): Equalizer {
  return new Equalizer(audioContext, options)
}
