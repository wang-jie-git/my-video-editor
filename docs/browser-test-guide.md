# 🚀 FFmpegExporter 浏览器测试指南

**日期**: 2026-08-31
**状态**: ✅ 开发服务器已启动，测试页面可访问

---

## ✅ 服务器状态

### Next.js 开发服务器

```
✓ Ready in 2s
- Local:   http://localhost:4100
- Network: http://192.168.1.209:4100
```

### COOP/COEP 头配置

✅ 已配置（支持 FFmpeg.wasm SharedArrayBuffer）

---

## 🌐 访问测试页面

### 方法 1: 独立测试页面（推荐）✨

**URL**: http://localhost:4100/ffmpeg-export-standalone.html

**优势**:
- ✅ 不依赖 Next.js Turbopack
- ✅ 使用 script 标签预加载 FFmpeg
- ✅ 绕过动态导入错误
- ✅ 独立的渐变 UI 设计

**访问方式**:
```bash
open http://localhost:4100/ffmpeg-export-standalone.html
```

---

### 方法 2: Next.js 测试页面

**URL**: http://localhost:4100/zh/ffmpeg-export-test

**功能**:
- ✅ 完整的 React 界面
- ✅ Canvas 渲染测试
- ✅ FFmpeg 编码测试
- ✅ 完整流程测试
- ✅ 实时日志和进度

**注意**: 可能遇到 Turbopack FFmpeg 导入错误

---

## 📋 测试步骤

### 1. 打开测试页面

在浏览器中访问：
```
http://localhost:4100/zh/ffmpeg-export-test
```

### 2. 点击"开始完整测试"

页面加载后，你会看到：
- 🚀 测试控制面板
- 📋 测试日志区域
- 📊 测试结果区域

点击 **"▶️ 开始完整测试"** 按钮

### 3. 观察测试进度

测试会自动执行以下步骤：

#### 步骤 1/2: Canvas 渲染

```
🎨 开始 Canvas 渲染测试...
✅ CanvasRenderer 导入成功
✅ CanvasRenderer 创建成功 (640x480)
✅ 渲染完成: 30 帧 (XXms)
✅ 导出成功: XX.XX KB
```

**预期时间**: <1 秒

#### 步骤 2/2: FFmpeg 编码

```
⚙️ 开始 FFmpeg 编码测试...
✅ FFmpeg 模块导入成功
⏳ 正在加载 FFmpeg...
✅ FFmpeg 加载成功
✅ 测试图片写入成功
⏳ 开始编码 MP4...
⏳ 编码进度: 100%
✅ 编码完成 (XXXXms)
✅ 读取成功: XX.XX KB
🧹 清理完成
```

**预期时间**: 5-15 秒（首次加载 FFmpeg 较慢）

### 4. 查看测试结果

测试完成后，你会看到：

```
🎉 完整导出流程测试通过！
⏱️ 总耗时: XXXXms
📦 输出大小: XX.XX KB
📹 格式: MP4 (H.264)

✨ Canvas → PNG → FFmpeg → MP4 流程验证成功！
```

---

## 📊 预期结果

### 成功指标

| 指标 | 预期值 | 说明 |
|------|--------|------|
| **Canvas 渲染** | ✅ 通过 | 30 帧，640x480 |
| **FFmpeg 加载** | ✅ 通过 | ~25MB 下载 |
| **MP4 编码** | ✅ 通过 | H.264 格式 |
| **输出大小** | ~50-200 KB | 取决于复杂度 |
| **总耗时** | <30 秒 | 包含 FFmpeg 加载 |
| **成功率** | 100% | 所有步骤通过 |

### 性能指标

- **Canvas 渲染**: <100ms（30 帧）
- **FFmpeg 加载**: 5-15 秒（首次）
- **编码时间**: 2-10 秒（1 秒视频）
- **总时间**: 10-30 秒

---

## ⚠️ 常见问题

### 1. SharedArrayBuffer 错误

**错误信息**:
```
SharedArrayBuffer is not defined
```

