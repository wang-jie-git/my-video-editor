# Mediabunny vs FFmpeg.wasm 对比测试方案

**日期**: 2026-08-31
**状态**: 📋 测试方案
**目标**: 评估 FFmpeg.wasm 替代 Mediabunny 的可行性

---

## 🎯 测试目标

### 主要目标
1. **功能等价性**: FFmpeg.wasm 能否实现 Mediabunny 的所有功能
2. **性能对比**: 渲染速度、内存占用、文件大小
3. **质量对比**: 输出视频/音频质量
4. **稳定性**: 错误处理、边界情况

### 次要目标
- 识别 FFmpeg.wasm 的优势和劣势
- 制定迁移优先级
- 发现潜在问题和解决方案

---

## 📊 对比维度

### 1. 核心功能对比

#### 1.1 视频导出

| 功能 | Mediabunny | FFmpeg.wasm | 状态 |
|------|-----------|-------------|------|
| MP4 导出 | ✅ | ✅ | 已实现 |
| WebM 导出 | ❌ | ✅ | FFmpeg 优势 |
| H.264 编码 | ✅ | ✅ | 等价 |
| VP9 编码 | ❌ | ✅ | FFmpeg 优势 |
| 质量控制 | ❌ | ✅ (CRF) | FFmpeg 优势 |
| 编码预设 | ❌ | ✅ | FFmpeg 优势 |
| 像素格式 | ❌ | ✅ | FFmpeg 优势 |

#### 1.2 音频处理

| 功能 | Mediabunny | FFmpeg.wasm | 状态 |
|------|-----------|-------------|------|
| 音频提取 | ✅ | ✅ | 等价 |
| 多轨混音 | ✅ | ⚠️ | 需验证 |
| AAC 编码 | ✅ | ✅ | 等价 |
| Opus 编码 | ❌ | ✅ | FFmpeg 优势 |
| 音频效果 | ❌ | ✅ | FFmpeg 优势 |

#### 1.3 视频处理

| 功能 | Mediabunny | FFmpeg.wasm | 状态 |
|------|-----------|-------------|------|
| 格式转换 | ❌ | ✅ | FFmpeg 优势 |
| 视频滤镜 | ❌ | ✅ | FFmpeg 优势 |
| 字幕嵌入 | ❌ | ✅ | FFmpeg 优势 |
| 视频合并 | ❌ | ✅ | FFmpeg 优势 |
| 视频分割 | ❌ | ✅ | FFmpeg 优势 |

---

### 2. 性能对比

#### 2.1 测试场景

**场景 1: 短项目（10 秒，1080p, 30fps）**
- 纯视频
- 视频 + 音频
- 1 个视频轨 + 1 个音频轨

**场景 2: 中等项目（60 秒，1080p, 30fps）**
- 3 个视频轨 + 2 个音频轨
- 带转场效果

**场景 3: 长项目（5 分钟，1080p, 30fps）**
- 5 个视频轨 + 3 个音频轨
- 复杂时间线

#### 2.2 性能指标

| 指标 | 测量方法 | 目标 |
|------|---------|------|
| **渲染时间** | 从开始到完成的时间 | ≤ 2x Mediabunny |
| **内存峰值** | 浏览器内存使用 | ≤ 500MB |
| **CPU 使用率** | 主线程 + Worker | < 80% |
| **输出文件大小** | MP4 文件大小 | ± 10% |
| **首次渲染时间** | 冷启动到第一帧 | < 5s |

#### 2.3 性能基准测试代码

```typescript
async function benchmarkExport(params: {
  name: string;
  exporter: 'mediabunny' | 'ffmpeg';
  tracks: TimelineTrack[];
  duration: number;
  canvasSize: TCanvasSize;
}): Promise<BenchmarkResult> {
  const { name, exporter, tracks, duration, canvasSize } = params;

  const startTime = performance.now();
  const memoryStart = performance.memory?.usedJSHeapSize || 0;

  try {
    const result = await exportVideo({
      tracks,
      duration,
      canvasSize,
      exporter,
      onProgress: (progress) => {
        console.log(`[${name}] ${exporter}: ${(progress * 100).toFixed(1)}%`);
      },
    });

    const endTime = performance.now();
    const memoryEnd = performance.memory?.usedJSHeapSize || 0;

    return {
      name,
      exporter,
      success: result.success,
      duration: endTime - startTime,
      memoryPeak: memoryEnd - memoryStart,
      outputSize: result.buffer?.byteLength || 0,
      error: result.error,
    };
  } catch (error) {
    return {
      name,
      exporter,
      success: false,
      duration: performance.now() - startTime,
      memoryPeak: 0,
      outputSize: 0,
      error: error.message,
    };
  }
}
```

---

### 3. 质量对比

#### 3.1 视频质量

**测试方法**:
1. 导出相同的项目（Mediabunny vs FFmpeg）
2. 提取关键帧对比
3. 计算 PSNR（峰值信噪比）
4. 人工视觉评估

**对比维度**:
- 清晰度
- 色彩准确性
- 压缩伪影
- 播放流畅度

#### 3.2 音频质量

**测试方法**:
1. 导出相同的音频混音
2. 提取音频数据
3. 计算 SNR（信噪比）
4. 人工听觉评估

