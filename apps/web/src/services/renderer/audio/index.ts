/**
 * 音频处理模块
 *
 * 统一导出所有音频处理相关模块
 */

// ==================== 均衡器 ====================

export { Equalizer, createEqualizer } from './equalizer'
export type { EqualizerBand, EqualizerOptions, EqualizerPreset } from './equalizer'
export { EQUALIZER_PRESETS, STANDARD_10_BAND_FREQUENCIES } from './equalizer'

// ==================== 压缩器 ====================

export { Compressor, createCompressor } from './compressor'
export type { CompressorOptions, CompressorPreset, CompressorState } from './compressor'
export { COMPRESSOR_PRESETS } from './compressor'

// ==================== 混响 ====================

export { Reverb, createReverb, generateImpulseResponse } from './reverb'
export type { ReverbOptions, ReverbPreset, ReverbType } from './reverb'
export { REVERB_PRESETS } from './reverb'

// ==================== 音频处理器 ====================

export {
  AudioEffectsChain,
  createAudioEffectsChain,
} from './audio-processor'
export type {
  AudioEffectsChainConfig,
  EffectConfig,
  EffectType,
} from './audio-processor'
