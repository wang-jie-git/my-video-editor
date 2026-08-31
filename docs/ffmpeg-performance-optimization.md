# FFmpegExporter 性能优化建议 🚀

**日期**: 2026-08-31
**状态**: 📋 优化建议
**目标**: 提升渲染性能，降低内存占用

---

## 📊 当前性能瓶颈

### 1. 帧渲染阶段

**问题**: 逐帧渲染并立即写入 FFmpeg
**耗时**: 60 秒项目 @ 30fps = 1800 次渲染 + 写入

**当前实现**:
```typescript
for (let i = 0; i < frameCount; i++) {
  await renderer.render({ node: rootNode, time });
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  await ffmpegService.writeFile(frameName, data);
  // 每帧都写入 FFmpeg 虚拟文件系统
}
```

**瓶颈分析**:
- ❌ 串行渲染（无法并行）
- ❌ 频繁 I/O 操作（每帧都写入）
- ❌ PNG 编码开销大
- ❌ 内存累积（所有帧保留到编码完成）

### 2. 编码阶段

**问题**: 单线程编码，无进度反馈优化
**耗时**: 取决于编码器和质量设置

**当前实现**:
```typescript
await this.ffmpegService.exec(encodeArgs, {
  onProgress: ({ progress }) => {
    // 进度回调
  },
});
```

**瓶颈分析**:
- ⚠️ FFmpeg.wasm 单线程（除非 SharedArrayBuffer）
- ⚠️ 无法中断编码
- ⚠️ 无编码预设优化

### 3. 内存管理

**问题**: 所有帧保留在内存中
**影响**: 1800 帧 @ 1080p ≈ 1.5GB

**当前实现**:
```typescript
const frameFiles: string[] = []; // 所有帧文件名
// 编码后才清理
await this.cleanup(frameFiles);
```

**瓶颈分析**:
- ❌ 内存峰值过高
- ❌ 可能导致 OOM
- ❌ 清理不及时

---

## 🚀 优化方案

### 方案 1: 批量写入 FFmpeg ⭐⭐⭐

**原理**: 减少 FFmpeg 虚拟文件系统 I/O 次数

**实现**:
```typescript
private async renderFramesToImagesBatch(params: {
  rootNode: any;
  fps: number;
  canvasSize: TCanvasSize;
  batchSize: number; // 每批 50 帧
}): Promise<string[]> {
  const { rootNode, fps, canvasSize, batchSize } = params;
  const frameCount = Math.ceil(rootNode.duration * fps);
  const renderer = new CanvasRenderer({ width, canvasSize.width, height: canvasSize.height, fps });

  for (let batchStart = 0; batchStart < frameCount; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, frameCount);

    // 批量渲染
    const frames: ArrayBuffer[] = [];
    for (let i = batchStart; i < batchEnd; i++) {
      const time = i / fps;
      await renderer.render({ node: rootNode, time });
      const blob = await renderer.canvas.convertToBlob({ type: 'image/png' });
      frames.push(await blob.arrayBuffer());
    }

    // 批量写入 FFmpeg
    await Promise.all(
      frames.map((data, idx) => {
        const frameName = `frame-${String(batchStart + idx).padStart(6, '0')}.png`;
        return this.ffmpegService.writeFile(frameName, new Uint8Array(data));
      })
    );
  }

  return frameFiles;
}
```

**收益**:
- ⚡ 减少 I/O 次数 90%
- ⚡ 提升吞吐量 1.5-2x
- 💾 降低内存峰值

---

### 方案 2: Web Worker 并行渲染 ⭐⭐⭐

**原理**: 利用多核 CPU 并行渲染帧

**架构**:
```
主线程                     Worker 1                    Worker 2
  │                          │                           │
  ├─ 分配任务 ──────────────>│                           │
  │                          ├─ 渲染帧 0-899 ──────────>│
  │                          │<────────── 返回数据 ──────┤
  │<───────── 接收结果 ──────┤                           │
  │                          │                           │
  ├─ 分配任务 ───────────────────────────────────────────>│
  │<──────────────────────────────────────── 接收结果 ──┤
```

**实现**:
```typescript
// worker-renderer.ts
self.onmessage = async ({ data }) => {
  const { frames, rootNode, canvasSize, fps } = data;

  const results = [];
  for (const frameIndex of frames) {
    const renderer = new OffscreenCanvas(canvasSize.width, canvasSize.height);
    const ctx = renderer.getContext('2d');

    // 渲染帧
    await renderFrame({ node: rootNode, time: frameIndex / fps });

    // 转换为 Blob
    const blob = await renderer.convertToBlob({ type: 'image/webp' });
    const buffer = await blob.arrayBuffer();

    results.push({ index: frameIndex, buffer });
  }

  self.postMessage({ results });
};
```

