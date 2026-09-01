/**
 * AudioEffectsPanel - 音频效果控制面板
 *
 * 提供完整的音频效果编辑界面
 * 包括均衡器、压缩器、混响
 */

import React, { useState, useCallback, useEffect } from 'react'
import type { AudioEffectsChainConfig } from '@/services/renderer/audio'
import { AudioEffectsChain, type EqualizerBand } from '@/services/renderer/audio'
import { EQUALIZER_PRESETS, COMPRESSOR_PRESETS, REVERB_PRESETS, type CompressorState } from '@/services/renderer/audio'
import styles from './audio-effects-panel.module.css'

export interface AudioEffectsPanelProps {
  /** 初始配置 */
  initialConfig?: AudioEffectsChainConfig
  /** 配置变化回调 */
  onConfigChange?: (config: AudioEffectsChainConfig) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示标题 */
  showTitle?: boolean
}

type ActiveTab = 'equalizer' | 'compressor' | 'reverb' | 'presets'

/**
 * AudioEffectsPanel 组件
 *
 * 提供音频效果管理、参数调整、预设选择等功能
 */
export function AudioEffectsPanel({
  initialConfig,
  onConfigChange,
  disabled = false,
  showTitle = true,
}: AudioEffectsPanelProps) {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [effectsChain, setEffectsChain] = useState<AudioEffectsChain | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('equalizer')
  const [config, setConfig] = useState<AudioEffectsChainConfig>(
    initialConfig || {
      equalizer: {
        id: 'equalizer',
        type: 'equalizer',
        enabled: true,
        options: {},
      },
      compressor: {
        id: 'compressor',
        type: 'compressor',
        enabled: true,
        options: {},
      },
      reverb: {
        id: 'reverb',
        type: 'reverb',
        enabled: false,
        options: {},
      },
    }
  )
  const [compressorState, setCompressorState] = useState<CompressorState | null>(null)

  // 初始化 AudioContext 和效果链
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ctx = new AudioContext()
      const chain = new AudioEffectsChain(ctx)

      setAudioContext(ctx)
      setEffectsChain(chain)

      // 从初始配置恢复效果
      if (initialConfig) {
        chain.fromConfig(initialConfig)
        setConfig(initialConfig)
      } else {
        // 添加默认效果器
        chain.addEqualizer('equalizer', {})
        chain.addCompressor('compressor', {})
        chain.addReverb('reverb', { preset: 'off' })
      }

      return () => {
        chain.dispose()
        ctx.close()
      }
    }
  }, [])

  // 更新配置并通知
  const updateConfig = useCallback(
    (newConfig: AudioEffectsChainConfig) => {
      setConfig(newConfig)
      onConfigChange?.(newConfig)

      // 应用到效果链
      if (effectsChain) {
        effectsChain.fromConfig(newConfig)
      }
    },
    [effectsChain, onConfigChange]
  )

  // 启用/禁用效果器
  const handleToggleEffect = useCallback(
    (type: 'equalizer' | 'compressor' | 'reverb') => {
      const newConfig = {
        ...config,
        [type]: config[type]
          ? { ...config[type], enabled: !config[type].enabled }
          : undefined,
      }
      updateConfig(newConfig)

      if (effectsChain) {
        effectsChain.setEffectEnabled(type, !config[type]?.enabled)
      }
    },
    [config, effectsChain, updateConfig]
  )

  // 应用均衡器预设
  const handleApplyEqualizerPreset = useCallback(
    (presetName: string) => {
      if (!effectsChain) return

      effectsChain.applyPreset('equalizer', presetName)
      const eq = effectsChain.getEqualizer()
      if (eq) {
        updateConfig({
          ...config,
          equalizer: {
            id: 'equalizer',
            type: 'equalizer',
            enabled: config.equalizer?.enabled ?? true,
            options: { preset: presetName as keyof typeof EQUALIZER_PRESETS },
          },
        })
      }
    },
    [effectsChain, config, updateConfig]
  )

  // 应用压缩器预设
  const handleApplyCompressorPreset = useCallback(
    (presetName: string) => {
      if (!effectsChain) return

      effectsChain.applyPreset('compressor', presetName)
      const comp = effectsChain.getCompressor()
      if (comp) {
        updateConfig({
          ...config,
          compressor: {
            id: 'compressor',
            type: 'compressor',
            enabled: config.compressor?.enabled ?? true,
            options: { preset: presetName as keyof typeof COMPRESSOR_PRESETS },
          },
        })
      }
    },
    [effectsChain, config, updateConfig]
  )

  // 应用混响预设
  const handleApplyReverbPreset = useCallback(
    (presetName: string) => {
      if (!effectsChain) return

      effectsChain.applyPreset('reverb', presetName)
      const reverb = effectsChain.getReverb()
      if (reverb) {
        updateConfig({
          ...config,
          reverb: {
            id: 'reverb',
            type: 'reverb',
            enabled: true,
            options: { preset: presetName as keyof typeof REVERB_PRESETS },
          },
        })
      }
    },
    [effectsChain, config, updateConfig]
  )

  // 更新均衡器频段增益
  const handleUpdateEqualizerBand = useCallback(
    (bandIndex: number, gain: number) => {
      if (!effectsChain) return

      const eq = effectsChain.getEqualizer()
      if (!eq) return

      const bands = eq.getBands()
      const frequency = bands[bandIndex]?.frequency
      if (frequency) {
        eq.setBandGain(frequency, gain)

        // 更新配置
        const newOptions = { ...config.equalizer?.options }
        updateConfig({
          ...config,
          equalizer: {
            ...config.equalizer!,
            options: newOptions,
          },
        })
      }
    },
    [effectsChain, config, updateConfig]
  )

  // 重置所有效果
  const handleResetAll = useCallback(() => {
    if (!effectsChain) return

    effectsChain.reset()
    updateConfig({})

    setCompressorState(null)
  }, [effectsChain, updateConfig])

  if (!effectsChain) {
    return (
      <div className={styles.audioEffectsPanel}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  const eq = effectsChain.getEqualizer()
  const comp = effectsChain.getCompressor()
  const reverb = effectsChain.getReverb()
  const bands = eq?.getBands() || []

  return (
    <div className={`${styles.audioEffectsPanel} ${disabled ? styles.disabled : ''}`}>
      {showTitle && (
        <div className={styles.panelHeader}>
          <h3>Audio Effects</h3>
          <button className={styles.resetButton} onClick={handleResetAll} disabled={disabled}>
            Reset All
          </button>
        </div>
      )}

      {/* Tab 导航 */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabButton} ${activeTab === 'equalizer' ? styles.active : ''}`}
          onClick={() => setActiveTab('equalizer')}
        >
          Equalizer
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'compressor' ? styles.active : ''}`}
          onClick={() => setActiveTab('compressor')}
        >
          Compressor
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'reverb' ? styles.active : ''}`}
          onClick={() => setActiveTab('reverb')}
        >
          Reverb
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'presets' ? styles.active : ''}`}
          onClick={() => setActiveTab('presets')}
        >
          Presets
        </button>
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        {/* 均衡器 */}
        {activeTab === 'equalizer' && (
          <div className={styles.effectsSection}>
            <div className={styles.sectionHeader}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={config.equalizer?.enabled ?? true}
                  onChange={() => handleToggleEffect('equalizer')}
                  disabled={disabled}
                />
                Enable Equalizer
              </label>
              <select
                className={styles.presetSelect}
                onChange={(e) => {
                  if (e.target.value) {
                    handleApplyEqualizerPreset(e.target.value)
                    e.target.value = ''
                  }
                }}
                disabled={disabled}
                defaultValue=""
              >
                <option value="" disabled>
                  Apply Preset
                </option>
                {Object.keys(EQUALIZER_PRESETS).map((preset) => (
                  <option key={preset} value={preset}>
                    {EQUALIZER_PRESETS[preset].name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.equalizerBands}>
              {bands.map((band, index) => (
                <div key={band.frequency} className={styles.band}>
                  <div className={styles.bandLabel}>{band.frequency}Hz</div>
                  <input
                    type="range"
                    className={styles.slider}
                    min="-12"
                    max="12"
                    step="1"
                    value={band.gain}
                    onChange={(e) => handleUpdateEqualizerBand(index, parseFloat(e.target.value))}
                    disabled={disabled || !config.equalizer?.enabled}
                  />
                  <div className={styles.bandValue}>{band.gain > 0 ? '+' : ''}{band.gain}dB</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 压缩器 */}
        {activeTab === 'compressor' && (
          <div className={styles.effectsSection}>
            <div className={styles.sectionHeader}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={config.compressor?.enabled ?? true}
                  onChange={() => handleToggleEffect('compressor')}
                  disabled={disabled}
                />
                Enable Compressor
              </label>
              <select
                className={styles.presetSelect}
                onChange={(e) => {
                  if (e.target.value) {
                    handleApplyCompressorPreset(e.target.value)
                    e.target.value = ''
                  }
                }}
                disabled={disabled}
                defaultValue=""
              >
                <option value="" disabled>
                  Apply Preset
                </option>
                {Object.keys(COMPRESSOR_PRESETS).map((preset) => (
                  <option key={preset} value={preset}>
                    {COMPRESSOR_PRESETS[preset].name}
                  </option>
                ))}
              </select>
            </div>

            {comp && (
              <div className={styles.compressorControls}>
                <div className={styles.controlGroup}>
                  <label className={styles.controlLabel}>Threshold</label>
                  <div className={styles.sliderWithValue}>
                    <input
                      type="range"
                      className={styles.slider}
                      min="-60"
                      max="0"
                      step="1"
                      value={compressorState?.threshold ?? config.compressor?.options ? -24 : 0}
                      disabled={disabled}
                      onChange={(e) => {
                            // TODO: Implement threshold update
                          }}
                    />
                    <span className={styles.valueLabel}>
                      {compressorState?.threshold ?? -24}dB
                    </span>
                  </div>
                </div>

                <div className={styles.controlGroup}>
                  <label className={styles.controlLabel}>Ratio</label>
                  <div className={styles.sliderWithValue}>
                    <input
                      type="range"
                      className={styles.slider}
                      min="1"
                      max="20"
                      step="0.5"
                      value={config.compressor?.options && 'ratio' in config.compressor.options ? config.compressor.options.ratio as number : 12}
                      disabled={disabled}
                      onChange={(e) => {
                            // TODO: Implement ratio update
                          }}
                    />
                    <span className={styles.valueLabel}>
                      {config.compressor?.options && 'ratio' in config.compressor.options ? config.compressor.options.ratio : 12}:1
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 混响 */}
        {activeTab === 'reverb' && (
          <div className={styles.effectsSection}>
            <div className={styles.sectionHeader}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={config.reverb?.enabled ?? false}
                  onChange={() => handleToggleEffect('reverb')}
                  disabled={disabled}
                />
                Enable Reverb
              </label>
              <select
                className={styles.presetSelect}
                onChange={(e) => {
                  if (e.target.value) {
                    handleApplyReverbPreset(e.target.value)
                    e.target.value = ''
                  }
                }}
                disabled={disabled || !config.reverb?.enabled}
                defaultValue=""
              >
                <option value="" disabled>
                  Apply Preset
                </option>
                {Object.keys(REVERB_PRESETS).map((preset) => (
                  <option key={preset} value={preset}>
                    {REVERB_PRESETS[preset].name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.reverbControls}>
              <div className={styles.controlGroup}>
                <label className={styles.controlLabel}>Decay</label>
                <div className={styles.sliderWithValue}>
                  <input
                    type="range"
                    className={styles.slider}
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={config.reverb?.options && 'decay' in config.reverb.options ? config.reverb.options.decay as number : 1.5}
                    disabled={disabled || !config.reverb?.enabled}
                    onChange={(e) => {
                          // TODO: Implement decay update
                        }}
                  />
                  <span className={styles.valueLabel}>
                    {config.reverb?.options && 'decay' in config.reverb.options ? (config.reverb.options.decay as number).toFixed(1) : 1.5}s
                  </span>
                </div>
              </div>

              <div className={styles.controlGroup}>
                <label className={styles.controlLabel}>Wet Mix</label>
                <div className={styles.sliderWithValue}>
                  <input
                    type="range"
                    className={styles.slider}
                    min="0"
                    max="1"
                    step="0.01"
                    value={config.reverb?.options && 'wetMix' in config.reverb.options ? config.reverb.options.wetMix as number : 0.3}
                    disabled={disabled || !config.reverb?.enabled}
                    onChange={(e) => {
                          // TODO: Implement wet mix update
                        }}
                  />
                  <span className={styles.valueLabel}>
                    {Math.round((config.reverb?.options && 'wetMix' in config.reverb.options ? config.reverb.options.wetMix as number : 0.3) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 预设 */}
        {activeTab === 'presets' && (
          <div className={styles.presetsSection}>
            <div className={styles.presetCategory}>
              <h4>Equalizer Presets</h4>
              <div className={styles.presetList}>
                {Object.entries(EQUALIZER_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    className={styles.presetButton}
                    onClick={() => handleApplyEqualizerPreset(key)}
                    disabled={disabled}
                  >
                    <div className={styles.presetName}>{preset.name}</div>
                    <div className={styles.presetDescription}>{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.presetCategory}>
              <h4>Compressor Presets</h4>
              <div className={styles.presetList}>
                {Object.entries(COMPRESSOR_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    className={styles.presetButton}
                    onClick={() => handleApplyCompressorPreset(key)}
                    disabled={disabled}
                  >
                    <div className={styles.presetName}>{preset.name}</div>
                    <div className={styles.presetDescription}>{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.presetCategory}>
              <h4>Reverb Presets</h4>
              <div className={styles.presetList}>
                {Object.entries(REVERB_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    className={styles.presetButton}
                    onClick={() => handleApplyReverbPreset(key)}
                    disabled={disabled}
                  >
                    <div className={styles.presetName}>{preset.name}</div>
                    <div className={styles.presetDescription}>{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
