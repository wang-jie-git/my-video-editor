/**
 * Phase 6 音频效果使用示例
 *
 * 展示如何使用：
 * 1. 10 段参数均衡器
 * 2. 音频压缩器
 * 3. 混响效果器
 * 4. 音频效果链
 */

// ==================== 示例 1: 均衡器 ====================

/**
 * 示例 1a: 基础均衡器
 */
async function example1a_basicEqualizer() {
  console.log('=== 示例 1a: 基础均衡器 ===')

  // 创建 AudioContext
  const audioContext = new AudioContext()

  // 创建均衡器
  const { Equalizer } = await import('./equalizer')
  const equalizer = new Equalizer(audioContext)

  // 获取所有频段
  const bands = equalizer.getBands()
  console.log('频段数量:', bands.length)
  console.log('频段频率:', bands.map(b => b.frequency))

  // 设置某个频段的增益
  equalizer.setBandGain(1000, 6) // 1kHz 提升 6dB

  // 连接音频源
  // const source = audioContext.createBufferSource()
  // source.connect(equalizer.getInput())
  // equalizer.getOutput().connect(audioContext.destination)

  equalizer.dispose()
  audioContext.close()
}

/**
 * 示例 1b: 应用均衡器预设
 */
async function example1b_applyEqualizerPreset() {
  console.log('=== 示例 1b: 应用均衡器预设 ===')

  const audioContext = new AudioContext()
  const { createEqualizer, EQUALIZER_PRESETS } = await import('./equalizer')

  // 创建均衡器
  const equalizer = createEqualizer(audioContext, {
    preset: 'bass', // 应用低音增强预设
  })

  console.log('应用预设:', EQUALIZER_PRESETS.bass.name)
  console.log('预设描述:', EQUALIZER_PRESETS.bass.description)

  // 获取所有可用预设
  const availablePresets = equalizer.getAvailablePresets()
  console.log('可用预设:', availablePresets)

  equalizer.dispose()
  audioContext.close()
}

/**
 * 示例 1c: 自定义均衡器配置
 */
async function example1c_customEqualizer() {
  console.log('=== 示例 1c: 自定义均衡器配置 ===')

  const audioContext = new AudioContext()
  const { createEqualizer } = await import('./equalizer')

  // 自定义频段配置
  const customBands = [
    { frequency: 100, gain: 4, q: 1 },
    { frequency: 1000, gain: 2, q: 1 },
    { frequency: 5000, gain: -2, q: 1 },
  ]

  const equalizer = createEqualizer(audioContext, {
    bands: customBands,
  })

  // 导出配置
  const config = equalizer.exportConfig()
  console.log('导出的配置:', config)

  equalizer.dispose()
  audioContext.close()
}

// ==================== 示例 2: 压缩器 ====================

/**
 * 示例 2a: 基础压缩器
 */
async function example2a_basicCompressor() {
  console.log('=== 示例 2a: 基础压缩器 ===')

  const audioContext = new AudioContext()
  const { Compressor } = await import('./compressor')
  const compressor = new Compressor(audioContext)

  // 设置压缩参数
  compressor.setThreshold(-20) // 阈值 -20dB
  compressor.setRatio(4) // 压缩比 4:1
  compressor.setAttack(5) // 启动时间 5ms
  compressor.setRelease(50) // 释放时间 50ms

  // 获取当前状态
  const state = compressor.getState()
  console.log('压缩器状态:', state)

  // 启用压缩器
  compressor.setEnabled(true)

  compressor.dispose()
  audioContext.close()
}

/**
 * 示例 2b: 应用压缩器预设
 */
async function example2b_applyCompressorPreset() {
  console.log('=== 示例 2b: 应用压缩器预设 ===')

  const audioContext = new AudioContext()
  const { createCompressor, COMPRESSOR_PRESETS } = await import('./compressor')

  // 创建压缩器并应用预设
  const compressor = createCompressor(audioContext, {
    preset: 'podcast',
  })

  console.log('应用预设:', COMPRESSOR_PRESETS.podcast.name)
  console.log('预设描述:', COMPRESSOR_PRESETS.podcast.description)

  // 获取所有可用预设
  const availablePresets = compressor.getAvailablePresets()
  console.log('可用预设:', availablePresets)

  compressor.dispose()
  audioContext.close()
}

/**
 * 示例 2c: 监控压缩器状态
 */