**收益**:
- ⚡ 4 核 CPU = 4x 速度提升
- ⚡ 响应更快
- ⚡ 更好的用户体验

**挑战**:
- ⚠️ Worker 通信开销
- ⚠️ 内存占用增加
- ⚠️ 需要序列化场景树

---

### 方案 3: 使用 WebP 代替 PNG ⭐⭐

**原理**: WebP 压缩率更高，文件更小

**对比**:
| 格式 | 文件大小 | 编码速度 | 质量 |
|------|---------|---------|------|
| PNG | 100% | 慢 | 无损 |
| WebP | 30-50% | 快 | 有损/无损 |
| JPEG | 40-60% | 很快 | 有损 |

**实现**:
```typescript
// 从 PNG 改为 WebP
const blob = await canvas.convertToBlob({
  type: 'image/webp',
  quality: 0.9, // 90% 质量
});
```

**收益**:
- 💾 文件大小减少 50-70%
- ⚡ 编码速度提升 2x
- ⚡ FFmpeg 编码更快

**权衡**:
- ⚠️ 轻微质量损失（可选择无损 WebP）
- ⚠️ 浏览器兼容性（>95%）

---

### 方案 4: 分批渲染 + 流式编码 ⭐⭐⭐

**原理**: 边渲染边编码，降低内存峰值

**流程**:
```
渲染批次 1 (0-500 帧) → FFmpeg 编码 → 输出视频片段 1
渲染批次 2 (501-1000 帧) → FFmpeg 编码 → 输出视频片段 2
渲染批次 3 (1001-1500 帧) → FFmpeg 编码 → 输出视频片段 3
合并所有片段 → 最终输出
```

**实现**:
```typescript
private async exportWithBatching(params: {
  tracks: TimelineTrack[];
  duration: number;
  batchDuration: number; // 每批 30 秒
}): Promise<ExportResult> {
  const batches = Math.ceil(duration / params.batchDuration);
  const outputFiles: string[] = [];

  for (let batch = 0; batch < batches; batch++) {
    const startTime = batch * params.batchDuration;
    const endTime = Math.min((batch + 1) * params.batchDuration, duration);

    // 1. 渲染批次
    const frameFiles = await this.renderFramesToImages({
      rootNode: scene,
      startTime,
      endTime,
    });

    // 2. 编码批次
    const outputFile = `batch-${batch}.mp4`;
    await this.encodeVideo({ frameFiles, outputFile });
    outputFiles.push(outputFile);

    // 3. 清理批次
    await this.cleanup(frameFiles);
  }

  // 4. 合并所有批次
  if (outputFiles.length > 1) {
    await this.mergeVideos(outputFiles, 'output.mp4');
  }

  return { success: true, buffer: await this.ffmpegService.readFile('output.mp4') };
}
```

**收益**:
- 💾 内存峰值降低 70%
- ⚡ 更快开始编码（无需等待所有帧）
- ⚡ 更好的内存管理

**挑战**:
- ⚠️ 需要处理批次间的连续性
- ⚠️ 编码参数需保持一致

---

### 方案 5: 帧缓存 + 增量更新 ⭐⭐

**原理**: 缓存未更改的帧，仅重新渲染修改的帧

**适用场景**:
- 实时预览
- 参数调整（亮度、对比度）
- 时间线编辑

**实现**:
```typescript
class FrameCache {
  private cache = new Map<string, ImageData>();

  async getFrame(node: RootNode, time: number): Promise<ImageData> {
    const key = this.hashNode(node) + '-' + time.toFixed(2);

    if (this.cache.has(key)) {
      return this.cache.get(key)!; // 缓存命中
    }

    // 渲染新帧
    const frame = await renderFrame({ node, time });
    this.cache.set(key, frame);

    // 限制缓存大小（LRU）
    if (this.cache.size > 1000) {
      this.evictOldest();
    }

    return frame;
  }
}
```

**收益**:
- ⚡ 实时预览响应更快
- 💾 减少重复渲染
- ⚡ 更好的用户体验

**挑战**:
- ⚠️ 缓存失效策略
- ⚠️ 内存管理

---

### 方案 6: 降低帧率或分辨率 ⭐

**原理**: 降低渲染复杂度

**策略**:
1. **预览模式**: 15fps, 720p
2. **标准模式**: 30fps, 1080p
3. **高质量**: 60fps, 4K

**实现**:
```typescript
interface RenderQuality {
  fps: number;
  resolution: '720p' | '1080p' | '4k';
  format: 'png' | 'webp';
}

const qualityPresets: Record<string, RenderQuality> = {
  draft: { fps: 15, resolution: '720p', format: 'webp' },
  standard: { fps: 30, resolution: '1080p', format: 'webp' },
  high: { fps: 60, resolution: '4k', format: 'png' },
};
```

