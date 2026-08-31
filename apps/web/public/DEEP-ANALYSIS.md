# 🔍 深度分析：FFmpeg Worker CORS 问题

## 问题本质

### 时间线分析

```
页面加载
  ↓
[Body Script 执行]
  - 创建 Blob URL
  - 设置 Worker 拦截器
  ↓
[import('@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js')]
  - FFmpeg 模块加载
  - 内部立即创建 Worker ← 这里出问题！
  ↓
[Module Script 执行]
  - 导入 util 函数
  - loadFFmpeg() 函数
  ↓
[用户点击"运行所有测试"]
  - loadFFmpeg() 被调用
  - new FFmpeg() ← 太晚了！
  - ffmpeg.load() ← 这里触发 CORS 错误
```

### 关键发现

**FFmpeg 在 `import()` 时就创建了 Worker！**

不是在 `new FFmpeg()` 时
不是在 `ffmpeg.load()` 时
而是在**模块加载的瞬间**

## 🎯 为什么拦截器没用

### Body Script 拦截器

**设置时间**: 页面加载时（Body Script 执行）

**问题**: 使用 `fetch(blobURL).then()` 异步设置 Worker

```javascript
fetch(blobURL).then(function(r) {
  // 这里才替换 Worker ← 太晚了！
  globalThis.Worker = function(url, options) { ... }
})
```

**FFmpeg import 发生在**: Body Script 执行期间或之后立即

**结果**: Worker 替换还没完成，FFmpeg 就已经创建了 Worker

### Module Script 拦截器

**设置时间**: `type="module"` script 执行时

**问题**: 已经太晚了，FFmpeg 在 `import()` 时已经创建了 Worker

## 💡 真正的解决方案

### 方案 1: Service Worker（推荐）

Service Worker 可以拦截网络请求，在浏览器层面阻止 CDN worker.js 的加载。

**优势**:
- ✅ 真正在浏览器底层拦截
- ✅ 不需要修改 FFmpeg 代码
- ✅ 在 import 之前就生效

**实现**:
```javascript
// 在页面最开始的 script 中
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    console.log('Service Worker 已注册')
  })
}
```

`/sw.js`:
```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('worker.js')) {
    event.respondWith(
      new Response('self.onmessage=function(e){self.postMessage("ok")}', {
        headers: { 'Content-Type': 'application/javascript' }
      })
    )
  }
})
```

### 方案 2: 同步 Blob URL（最快）

移除 `fetch(blobURL).then()` 异步验证，直接同步替换 Worker。

**问题**: 无法保证 Blob 有效

### 方案 3: 直接修改 FFmpeg 源码

下载 FFmpeg 源码，修改 worker.js 的 URL 为本地路径。

**问题**: 维护困难，每次更新都要重新修改

### 方案 4: 禁用 Worker（最终方案）

回到 `useWorker: false`，但需要确保：
- 在 `new FFmpeg({ useWorker: false })` 时
- Worker 不会在任何地方被创建

**问题**: 之前尝试过，失败了。需要再试一次并仔细检查 FFmpeg 版本。

## 🔧 立即可行的方案

### 立即尝试：Service Worker

这是最可靠的方案，因为：
1. Service Worker 在页面加载前就注册
2. 可以拦截所有网络请求，包括 Worker 加载
3. 返回我们自定义的 worker 脚本

### 备选方案：深度调试

如果 Service Worker 太复杂，可以先：
1. 验证 `useWorker: false` 是否真的有效
2. 检查 FFmpeg 0.12.10 的文档
3. 查看 FFmpeg 是否提供了配置选项

## 📝 下一步行动

**推荐**: 实现 Service Worker 方案

**理由**:
- ✅ 最可靠
- ✅ 不依赖异步操作
- ✅ 在浏览器底层拦截
- ✅ 不需要修改 FFmpeg 配置

**备选**: 彻底禁用 Worker

**理由**:
- ✅ 最简单
- ⚠️ 需要确认是否真的能禁用

---

**我建议立即实现 Service Worker 方案。要不要我现在就创建？**