**对比维度**:
- 音量平衡
- 音质损失
- 静音/爆音

---

### 4. 稳定性测试

#### 4.1 边界情况

| 测试场景 | 预期行为 |
|---------|---------|
| 空项目（0 时长） | 成功或明确错误 |
| 极短项目（< 1s） | 成功导出 |
| 超长项目（> 10 分钟） | 成功或内存警告 |
| 大量轨道（> 10 个） | 成功或性能警告 |
| 无音频轨道 | 仅导出视频 |
| 无视频轨道 | 仅导出音频或错误 |
| 损坏的媒体文件 | 优雅降级 |

#### 4.2 错误处理

| 错误场景 | Mediabunny | FFmpeg.wasm | 改进点 |
|---------|-----------|-------------|--------|
| 磁盘空间不足 | ❌ | ✅ | FFmpeg 优势 |
| 内存不足 | ❌ | ⚠️ | 需优化 |
| 不支持的格式 | ❌ | ✅ | FFmpeg 优势 |
| FFmpeg 崩溃 | N/A | ⚠️ | 需错误恢复 |

---

## 🧪 测试实施

### 阶段 1: 单元测试（已完成 ✅）

**状态**: 7/7 测试通过

```bash
✅ CanvasRenderer 结构正确
✅ FFmpegExporter 结构正确
✅ FFmpegService 结构正确
✅ RendererManager 结构正确
```

### 阶段 2: 集成测试（待完成 ⏳）

**目标**: 在真实项目中测试完整导出流程

**测试环境**:
- Next.js 应用（localhost:4100）
- 真实媒体文件（视频、音频）
- COOP/COEP 头部配置

**测试步骤**:
1. 创建测试项目（5 个预设场景）
2. 使用 Mediabunny 导出
3. 使用 FFmpeg.wasm 导出
4. 对比结果

### 阶段 3: 性能测试（待完成 ⏳）

**目标**: 建立性能基准

**测试脚本**:
```bash
# 待创建: scripts/benchmark-export.ts
```

### 阶段 4: 质量评估（待完成 ⏳）

**目标**: 评估输出质量

**评估方法**:
- 自动：PSNR、SSIM
- 手动：视觉和听觉对比

---

## 📋 测试计划

### Week 4 (当前)

- [x] 创建对比测试方案 ✅
- [ ] 运行集成测试（需要 Next.js 环境）
- [ ] 收集性能数据
- [ ] 评估输出质量

### Week 5

- [ ] 分析测试结果
- [ ] 制定优化计划
- [ ] 完成 Phase 2 总结

---

## ⚠️ 已知限制

### 1. 浏览器环境限制

**COOP/COEP 头部**:
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp',
  },
];
```

**原因**: SharedArrayBuffer 需要这些头部

**影响**: 静态服务器无法运行，必须在 Next.js 环境

### 2. CDN 依赖

**问题**: FFmpeg.wasm 需要从 CDN 加载核心文件

**解决方案**:
- 使用动态 import
- CDN 配置（jsdelivr/unpkg）
- 版本锁定（0.12.1）

### 3. 内存限制

**问题**: 浏览器内存限制（通常 1-2GB）

**影响**: 大项目（> 10 分钟）可能 OOM

**缓解措施**:
- 分批渲染
- 帧缓存清理
- 内存监控

---

## 🎯 预期结论

### FFmpeg.wasm 优势 ✅

1. **格式支持**: MP4, WebM, MOV, AVI, MKV
2. **编码器选择**: H.264, H.265, VP9, VP8
3. **质量控制**: CRF, 预设, 像素格式
4. **音频编码**: AAC, Opus, MP3（需 lamejs）
5. **视频滤镜**: 内置 100+ 滤镜
6. **字幕支持**: SRT, VTT, ASS
7. **视频处理**: 合并、分割、转场

### Mediabunny 优势 ✅

1. **API 简洁**: TypeScript-first 设计
2. **流式处理**: AsyncGenerator 支持
3. **TypeScript 支持**: 完整类型定义
4. **包体积小**: 专注于核心功能

### 迁移建议

**短期（Phase 2-3）**:
- ✅ FFmpeg.wasm 用于视频导出
- ✅ Mediabunny 用于音频提取（已实现）
- ⚠️ 并行运行直到稳定

**中期（Phase 4-7）**:
- ✅ FFmpeg.wasm 完全替代 Mediabunny
- ✅ 利用 FFmpeg 的高级功能
- ✅ 移除 Mediabunny 依赖

**长期（优化）**:
- ✅ 性能优化（Worker + 缓存）
- ✅ 质量优化（滤镜 + LUT）
- ✅ 功能扩展（AI 增强）

---

## 📚 参考资料

### Mediabunny 文档
- GitHub: https://github.com/mediabunny/mediabunny
- npm: https://www.npmjs.com/package/mediabunny

### FFmpeg.wasm 文档
- GitHub: https://github.com/ffmpegwasm/ffmpeg.wasm
- Docs: https://ffmpegwasm.netlify.app/

### 测试脚本（待创建）
- `scripts/benchmark-export.ts`
- `scripts/compare-quality.ts`
- `scripts/performance-test.ts`

---

**下一步**: 在 Next.js 环境运行集成测试，收集实际性能数据