async function example2c_monitorCompressor() {
  console.log('=== 示例 2c: 监控压缩器状态 ===')

  const audioContext = new AudioContext()
  const { createCompressor } = await import('./compressor')
  const compressor = createCompressor(audioContext, { preset: 'vocal' })

  // 开始监控
  compressor.startMonitoring((state) => {
    console.log('增益衰减:', state.gainReduction.toFixed(2), 'dB')
  })

  // 模拟音频播放
  // ...

  // 停止监控
  setTimeout(() => {
    compressor.stopMonitoring()
    compressor.dispose()
    audioContext.close()
  }, 5000)
}

// ==================== 示例 3: 混响 ====================

/**
 * 示例 3a: 基础混响
 */
async function example3a_basicReverb() {
  console.log('=== 示例 3a: 基础混响 ===')

  const audioContext = new AudioContext()
  const { Reverb } = await import('./reverb')
  const reverb = new Reverb(audioContext)

  // 设置混响参数
  reverb.setDecay(2.5) // 衰减时间 2.5 秒
  reverb.setDamping(0.5) // 阻尼 50%
  reverb.setPreDelay(20) // 预延迟 20ms
  reverb.setWetMix(0.4) // 湿声混合 40%
  reverb.setDryMix(0.6) // 干声混合 60%

  // 连接音频源
  // const source = audioContext.createBufferSource()
  // source.connect(reverb.getInput())
  // reverb.getOutput().connect(audioContext.destination)

  reverb.dispose()
  audioContext.close()
}

/**
 * 示例 3b: 应用混响预设
 */
async function example3b_applyReverbPreset() {
  console.log('=== 示例 3b: 应用混响预设 ===')

  const audioContext = new AudioContext()
  const { createReverb, REVERB_PRESETS } = await import('./reverb')

  // 创建混响器并应用预设
  const reverb = createReverb(audioContext, {
    preset: 'hall', // 音乐厅预设
  })

  console.log('应用预设:', REVERB_PRESETS.hall.name)
  console.log('预设描述:', REVERB_PRESETS.hall.description)

  // 获取所有可用预设
  const availablePresets = reverb.getAvailablePresets()
  console.log('可用预设:', availablePresets)

  reverb.dispose()
  audioContext.close()
}

/**
 * 示例 3c: 加载自定义脉冲响应
 */
async function example3c_customImpulseResponse() {
  console.log('=== 示例 3c: 加载自定义脉冲响应 ===')

  const audioContext = new AudioContext()
  const { createReverb } = await import('./reverb')
  const reverb = createReverb(audioContext, { type: 'convolver' })

  // 从文件加载脉冲响应
  // const response = await fetch('/impulse-response.wav')
  // const arrayBuffer = await response.arrayBuffer()
  // const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  // await reverb.loadImpulseResponse(audioBuffer)

  console.log('自定义脉冲响应加载完成')

  reverb.dispose()
  audioContext.close()
}

// ==================== 示例 4: 音频效果链 ====================

/**
 * 示例 4a: 创建完整效果链
 */
async function example4a_createEffectsChain() {
  console.log('=== 示例 4a: 创建完整效果链 ===')

  const audioContext = new AudioContext()
  const { AudioEffectsChain } = await import('./audio-processor')
  const { createEqualizer, createCompressor, createReverb } = await import('./audio-processor')

  // 创建效果链
  const chain = new AudioEffectsChain(audioContext)

  // 添加均衡器
  const equalizer = chain.addEqualizer('main-eq', { preset: 'flat' })

  // 添加压缩器
  const compressor = chain.addCompressor('main-comp', { preset: 'moderate' })

  // 添加混响
  const reverb = chain.addReverb('main-reverb', { preset: 'smallRoom' })

  console.log('效果链创建完成')
  console.log('效果器状态:', chain.getEffectStatus())

  // 连接音频源
  // const source = audioContext.createBufferSource()
  // chain.connect(source)
  // chain.getOutput().connect(audioContext.destination)

  chain.dispose()
  audioContext.close()
}

/**
 * 示例 4b: 应用预设到效果链
 */
