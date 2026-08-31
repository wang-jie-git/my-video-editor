/**
 * Phase 6 音频处理模块测试
 *
 * 测试均衡器、压缩器、混响、音频效果链
 */

import { describe, it, expect, beforeEach, vi } from 'bun:test'

// ==================== 测试辅助 ====================

/**
 * 模拟 AudioContext
 */
function createMockAudioContext() {
  return {
    createBiquadFilter: () => ({
      type: 'peaking',
      frequency: { value: 0, setTargetAtTime: vi.fn() },
      gain: { value: 0, setTargetAtTime: vi.fn() },
      Q: { value: 0, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createGain: () => ({
      gain: { value: 0, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createDelay: () => ({
      delayTime: { value: 0, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createConvolver: () => ({
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as ConvolverNode),
    createAnalyser: () => ({
      fftSize: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createDynamicsCompressor: () => ({
      threshold: { value: 0, setTargetAtTime: vi.fn() },
      ratio: { value: 0, setTargetAtTime: vi.fn() },
      attack: { value: 0, setTargetAtTime: vi.fn() },
      release: { value: 0, setTargetAtTime: vi.fn() },
      knee: { value: 0, setTargetAtTime: vi.fn() },
      reduction: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    createBuffer: vi.fn(() => ({
      length: 1,
      numberOfChannels: 1,
      sampleRate: 44100,
      duration: 1 / 44100,
      getChannelData: vi.fn(() => new Float32Array(1)),
    })),
    sampleRate: 44100,
    currentTime: 0,
    close: vi.fn(),
  } as unknown as AudioContext
}

// ==================== 均衡器测试 ====================

describe('Equalizer', () => {
  let audioContext: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    audioContext = createMockAudioContext()
  })

  it('should create equalizer with default flat preset', async () => {
    const { Equalizer } = await import('../equalizer')
    const eq = new Equalizer(audioContext)

    const bands = eq.getBands()
    expect(bands.length).toBe(10)
    expect(bands.every(b => b.gain === 0)).toBe(true)

    eq.dispose()
  })

  it('should create equalizer with custom preset', async () => {
    const { Equalizer, EQUALIZER_PRESETS } = await import('../equalizer')
    const eq = new Equalizer(audioContext, {
      preset: 'bass',
    })

    const bands = eq.getBands()
    expect(bands.length).toBe(10)
    expect(bands[0].gain).toBe(8) // 31Hz 应该被提升

    eq.dispose()
  })

  it('should set band gain', async () => {
    const { Equalizer } = await import('../equalizer')
    const eq = new Equalizer(audioContext)

    eq.setBandGain(1000, 6)

    const bands = eq.getBands()
    const band1kHz = bands.find(b => b.frequency === 1000)
    expect(band1kHz?.gain).toBe(6)

    eq.dispose()
  })

  it('should clamp band gain to valid range', async () => {
    const { Equalizer } = await import('../equalizer')
    const eq = new Equalizer(audioContext)

    eq.setBandGain(1000, 20) // 超出范围
    let bands = eq.getBands()
    let band1kHz = bands.find(b => b.frequency === 1000)
    expect(band1kHz?.gain).toBe(12) // 应该被限制为 12

    eq.setBandGain(1000, -20) // 超出范围
    bands = eq.getBands()
    band1kHz = bands.find(b => b.frequency === 1000)
    expect(band1kHz?.gain).toBe(-12) // 应该被限制为 -12

    eq.dispose()
  })

  it('should apply different presets', async () => {
    const { Equalizer } = await import('../equalizer')
    const eq = new Equalizer(audioContext)

    eq.applyPreset('bass')
    let bands = eq.getBands()
    expect(bands[0].gain).toBe(8)

    eq.applyPreset('treble')
    bands = eq.getBands()
    expect(bands[9].gain).toBe(8)

    eq.applyPreset('flat')
    bands = eq.getBands()
    expect(bands.every(b => b.gain === 0)).toBe(true)

    eq.dispose()
  })

  it('should list available presets', async () => {
    const { Equalizer } = await import('../equalizer')
    const eq = new Equalizer(audioContext)

    const presets = eq.getAvailablePresets()
    expect(presets.length).toBeGreaterThan(0)
    expect(presets).toContain('flat')
    expect(presets).toContain('bass')

    eq.dispose()
  })

  it('should export and import config', async () => {
    const { Equalizer } = await import('../equalizer')
    const eq = new Equalizer(audioContext)

    eq.setBandGain(1000, 6)
    eq.setBandGain(2000, -3)

    const config = eq.exportConfig()

    const newEq = new Equalizer(audioContext)
    newEq.importConfig(config)

    const newBands = newEq.getBands()
    expect(newBands.find(b => b.frequency === 1000)?.gain).toBe(6)
    expect(newBands.find(b => b.frequency === 2000)?.gain).toBe(-3)

    eq.dispose()
    newEq.dispose()
  })

  it('should reset to flat', async () => {
    const { Equalizer } = await import('../equalizer')
    const eq = new Equalizer(audioContext)

    eq.setBandGain(1000, 6)
    eq.reset()

    const bands = eq.getBands()
    expect(bands.every(b => b.gain === 0)).toBe(true)

    eq.dispose()
  })
})

// ==================== 压缩器测试 ====================

describe('Compressor', () => {
  let audioContext: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    audioContext = createMockAudioContext()
  })

  it('should create compressor with default options', async () => {
    const { Compressor } = await import('../compressor')
    const comp = new Compressor(audioContext)

    const options = comp.getOptions()
    expect(options.threshold).toBe(-24)
    expect(options.ratio).toBe(12)

    comp.dispose()
  })

  it('should set threshold', async () => {
    const { Compressor } = await import('../compressor')
    const comp = new Compressor(audioContext)

    comp.setThreshold(-15)
    const options = comp.getOptions()
    expect(options.threshold).toBe(-15)

    comp.dispose()
  })

  it('should clamp threshold to valid range', async () => {
    const { Compressor } = await import('../compressor')
    const comp = new Compressor(audioContext)

    comp.setThreshold(10) // 超出范围
    let options = comp.getOptions()
    expect(options.threshold).toBe(0)

    comp.setThreshold(-80) // 超出范围
    options = comp.getOptions()
    expect(options.threshold).toBe(-60)

    comp.dispose()
  })

  it('should set ratio', async () => {
    const { Compressor } = await import('../compressor')
    const comp = new Compressor(audioContext)

    comp.setRatio(4)
    const options = comp.getOptions()
    expect(options.ratio).toBe(4)

    comp.dispose()
  })

  it('should apply presets', async () => {
    const { Compressor, COMPRESSOR_PRESETS } = await import('../compressor')
    const comp = new Compressor(audioContext)

    comp.applyPreset('vocal')
    let options = comp.getOptions()
    expect(options.threshold).toBe(COMPRESSOR_PRESETS.vocal.options.threshold)

    comp.applyPreset('podcast')
    options = comp.getOptions()
    expect(options.ratio).toBe(COMPRESSOR_PRESETS.podcast.options.ratio)

    comp.dispose()
  })

  it('should enable/disable compressor', async () => {
    const { Compressor } = await import('../compressor')
    const comp = new Compressor(audioContext)

    expect(comp.isEnabled()).toBe(true)

    comp.setEnabled(false)
    expect(comp.isEnabled()).toBe(false)

    comp.setEnabled(true)
    expect(comp.isEnabled()).toBe(true)

    comp.dispose()
  })

  it('should list available presets', async () => {
    const { Compressor } = await import('../compressor')
    const comp = new Compressor(audioContext)

    const presets = comp.getAvailablePresets()
    expect(presets.length).toBeGreaterThan(0)
    expect(presets).toContain('off')
    expect(presets).toContain('vocal')

    comp.dispose()
  })

  it('should export and import config', async () => {
    const { Compressor } = await import('../compressor')
    const comp = new Compressor(audioContext, {
      threshold: -20,
      ratio: 6,
    })

    const config = comp.exportConfig()
    expect(config.threshold).toBe(-20)
    expect(config.ratio).toBe(6)

    const newComp = new Compressor(audioContext)
    newComp.importConfig(config)

    const newOptions = newComp.getOptions()
    expect(newOptions.threshold).toBe(-20)
    expect(newOptions.ratio).toBe(6)

    comp.dispose()
    newComp.dispose()
  })
})

// ==================== 混响测试 ====================

describe('Reverb', () => {
  let audioContext: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    audioContext = createMockAudioContext()
  })

  it('should create reverb with default options', async () => {
    const { Reverb } = await import('../reverb')
    const reverb = new Reverb(audioContext)

    const options = reverb.getOptions()
    expect(options.type).toBe('convolver')
    expect(options.decay).toBe(1.5)

    reverb.dispose()
  })

  it('should set decay', async () => {
    const { Reverb } = await import('../reverb')
    const reverb = new Reverb(audioContext)

    reverb.setDecay(2.5)
    const options = reverb.getOptions()
    expect(options.decay).toBe(2.5)

    reverb.dispose()
  })

  it('should set wet/dry mix', async () => {
    const { Reverb } = await import('../reverb')
    const reverb = new Reverb(audioContext)

    reverb.setWetMix(0.6)
    reverb.setDryMix(0.4)

    const options = reverb.getOptions()
    expect(options.wetMix).toBe(0.6)
    expect(options.dryMix).toBe(0.4)

    reverb.dispose()
  })

  it('should apply presets', async () => {
    const { Reverb, REVERB_PRESETS } = await import('../reverb')
    const reverb = new Reverb(audioContext)

    reverb.applyPreset('hall')
    let options = reverb.getOptions()
    expect(options.decay).toBe(REVERB_PRESETS.hall.decay)

    reverb.applyPreset('smallRoom')
    options = reverb.getOptions()
    expect(options.wetMix).toBe(REVERB_PRESETS.smallRoom.wetMix)

    reverb.dispose()
  })

  it('should list available presets', async () => {
    const { Reverb } = await import('../reverb')
    const reverb = new Reverb(audioContext)

    const presets = reverb.getAvailablePresets()
    expect(presets.length).toBeGreaterThan(0)
    expect(presets).toContain('off')
    expect(presets).toContain('hall')

    reverb.dispose()
  })

  it('should export and import config', async () => {
    const { Reverb } = await import('../reverb')
    const reverb = new Reverb(audioContext, {
      preset: 'smallRoom',
    })

    const config = reverb.exportConfig()
    expect(config.decay).toBe(0.8)

    const newReverb = new Reverb(audioContext)
    newReverb.importConfig(config)

    const newOptions = newReverb.getOptions()
    expect(newOptions.decay).toBe(0.8)

    reverb.dispose()
    newReverb.dispose()
  })
})

// ==================== 音频效果链测试 ====================

describe('AudioEffectsChain', () => {
  let audioContext: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    audioContext = createMockAudioContext()
  })

  it('should create empty effects chain', async () => {
    const { AudioEffectsChain } = await import('../audio-processor')
    const chain = new AudioEffectsChain(audioContext)

    const status = chain.getEffectStatus()
    expect(Object.keys(status).length).toBe(0)

    chain.dispose()
  })

  it('should add and remove equalizer', async () => {
    const { AudioEffectsChain } = await import('../audio-processor')
    const chain = new AudioEffectsChain(audioContext)

    chain.addEqualizer('main-eq')
    let status = chain.getEffectStatus()
    expect(status['main-eq']).toBeDefined()
    expect(status['main-eq'].type).toBe('equalizer')

    chain.removeEqualizer('main-eq')
    status = chain.getEffectStatus()
    expect(status['main-eq']).toBeUndefined()

    chain.dispose()
  })

  it('should add and remove compressor', async () => {
    const { AudioEffectsChain } = await import('../audio-processor')
    const chain = new AudioEffectsChain(audioContext)

    chain.addCompressor('main-comp')
    let status = chain.getEffectStatus()
    expect(status['main-comp']).toBeDefined()
    expect(status['main-comp'].type).toBe('compressor')

    chain.removeCompressor('main-comp')
    status = chain.getEffectStatus()
    expect(status['main-comp']).toBeUndefined()

    chain.dispose()
  })

  it('should add and remove reverb', async () => {
    const { AudioEffectsChain } = await import('../audio-processor')
    const chain = new AudioEffectsChain(audioContext)

    chain.addReverb('main-reverb')
    let status = chain.getEffectStatus()
    expect(status['main-reverb']).toBeDefined()
    expect(status['main-reverb'].type).toBe('reverb')

    chain.removeReverb('main-reverb')
    status = chain.getEffectStatus()
    expect(status['main-reverb']).toBeUndefined()

    chain.dispose()
  })

  it('should toggle effect enabled state', async () => {
    const { AudioEffectsChain } = await import('../audio-processor')
    const chain = new AudioEffectsChain(audioContext)

    chain.addEqualizer('eq')

    chain.setEffectEnabled('eq', false)
    let status = chain.getEffectStatus()
    expect(status['eq'].enabled).toBe(false)

    chain.setEffectEnabled('eq', true)
    status = chain.getEffectStatus()
    expect(status['eq'].enabled).toBe(true)

    chain.dispose()
  })

  it('should apply presets to effects', async () => {
    const { AudioEffectsChain } = await import('../audio-processor')
    const chain = new AudioEffectsChain(audioContext)

    chain.addEqualizer('eq')
    chain.addCompressor('comp')
    chain.addReverb('reverb')

    chain.applyPreset('equalizer', 'bass')
    chain.applyPreset('compressor', 'vocal')
    chain.applyPreset('reverb', 'smallRoom')

    const config = chain.getConfig()
    expect(config.equalizer?.options).toBeDefined()
    expect(config.compressor?.options).toBeDefined()
    expect(config.reverb?.options).toBeDefined()

    chain.dispose()
  })

  it('should export and import config', async () => {
    const { AudioEffectsChain } = await import('../audio-processor')
    const chain = new AudioEffectsChain(audioContext)

    chain.addEqualizer('eq', { preset: 'rock' })
    chain.addCompressor('comp', { preset: 'heavy' })
    chain.addReverb('reverb', { preset: 'hall' })

    const config = chain.getConfig()

    chain.dispose()

    const newChain = new AudioEffectsChain(audioContext)
    newChain.fromConfig(config)

    const newConfig = newChain.getConfig()
    expect(newConfig.equalizer).toBeDefined()
    expect(newConfig.compressor).toBeDefined()
    expect(newConfig.reverb).toBeDefined()

    newChain.dispose()
  })

  it('should reset all effects', async () => {
    const { AudioEffectsChain } = await import('../audio-processor')
    const chain = new AudioEffectsChain(audioContext)

    chain.addEqualizer('eq', { preset: 'bass' })
    chain.addCompressor('comp')

    chain.reset()

    const status = chain.getEffectStatus()
    expect(Object.keys(status).length).toBe(0)

    chain.dispose()
  })

  it('should list available presets', async () => {
    const { AudioEffectsChain } = await import('../audio-processor')
    const presets = AudioEffectsChain.getAvailablePresets()

    expect(presets.equalizer.length).toBeGreaterThan(0)
    expect(presets.compressor.length).toBeGreaterThan(0)
    expect(presets.reverb.length).toBeGreaterThan(0)
  })
})
