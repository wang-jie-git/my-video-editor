# FFmpegExporter 导出流程测试指南 🧪

**日期**: 2026-08-31
**状态**: ✅ 测试页面已创建

---

## 📋 测试内容

验证 Canvas → PNG → FFmpeg → MP4 完整导出流程。

### 测试模块

1. **Canvas 渲染测试** - 验证 CanvasRenderer 渲染能力
2. **FFmpeg 编码测试** - 验证 FFmpeg 视频编码
3. **完整导出流程** - 验证端到端流程

---

## 🚀 运行测试

### 方法 1: 浏览器测试页面（推荐）

#### 静态 HTML 页面

```bash
# 启动开发服务器
bun run dev:web

# 访问
open http://localhost:4100/ffmpeg-export-test.html
```

**功能**:
- ✅ 可视化测试界面
- ✅ 实时日志输出
- ✅ 进度条显示
- ✅ 测试结果统计
- ⚠️ 需要 COOP/COEP 头（FFmpeg.wasm 限制）

#### Next.js 测试页面

```bash
# 启动开发服务器
bun run dev:web

# 访问
open http://localhost:4100/zh/ffmpeg-export-test
```

**功能**:
- ✅ 集成到 Next.js 应用
- ✅ React 组件化界面
- ✅ 更完整的日志系统
- ⚠️ 需要 COOP/COEP 头

### 方法 2: Node.js 基础验证

```bash
# 使用 tsx 运行
npx tsx apps/web/src/services/renderer/__tests__/canvas-renderer-basic.test.ts
```

**功能**:
- ✅ 无需浏览器环境
- ✅ Canvas 渲染基础验证
- ❌ 不包含 FFmpeg 编码测试
- ✅ 快速验证 CanvasRenderer 功能

---

## 📊 预期结果

### Canvas 渲染测试

```
✅ CanvasRenderer 创建成功
   - Canvas 尺寸: 640x480
   - FPS: 30

✅ ColorNode 渲染成功
   - 节点层级: RootNode → ColorNode
   - 时间: 0s

✅ 多节点渲染成功
   - 节点数: 5
   - 时间: 2.5s

✅ 时间轴定位成功
   - 时间 0s（节点未显示）
   - 时间 3s（节点已显示）

✅ PNG 导出成功
   - 尺寸: 320x240
   - 文件大小: ~XX KB
```

### FFmpeg 编码测试

```
✅ FFmpeg 模块导入成功
✅ FFmpeg 加载成功
✅ 测试图片写入成功
⏳ 编码进度: 100%
✅ 编码完成
✅ 读取成功: ~XX KB
🧹 清理完成
```

### 完整导出流程

```
🎬 开始完整导出流程测试...
📋 步骤 1/2: Canvas 渲染
✅ Canvas 渲染测试通过
📋 步骤 2/2: FFmpeg 编码
✅ FFmpeg 编码测试通过

🎉 完整导出流程测试通过！
⏱️ 总耗时: ~XXXXms
📦 输出大小: ~XX KB
📹 格式: MP4 (H.264)

✨ Canvas → PNG → FFmpeg → MP4 流程验证成功！
```

---

## ⚠️ 常见问题

### 1. SharedArrayBuffer 错误

**错误信息**:
```
SharedArrayBuffer is not defined
```

**原因**: FFmpeg.wasm 需要 SharedArrayBuffer，需要特定的 HTTP 头。

**解决方案**:

在 `next.config.ts` 中添加 COOP/COEP 头：

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

### 2. FFmpeg 加载超时

**错误信息**:
```
FFmpeg 加载超时（60秒）
```

**原因**: 网络问题导致 FFmpeg 核心文件下载失败。

**解决方案**:
- 检查网络连接
- 确保可以访问 `unpkg.com`
- 检查防火墙或代理设置

### 3. 测试页面空白

**原因**: Next.js 16 + Turbopack 动态导入问题。

**解决方案**:
- 使用静态 HTML 页面（`ffmpeg-export-test.html`）
- 或在开发服务器中访问（自动处理动态导入）

---

## 🧪 测试覆盖

### CanvasRenderer 功能

- [x] Canvas 创建
- [x] 节点渲染（ColorNode）
- [x] 多节点层级渲染
- [x] 时间轴定位
- [x] PNG 导出
- [ ] VideoNode 渲染（需要 videoCache）
- [ ] ImageNode 渲染（需要图片资源）
- [ ] TextNode 渲染
- [ ] 变换支持（position, scale, rotate, flip）
- [ ] 透明度支持

### FFmpeg 功能

- [x] FFmpeg 加载
- [x] MP4 编码（H.264）
- [ ] WebM 编码（VP9）
- [ ] 质量控制
- [ ] 帧率控制
- [ ] 音频合并

### FFmpegExporter 功能

- [ ] 完整导出流程
- [ ] 进度回调
- [ ] 取消功能
- [ ] 错误处理
- [ ] 临时文件清理
- [ ] 与 Mediabunny 对比

---

## 📝 测试脚本

### Node.js 测试（CanvasRenderer）

```bash
npx tsx apps/web/src/services/renderer/__tests__/canvas-renderer-basic.test.ts
```

**测试内容**:
- ✅ CanvasRenderer 创建
- ✅ ColorNode 渲染
- ✅ 多节点渲染
- ✅ 时间轴定位
- ✅ PNG 导出

### 浏览器测试（完整流程）

访问 `http://localhost:4100/zh/ffmpeg-export-test`

**测试内容**:
- ✅ Canvas 渲染（30 帧）
- ✅ FFmpeg MP4 编码
- ✅ 完整流程验证
- ✅ 性能统计

---

## 🎯 验证清单

### Phase 2 完成前

- [x] CanvasRenderer.render() 实现
- [ ] Canvas 渲染测试通过
- [ ] FFmpeg 编码测试通过
- [ ] 完整导出流程测试通过
- [ ] 与 Mediabunny 对比测试
- [ ] 性能基准测试

### 进入 Phase 3 前

- [ ] MP4/WebM 编码验证
- [ ] 音频合并测试
- [ ] 不同质量控制测试
- [ ] 大项目导出测试（>5分钟）
- [ ] Phase 2 文档总结

---

## 📚 相关文档

- **CanvasRenderer 实现**: `docs/canvas-renderer-implementation.md`
- **CanvasRenderer 完成总结**: `docs/canvas-renderer-complete.md`
- **Phase 2 进度**: `docs/phase2-progress.md`
- **FFmpeg 迁移方案**: `07.FFmpeg迁移方案.md`
- **FFmpeg 迁移任务**: `08.FFmpeg迁移任务.md`

---

## 🚀 下一步

1. **配置 COOP/COEP 头**
   - 修改 `next.config.ts`
   - 重启开发服务器

2. **运行浏览器测试**
   - 访问 `/zh/ffmpeg-export-test`
   - 点击"开始完整测试"

3. **验证结果**
   - 检查 Canvas 渲染输出
   - 检查 FFmpeg 编码输出
   - 验证 MP4 文件可播放

4. **修复问题**
   - 解决类型错误
   - 优化性能
   - 完善错误处理

---

## 💡 提示

- 首次加载 FFmpeg 需要下载 ~25MB 核心文件，请耐心等待
- 测试视频仅 1 秒，用于快速验证功能正确性
- 建议使用 Chrome/Edge（对 FFmpeg.wasm 支持最好）
- 确保浏览器版本支持 SharedArrayBuffer（Chrome 91+）