async function example4b_applyChainPreset() {
  console.log('=== 示例 4b: 应用预设到效果链 ===')

  const audioContext = new AudioContext()
  const { AudioEffectsChain } = await import('./audio-processor')

  const chain = new AudioEffectsChain(audioContext)

  // 添加效果器
  chain.addEqualizer('eq')
  chain.addCompressor('comp')
  chain.addReverb('reverb')

  // 批量应用预设
  chain.applyPreset('equalizer', 'vocal')
  chain.applyPreset('compressor', 'vocal')
  chain.applyPreset('reverb', 'vocal')

  console.log('所有预设应用完成')

  // 导出配置
  const config = chain.getConfig()
  console.log('当前配置:', config)

  chain.dispose()
  audioContext.close()
}

/**
 * 示例 4c: 启用/禁用效果器
 */
async function example4c_toggleEffects() {
  console.log('=== 示例 4c: 启用/禁用效果器 ===')

  const audioContext = new AudioContext()
  const { AudioEffectsChain } = await import('./audio-processor')

  const chain = new AudioEffectsChain(audioContext)
  chain.addEqualizer('eq')
  chain.addCompressor('comp')

  // 禁用均衡器
  chain.setEffectEnabled('eq', false)
  console.log('均衡器状态:', chain.getEffectStatus())

  // 重新启用
  chain.setEffectEnabled('eq', true)
  console.log('均衡器状态:', chain.getEffectStatus())

  chain.dispose()
  audioContext.close()
}

/**
 * 示例 4d: 保存和恢复配置
 */
async function example4d_saveRestoreConfig() {
  console.log('=== 示例 4d: 保存和恢复配置 ===')

  const audioContext = new AudioContext()
  const { AudioEffectsChain } = await import('./audio-processor')

  const chain = new AudioEffectsChain(audioContext)
  chain.addEqualizer('eq', { preset: 'rock' })
  chain.addCompressor('comp', { preset: 'heavy' })
  chain.addReverb('reverb', { preset: 'hall' })

  // 导出配置
  const config = chain.getConfig()
  console.log('保存配置:', config)

  // 销毁链
  chain.dispose()

  // 创建新链并恢复配置
  const newChain = new AudioEffectsChain(audioContext)
  newChain.fromConfig(config)

  console.log('配置恢复完成')
  console.log('新链状态:', newChain.getEffectStatus())

  newChain.dispose()
  audioContext.close()
}

// ==================== 示例 5: 完整音频处理工作流 ====================

/**
 * 示例 5: 完整音频处理工作流
 */
async function example5_completeWorkflow() {
  console.log('=== 示例 5: 完整音频处理工作流 ===')

  const audioContext = new AudioContext()
  const { AudioEffectsChain } = await import('./audio-processor')

  // 1. 创建效果链
  const chain = new AudioEffectsChain(audioContext)

  // 2. 添加所有效果器
  chain.addEqualizer('main-eq', { preset: 'flat' })
  chain.addCompressor('main-comp', { preset: 'moderate' })
  chain.addReverb('main-reverb', { preset: 'off' })

  // 3. 应用人声优化预设
  chain.applyPreset('equalizer', 'vocal')
  chain.applyPreset('compressor', 'vocal')

  console.log('3. 预设应用完成')

  // 4. 微调均衡器
  const eq = chain.getEqualizer()
  if (eq) {
    // 进一步降低低频
    eq.setBandGain(125, -3)
    // 提升人声频率
    eq.setBandGain(2000, 2)
  }

  console.log('4. 均衡器微调完成')

  // 5. 微调压缩器
  const comp = chain.getCompressor()
  if (comp) {
    comp.setThreshold(-18)
    comp.setRatio(3)
  }

  console.log('5. 压缩器微调完成')

  // 6. 导出最终配置
  const finalConfig = chain.getConfig()
  console.log('6. 最终配置:', finalConfig)

  // 7. 清理
  chain.dispose()
  audioContext.close()

  console.log('工作流完成！')
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('开始运行 Phase 6 音频效果示例...\n')

  await example1a_basicEqualizer()
  console.log()

  await example1b_applyEqualizerPreset()
  console.log()

  await example1c_customEqualizer()
  console.log()

  await example2a_basicCompressor()
  console.log()

  await example2b_applyCompressorPreset()
  console.log()

  await example3a_basicReverb()
  console.log()

  await example3b_applyReverbPreset()
  console.log()

  await example4a_createEffectsChain()
  console.log()

  await example4b_applyChainPreset()
  console.log()

  await example5_completeWorkflow()

  console.log('\n所有示例运行完成！')
}

// 如果在 Node.js 环境运行
if (typeof window === 'undefined') {
  runAllExamples().catch(console.error)
}