**原因**: 浏览器不支持或 COOP/COEP 头未生效

**解决方案**:
1. 确保使用 Chrome/Edge（91+）
2. 清除浏览器缓存
3. 检查网络头（F12 → Network → 点击请求 → Headers）

---

### 2. FFmpeg 加载超时

**错误信息**:
```
FFmpeg 加载超时（60秒）
```

**原因**: 网络问题导致 ~25MB 核心文件下载失败

**解决方案**:
- 检查网络连接
- 确保可以访问 `unpkg.com`
- 刷新页面重试

---

### 3. 页面加载失败

**现象**: 页面空白或报错

**解决方案**:
1. 检查服务器是否运行：
   ```bash
   curl http://localhost:4100/zh/ffmpeg-export-test
   ```
2. 重启开发服务器：
   ```bash
   pkill -f "next dev"
   bun run dev
   ```

---

## 🧪 验证清单

### 测试前

- [x] 开发服务器已启动
- [x] COOP/COEP 头已配置
- [x] 测试页面可访问（HTTP 200）
- [ ] 浏览器支持 SharedArrayBuffer

### 测试中

- [ ] Canvas 渲染成功
- [ ] FFmpeg 加载成功
- [ ] MP4 编码成功
- [ ] 进度条正常显示
- [ ] 日志实时输出

### 测试后

- [ ] 所有测试通过
- [ ] 输出文件大小合理
- [ ] 总耗时合理（<30 秒）
- [ ] 下载并播放 MP4 文件

---

## 📝 手动验证

### 验证 MP4 文件

测试完成后，可以添加下载功能：

```typescript
// 在 ffmpeg-export-test/page.tsx 中添加
const downloadVideo = (data: Uint8Array, filename: string) => {
  const blob = new Blob([data], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 检查 HTTP 头

在浏览器开发者工具中验证 COOP/COEP 头：

1. 打开 F12 → Network
2. 刷新页面
3. 点击第一个请求
4. 查看 Response Headers

应该看到：
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## 🎯 下一步

### 如果测试通过 ✅

1. **验证输出质量**
   - 下载生成的 MP4
   - 检查视频是否可播放
   - 验证分辨率和帧率

2. **继续 Week 4 任务**
   - [ ] WebM 编码测试
   - [ ] 音频合并测试
   - [ ] 质量控制测试
   - [ ] 性能基准测试

3. **完整导出测试**
   - 使用实际项目测试
   - 验证与 Mediabunny 输出对比
   - 测试大项目（>5 分钟）

---

### 如果测试失败 ❌

1. **查看错误日志**
   - 页面上的测试日志
   - 浏览器控制台（F12 → Console）
   - 服务器日志

2. **常见问题排查**
   - SharedArrayBuffer 错误
   - FFmpeg 加载超时
   - 网络连接问题

3. **提供反馈**
   - 截图错误信息
   - 复制日志内容
   - 说明浏览器版本

---

## 📚 相关文档

- **测试指南**: `docs/ffmpeg-export-test-guide.md`
- **测试文档**: `docs/ffmpeg-export-testing.md`
- **测试创建**: `docs/export-test-created.md`
- **Node.js 测试**: `docs/nodejs-test-execution.md`
- **CanvasRenderer 结果**: `docs/canvas-renderer-test-results.md`
- **TypeScript 检查**: `docs/typescript-final-report.md`

---

## 🎉 总结

**开发服务器已启动，测试页面可访问！**

### 访问地址

- **Next.js 测试页面**: http://localhost:4100/zh/ffmpeg-export-test
- **静态 HTML 页面**: http://localhost:4100/ffmpeg-export-test.html

### 快速开始

```bash
# 在浏览器中打开
open http://localhost:4100/zh/ffmpeg-export-test

# 点击"开始完整测试"
# 观察测试进度
# 查看测试结果
```

**准备好进行完整的 Canvas → PNG → FFmpeg → MP4 流程验证！** 🚀