**收益**:
- ⚡ 渲染速度提升 4-16x
- 💾 内存占用减少 75%

**权衡**:
- ⚠️ 质量降低
- ⚠️ 仅适合预览

---

## 📊 优化优先级

### P0（立即实施）

1. **批量写入** (方案 1)
   - 实现难度: 低
   - 收益: 高
   - 预计提升: 1.5-2x

2. **使用 WebP** (方案 3)
   - 实现难度: 低
   - 收益: 中
   - 预计提升: 2x 编码速度

### P1（短期，1-2 周）

3. **分批渲染** (方案 4)
   - 实现难度: 中
   - 收益: 高
   - 预计提升: 内存降低 70%

4. **帧缓存** (方案 5)
   - 实现难度: 中
   - 收益: 中
   - 适用: 预览场景

### P2（中期，2-4 周）

5. **Web Worker** (方案 2)
   - 实现难度: 高
   - 收益: 极高
   - 预计提升: 4x（4 核）

6. **动态质量** (方案 6)
   - 实现难度: 中
   - 收益: 中
   - 适用: 预览场景

---

## 🎯 性能目标

### 短期目标（Week 5）

- [ ] 实现批量写入（P0）
- [ ] 切换到 WebP（P0）
- [ ] 性能提升 2x
- [ ] 内存峰值 < 500MB

### 中期目标（Week 6-8）

- [ ] 实现分批渲染（P1）
- [ ] 实现帧缓存（P1）
- [ ] 性能提升 3-4x
- [ ] 内存峰值 < 300MB

### 长期目标（Week 9-12）

- [ ] 实现 Web Worker（P2）
- [ ] 实现动态质量（P2）
- [ ] 性能提升 5-8x
- [ ] 内存峰值 < 200MB

---

## 📈 性能监控

### 监控指标

```typescript
interface PerformanceMetrics {
  // 渲染阶段
  renderTime: number; // 帧渲染总时间
  renderFPS: number; // 平均 FPS

  // 编码阶段
  encodeTime: number; // 编码总时间
  encodeSpeed: string; // 实时倍速（如 "32x"）

  // 内存
  memoryPeak: number; // 内存峰值（MB）
  memoryCurrent: number; // 当前内存（MB）

  // 输出
  outputSize: number; // 文件大小（MB）
  compressionRatio: number; // 压缩率
}

// 收集指标
function collectMetrics(): PerformanceMetrics {
  return {
    renderTime: ...,
    encodeTime: ...,
    memoryPeak: ...,
    outputSize: ...,
  };
}
```

### 性能报告

```
📊 性能报告 - 1080p @ 30fps, 60 秒项目
============================================================
⏱️  总耗时: 45.2s
   ├─ 渲染: 12.3s (27%)
   ├─ 编码: 32.1s (71%)
   └─ I/O: 0.8s (2%)

💾 内存峰值: 420MB
   ├─ 帧缓存: 280MB
   ├─ FFmpeg: 120MB
   └─ 其他: 20MB

📦 输出大小: 87.3MB
   └─ 压缩率: 1:42

⚡ 性能评分: B+ (目标: A)
   ├─ 渲染速度: A (27.2 fps)
   ├─ 编码速度: B (1.87x 实时)
   └─ 内存占用: A (420MB < 500MB)
```

---

## 🚀 快速开始

### 实施批量写入（P0）

```typescript
// ffmpeg-exporter.ts
private async renderFramesToImages(params: {
  rootNode: any;
  fps: number;
  canvasSize: TCanvasSize;
  batchSize?: number; // 新增
}): Promise<string[]> {
  const batchSize = params.batchSize || 50; // 默认 50 帧
  const frameCount = Math.ceil(rootNode.duration * params.fps);

  for (let batchStart = 0; batchStart < frameCount; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, frameCount);
    const frames: ArrayBuffer[] = [];

    // 批量渲染
    for (let i = batchStart; i < batchEnd; i++) {
      const time = i / params.fps;
      await renderer.render({ node: params.rootNode, time });
      const blob = await renderer.canvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
      frames.push(await blob.arrayBuffer());
    }

    // 批量写入
    await Promise.all(
      frames.map((data, idx) =>
        this.ffmpegService.writeFile(
          `frame-${String(batchStart + idx).padStart(6, '0')}.webp`,
          new Uint8Array(data)
        )
      )
    );
  }

  return frameFiles;
}
```

---

## 📚 参考资料

### FFmpeg.wasm 性能优化
- https://ffmpegwasm.netlify.app/docs/getting-started/performance

### WebAssembly 性能
- https://webassembly.org/docs/performance/

### OffscreenCanvas
- https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas

---

**下一步**: 实施 P0 优化（批量写入 + WebP），建立性能基准
