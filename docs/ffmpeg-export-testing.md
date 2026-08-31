# FFmpegExporter 导出流程测试 🧪

**日期**: 2026-08-31
**状态**: ✅ 测试页面已创建，准备运行

---

## 📋 测试概览

已创建完整的测试基础设施来验证 FFmpegExporter 的导出流程。

---

## ✅ 已创建的测试文件

### 1. **浏览器测试页面**（完整流程测试）

#### Next.js 测试页面
**文件**: `apps/web/src/app/[locale]/ffmpeg-export-test/page.tsx`

**访问**: `http://localhost:4100/zh/ffmpeg-export-test`

**功能**:
- ✅ 完整的 React 组件界面
- ✅ 实时日志输出
- ✅ 进度条显示
- ✅ 测试结果统计
- ✅ 错误处理
- ✅ 类型安全（TypeScript）

**测试内容**:
1. **Canvas 渲染测试**
   - 创建 CanvasRenderer (640x480, 30fps)
   - 渲染 30 帧（颜色渐变 + 帧号）
   - 导出为 PNG 图片
   - 验证输出大小

2. **FFmpeg 编码测试**
   - 动态导入 FFmpeg.wasm
   - 创建测试图片（渐变背景 + 文字）
   - 编码为 MP4 (H.264)
   - 读取并验证输出

3. **完整流程测试**
   - 组合 Canvas 渲染 + FFmpeg 编码
   - 统计总耗时
   - 验证输出格式和大小

#### 静态 HTML 测试页面
**文件**: `apps/web/public/ffmpeg-export-test.html`

**访问**: `http://localhost:4100/ffmpeg-export-test.html`

**功能**:
- ✅ 纯静态 HTML（无需 Next.js）
- ✅ 渐变背景 UI
- ✅ 模块化测试函数
- ✅ 降级方案（原生 Canvas API）

---

### 2. **Node.js 基础验证脚本**

**文件**: `apps/web/src/services/renderer/__tests__/canvas-renderer-basic.test.ts`

**运行**:
```bash
npx tsx apps/web/src/services/renderer/__tests__/canvas-renderer-basic.test.ts
```

**测试内容**:
- ✅ CanvasRenderer 创建
- ✅ ColorNode 渲染
- ✅ 多节点层级渲染（5 个节点）
- ✅ 时间轴定位
- ✅ PNG 导出
- ✅ 性能统计

**优势**:
- ✅ 无需浏览器环境
- ✅ 快速验证基础功能
- ✅ CI/CD 友好

---

## 🚀 运行测试

### 前置条件

#### 1. 配置 COOP/COEP 头（FFmpeg.wasm 必需）

在 `next.config.ts` 中添加：

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

**注意**: 修改后需要重启开发服务器。

#### 2. 启动开发服务器

```bash
bun run dev:web
```

---

### 测试方法 1: Next.js 测试页面（推荐）

```bash
# 1. 确保开发服务器运行
bun run dev:web

# 2. 访问测试页面
open http://localhost:4100/zh/ffmpeg-export-test

# 3. 点击"开始完整测试"
```

**预期结果**:
```
🎬 开始完整导出流程测试...
📋 步骤 1/2: Canvas 渲染
✅ CanvasRenderer 导入成功
✅ CanvasRenderer 创建成功 (640x480)
✅ 渲染完成: 30 帧 (XXms)
✅ 导出成功: XX.XX KB
✅ Canvas 渲染测试通过

📋 步骤 2/2: FFmpeg 编码
✅ FFmpeg 模块导入成功
⏳ 正在加载 FFmpeg...
✅ FFmpeg 加载成功
✅ 测试图片写入成功
⏳ 开始编码 MP4...
⏳ 编码进度: 100%
✅ 编码完成 (XXXXms)
✅ 读取成功: XX.XX KB
🧹 清理完成

🎉 完整导出流程测试通过！
⏱️ 总耗时: XXXXms
📦 输出大小: XX.XX KB
📹 格式: MP4 (H.264)

✨ Canvas → PNG → FFmpeg → MP4 流程验证成功！
```

---

### 测试方法 2: 静态 HTML 页面

```bash
# 访问（无需 Next.js）
open http://localhost:4100/ffmpeg-export-test.html

# 点击"开始完整测试"
```

**优势**:
- 无需 Next.js 配置
- 快速验证
- 包含降级方案

---

### 测试方法 3: Node.js 基础验证

```bash
# 运行 Canvas 基础测试
npx tsx apps/web/src/services/renderer/__tests__/canvas-renderer-basic.test.ts
```

**预期结果**:
```
🧪 CanvasRenderer 基础验证测试
============================================================

📋 测试 1: 创建 CanvasRenderer
   ✅ CanvasRenderer 创建成功
   - Canvas 尺寸: 640x480
   - FPS: 30

📋 测试 2: 渲染 ColorNode
   ✅ ColorNode 渲染成功
   - 节点层级: RootNode → ColorNode
   - 时间: 0s

📋 测试 3: 渲染多个节点（层级）
   ✅ 多节点渲染成功
   - 节点数: 5
   - 时间: 2.5s

📋 测试 4: 时间轴定位
   ✅ 时间 0s（节点未显示）
   ✅ 时间 3s（节点已显示）

📋 测试 5: 导出为 PNG
   ✅ PNG 导出成功
   - 尺寸: 320x240
   - 文件大小: XX.XX KB

============================================================
📊 测试总结
============================================================
✅ 通过: 5
❌ 失败: 0
📈 成功率: 100.0%

🎉 所有测试通过！CanvasRenderer 可以正常工作
✨ 可用于 FFmpegExporter 的帧渲染
```

