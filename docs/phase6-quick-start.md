# Phase 6 快速开始指南

## 🚀 5 分钟上手机频效果处理

### 1. 基础设置

```typescript
import { AudioEffectsChain } from '@/services/renderer/audio'

// 创建 AudioContext
const audioContext = new AudioContext()

// 创建效果链
const chain = new AudioEffectsChain(audioContext)
```

### 2. 添加效果器

```typescript
// 添加均衡器
chain.addEqualizer('main-eq', { preset: 'vocal' })

// 添加压缩器
chain.addCompressor('main-comp', { preset: 'podcast' })

// 添加混响
chain.addReverb('main-reverb', { preset: 'smallRoom' })
```

### 3. 连接音频源

```typescript
// 从文件加载音频
const response = await fetch('/audio.mp3')
const arrayBuffer = await response.arrayBuffer()
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

// 创建音频源
const source = audioContext.createBufferSource()
source.buffer = audioBuffer

// 连接到效果链
source.connect(chain.getInput())
chain.getOutput().connect(audioContext.destination)

// 播放
source.start()
```

### 4. 调整参数

```typescript
// 获取均衡器
const eq = chain.getEqualizer()
if (eq) {
  // 提升 1kHz 频段
  eq.setBandGain(1000, 6)

  // 降低低频
  eq.setBandGain(125, -3)
}

// 获取压缩器
const comp = chain.getCompressor()
if (comp) {
  // 调整阈值
  comp.setThreshold(-18)

  // 调整压缩比
  comp.setRatio(3)

  // 启动监控
  comp.startMonitoring((state) => {
    console.log('增益衰减:', state.gainReduction.toFixed(2), 'dB')
  })
}

// 获取混响
const reverb = chain.getReverb()
if (reverb) {
  // 调整衰减
  reverb.setDecay(2.5)

  // 调整湿声混合
  reverb.setWetMix(0.4)
}
```

### 5. 启用/禁用效果

```typescript
// 禁用均衡器
chain.setEffectEnabled('main-eq', false)

// 重新启用
chain.setEffectEnabled('main-eq', true)
```

### 6. 保存和恢复配置

```typescript
// 导出配置
const config = chain.getConfig()
console.log('配置:', config)

// 保存到 localStorage
localStorage.setItem('audio-config', JSON.stringify(config))

// 从 localStorage 恢复
const savedConfig = JSON.parse(localStorage.getItem('audio-config'))
chain.fromConfig(savedConfig)
```

## 🎨 React 组件使用

### 基础用法

```tsx
import { AudioEffectsPanel } from '@/components/editor/panels/audio-effects-panel'

function AudioEditor() {
  const [config, setConfig] = useState()

  return (
    <AudioEffectsPanel
      initialConfig={config}
      onConfigChange={setConfig}
    />
  )
}
```

### 自定义配置

```tsx
function AudioEditor() {
  const [config, setConfig] = useState({
    equalizer: {
      id: 'eq',
      type: 'equalizer',
      enabled: true,
      options: { preset: 'vocal' }
    },
    compressor: {
      id: 'comp',
      type: 'compressor',
      enabled: true,
      options: { preset: 'podcast' }
    },
    reverb: {
      id: 'reverb',
      type: 'reverb',
      enabled: false,
      options: {}
    }
  })

  return (
    <AudioEffectsPanel
      initialConfig={config}
      onConfigChange={setConfig}
      disabled={false}
      showTitle={true}
    />
  )
}
```

## 🎛️ 常见预设组合

### 人声优化
```typescript
chain.addEqualizer('vocal-eq', { preset: 'vocal' })
chain.addCompressor('vocal-comp', { preset: 'vocal' })
chain.addReverb('vocal-reverb', { preset: 'vocal' })
```

### 播客制作
```typescript
chain.addEqualizer('podcast-eq', { preset: 'vocal' })
chain.addCompressor('podcast-comp', { preset: 'podcast' })
chain.addReverb('podcast-reverb', { preset: 'off' })
```

### 音乐增强
```typescript
chain.addEqualizer('music-eq', { preset: 'rock' })
chain.addCompressor('music-comp', { preset: 'moderate' })
chain.addReverb('music-reverb', { preset: 'hall' })
```

## 🔧 高级用法

### 自定义均衡器频段

```typescript
const { createEqualizer } = await import('./equalizer')

const customBands = [
  { frequency: 100, gain: 4, q: 1 },
  { frequency: 1000, gain: 2, q: 1 },
  { frequency: 5000, gain: -2, q: 1 },
]

const eq = createEqualizer(audioContext, {
  bands: customBands
})
```

### 加载自定义脉冲响应

```typescript
const reverb = chain.getReverb()
if (reverb) {
  // 从文件加载
  const response = await fetch('/impulse-response.wav')
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  // 加载到混响器
  await reverb.loadImpulseResponse(audioBuffer)
}
```

### 监控压缩器状态

```typescript
const comp = chain.getCompressor()
if (comp) {
  comp.startMonitoring((state) => {
    // 实时更新 UI
    setGainReduction(state.gainReduction)
    setReductionHistory(prev => [...prev, state.gainReduction])
  })
}

// 停止监控
comp.stopMonitoring()
```

## 💡 性能优化

### 延迟创建
```typescript
// 按需创建效果器，而不是一次性添加所有
if (needReverb) {
  chain.addReverb('reverb', { preset: 'smallRoom' })
}
```

### 及时释放
```typescript
// 不再使用时，清理资源
chain.dispose()
audioContext.close()
```

## 🐛 故障排除

### 音频无输出
```typescript
// 检查 AudioContext 状态
console.log(audioContext.state)  // 应为 'running'

// 如果被暂停，恢复它
if (audioContext.state === 'suspended') {
  await audioContext.resume()
}
```

### 效果器无响应
```typescript
// 检查效果器是否启用
console.log(chain.getEffectStatus())

// 检查音频节点连接
console.log(chain.getInput())
console.log(chain.getOutput())
```

### 性能问题
```typescript
// 减少效果器数量
// 降低音频缓冲大小
// 使用更简单的预设
```

## 📚 更多资源

- 完整 API 文档: `src/services/renderer/audio/`
- 使用示例: `src/services/renderer/audio/audio-effects-examples.ts`
- 单元测试: `src/services/renderer/audio/__tests__/audio-effects.test.ts`
- 完成报告: `docs/phase6-complete.md`