---

## 📊 预期测试结果

### Canvas 渲染测试

| 指标 | 预期值 | 说明 |
|------|--------|------|
| **Canvas 创建** | ✅ 成功 | 640x480, 30fps |
| **帧渲染** | ✅ 成功 | 30 帧（1秒） |
| **PNG 导出** | ✅ 成功 | ~XX KB |
| **渲染耗时** | <100ms | 纯色背景快速渲染 |

### FFmpeg 编码测试

| 指标 | 预期值 | 说明 |
|------|--------|------|
| **FFmpeg 加载** | ✅ 成功 | ~25MB 下载 |
| **MP4 编码** | ✅ 成功 | H.264, 1秒视频 |
| **输出大小** | ~50-100 KB | 取决于复杂度 |
| **编码耗时** | <5秒 | 1秒视频 |
| **临时文件清理** | ✅ 成功 | test.png + output.mp4 |

### 完整流程测试

| 指标 | 预期值 | 说明 |
|------|--------|------|
| **总耗时** | <10秒 | 包含 FFmpeg 加载 |
| **输出格式** | MP4 (H.264) | yuv420p |
| **成功率** | 100% | 所有步骤通过 |
| **类型安全** | ✅ 通过 | TypeScript 零错误 |

---

## 🐛 常见问题排查

### 问题 1: SharedArrayBuffer 错误

**错误**:
```
SharedArrayBuffer is not defined
```

**原因**: FFmpeg.wasm 需要 SharedArrayBuffer，需要 COOP/COEP HTTP 头。

**解决**:
1. 配置 `next.config.ts`（见上文）
2. 重启开发服务器
3. 清除浏览器缓存

---

### 问题 2: FFmpeg 加载超时

**错误**:
```
FFmpeg 加载超时（60秒）
```

**原因**: 网络问题导致 ~25MB 核心文件下载失败。

**解决**:
- 检查网络连接
- 确保可以访问 `unpkg.com`
- 使用静态 HTML 页面测试

---

### 问题 3: Canvas.toBlob 类型错误

**错误**:
```
Property 'convertToBlob' does not exist
```

**原因**: TypeScript 类型定义不完整。

**解决**: 已修复（使用 `as unknown as OffscreenCanvas` 类型断言）

---

## 📝 测试验证清单

### Phase 2 完成前

- [ ] **Canvas 渲染测试**
  - [ ] CanvasRenderer 创建成功
  - [ ] 30 帧渲染成功
  - [ ] PNG 导出成功
  - [ ] 输出大小合理

- [ ] **FFmpeg 编码测试**
  - [ ] FFmpeg 加载成功
  - [ ] MP4 编码成功
  - [ ] 输出文件可播放
  - [ ] 临时文件清理成功

- [ ] **完整流程测试**
  - [ ] Canvas → PNG → FFmpeg → MP4 成功
  - [ ] 总耗时合理（<10秒）
  - [ ] 输出格式正确（MP4/H.264）

### Phase 2 完成后

- [ ] 与 Mediabunny 输出对比
- [ ] 性能基准测试
- [ ] 大项目测试（>5分钟视频）
- [ ] 错误处理验证
- [ ] 取消功能测试

---

## 🎯 下一步

1. **配置 COOP/COEP 头**
   - 修改 `next.config.ts`
   - 重启开发服务器

2. **运行测试**
   - 访问 `/zh/ffmpeg-export-test`
   - 点击"开始完整测试"
   - 观察日志和结果

3. **验证输出**
   - 下载生成的 MP4 文件
   - 使用播放器验证
   - 检查视频质量

4. **修复问题**（如有）
   - 类型错误
   - 渲染问题
   - 编码问题

5. **扩展测试**
   - WebM 编码
   - 音频合并
   - 质量控制

---

## 📚 相关文档

- **CanvasRenderer 实现**: `docs/canvas-renderer-implementation.md`
- **CanvasRenderer 完成**: `docs/canvas-renderer-complete.md`
- **Phase 2 进度**: `docs/phase2-progress.md`
- **FFmpeg 迁移方案**: `07.FFmpeg迁移方案.md`
- **FFmpeg 迁移任务**: `08.FFmpeg迁移任务.md`

---

## 🎉 总结

**测试基础设施已完整创建！**

### 已创建文件

1. ✅ `apps/web/src/app/[locale]/ffmpeg-export-test/page.tsx` - Next.js 测试页面
2. ✅ `apps/web/public/ffmpeg-export-test.html` - 静态 HTML 测试页面
3. ✅ `apps/web/src/services/renderer/__tests__/canvas-renderer-basic.test.ts` - Node.js 基础验证
4. ✅ `docs/ffmpeg-export-test-guide.md` - 测试指南

### TypeScript 验证

```bash
npx tsc --noEmit
```
**结果**: ✅ 通过（ffmpeg-export-test 零错误）

### 下一步

**配置 COOP/COEP 头 → 运行测试 → 验证输出 → 进入 Week 4 任务** 🚀
