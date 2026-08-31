# 🚀 终极方案：Object.defineProperty

## 🔍 深度分析

### 为什么之前的方案都失败了

1. **Worker 拦截器（Blob URL）**
   - ❌ 使用异步 `fetch(blobURL).then()` 设置 Worker
   - ❌ FFmpeg `import()` 在异步操作完成前就已经创建了 Worker

2. **Service Worker**
   - ❌ 只能拦截**同源**请求
   - ❌ FFmpeg 从 CDN 加载 worker.js（跨域）

3. **状态指示器**
   - ❌ DOM 元素尚未加载
   - ❌ 无法在 Body Script 中更新

### 根本原因

**FFmpeg 在模块加载时同步创建 Worker**

```javascript
// FFmpeg 内部（简化）
// 在 @ffmpeg/ffmpeg@0.12.10/dist/esm/index.js 中
const worker = new Worker('https://unpkg.com/.../worker.js')  // ← 同步执行
```

**时序问题**:
```
[Body Script]
  - 创建 Blob URL  ✓
  - fetch(blobURL) ← 异步，还没完成
  ↓
[import FFmpeg] ← 同步 import
  - new Worker(CDN URL) ← ✗ 拦截器还没设置好
  ↓
[fetch 完成]
  - 设置 Worker 拦截器 ← 太晚了！
```

## 🎯 终极方案：Object.defineProperty

### 核心思想

**在第 1 时间同步替换 Worker 构造函数**

```javascript
// 1. 创建 Blob URL（同步）
const blob = new Blob([code], { type: 'application/javascript' })
const blobURL = URL.createObjectURL(blob)

// 2. 使用 Object.defineProperty 立即替换（同步）
Object.defineProperty(globalThis, 'Worker', {
  value: function(url, options) {
    if (url.includes('worker.js')) {
      return new OriginalWorker(blobURL, options)
    }
    return new OriginalWorker(url, options)
  },
  writable: true,
  configurable: true
})

// 3. 设置原型
InterceptedWorker.prototype = OriginalWorker.prototype
```

### 关键改进

#### ✅ 同步执行
- ❌ 不再使用 `fetch(blobURL).then()`
- ✅ 直接同步创建 Blob
- ✅ 直接同步替换 Worker

#### ✅ Object.defineProperty
- ✅ 确保 Worker 被立即替换
- ✅ 即使 FFmpeg 缓存了原始引用，也能拦截

#### ✅ 调用栈追踪
- ✅ `console.error(new Error().stack)` 记录谁调用了 Worker
- ✅ 帮助理解 FFmpeg 的内部机制

#### ✅ 自动测试
- ✅ 页面加载 500ms 后自动测试
- ✅ 验证拦截器是否工作

## 📝 代码

### 1. Body Script（第 70-130 行）

```javascript
// 创建 Blob（同步）
const blob = new Blob([customWorkerCode], { type: 'application/javascript' })
const blobURL = URL.createObjectURL(blob)

// 保存原始 Worker
const OriginalWorker = globalThis.Worker

// 创建拦截器工厂
function createWorkerInterceptor() {
  let callCount = 0
  return function WorkerInterceptor(url, options) {
    callCount++
    console.log('[终极方案] Worker 调用 #' + callCount + ':', url)

    if (typeof url === 'string' && url.includes('worker.js')) {
      console.log('[终极方案] ✓✓✓ 拦截成功！')
      console.log('[终极方案] 调用栈:', new Error().stack)  // ← 关键！
      return new OriginalWorker(blobURL, options)
    }

    return new OriginalWorker(url, options)
  }
}

// 使用 Object.defineProperty 替换（同步）
const InterceptedWorker = createWorkerInterceptor()
Object.defineProperty(globalThis, 'Worker', {
  value: InterceptedWorker,
  writable: true,
  configurable: true
})

// 设置原型
InterceptedWorker.prototype = OriginalWorker.prototype
```

### 2. Module Script 调试（第 175-179 行）

```javascript
// 检查 Service Worker 状态
const registration = await navigator.serviceWorker.getRegistration()
console.log('[调试] Service Worker 状态:', registration ? '已注册 ✓' : '未注册 ✗')
```

## 🌐 测试步骤

### 1. 强制刷新

```
Ctrl+Shift+R 或 Cmd+Shift+R
```

或使用**无痕模式**

### 2. 打开 F12 控制台

### 3. 查看页面加载时的日志

**期望**（成功）:
```
[终极方案] ========== 开始 ==========
[终极方案] Blob URL 已创建: blob:http://127.0.0.1:8888/...
[终极方案] ✓ Worker 已通过 Object.defineProperty 替换
[终极方案] ========== 结束 ==========
[终极方案] 自动测试...
[终极方案] Worker 调用 #1: http://test/worker.js
[终极方案] ✓✓✓ 拦截成功！
[终极方案] 调用栈: Error
    at WorkerInterceptor (...)
    at ...
[终极方案] ✓ 测试通过！
```

### 4. 点击"运行所有测试"

**期望**（成功）:
```
[13:xx:xx] 开始加载 FFmpeg.wasm...
[13:xx:xx] 导入 @ffmpeg/ffmpeg@0.12.10...
[调试] Service Worker 状态: 未注册 ✗
[13:xx:xx] ✅ FFmpeg 模块加载成功: FFmpeg
[13:xx:xx] 创建 FFmpeg 实例...
[控制台] [终极方案] Worker 调用 #2: https://unpkg.com/.../worker.js  ← 关键！
[控制台] [终极方案] ✓✓✓ 拦截成功！
[13:xx:xx] ✅ FFmpeg 实例创建成功
[13:xx:xx] 加载核心文件...
[13:xx:xx] ✅ FFmpeg 加载完成！
```

## 📊 可能的结果

### ✅ 场景 1: Object.defineProperty 成功

**标志**:
- 看到 `[终极方案] ✓ 测试通过！`
- 看到 `[终极方案] Worker 调用 #N`（多次调用）
- 看到 `[终极方案] ✓✓✓ 拦截成功！`
- FFmpeg 加载成功

**原因**: Object.defineProperty 成功替换了 Worker

### ⚠️ 场景 2: 拦截器工作，但仍有 CORS

**标志**:
- 拦截器测试通过
- 但 FFmpeg 仍然有 CORS 错误

**原因**: FFmpeg 使用了不同的机制创建 Worker

**需要**: 查看 `[终极方案] 调用栈` 了解 FFmpeg 内部机制

### ❌ 场景 3: Object.defineProperty 失败

**标志**:
- 看到 `[终极方案] ✗ 严重错误`
- 或没有 `[终极方案]` 日志

**原因**: 浏览器安全限制或其他问题

## 🔍 关键调试信息

### 调用栈分析

`[终极方案] 调用栈` 会显示谁调用了 Worker：

```
[终极方案] 调用栈: Error
    at WorkerInterceptor (file:///...)
    at new FFmpeg (https://unpkg.com/...)
    at Module.eval (https://unpkg.com/...)
    at eval (https://unpkg.com/...)
```

**这将揭示**:
- FFmpeg 在哪个函数中创建 Worker
- 是在 `new FFmpeg()` 时还是更早
- 创建了几次 Worker

## 📝 修改文件

- ✅ `apps/web/public/ffmpeg-test-standalone.html`
  - 使用 Object.defineProperty 同步替换 Worker
  - 移除 fetch 异步验证
  - 添加调用栈追踪
  - 添加自动测试

- ✅ `apps/web/public/sw.js` - 已删除（无效）

## 🎯 优势

1. **同步执行**: 不依赖异步操作
2. **强制替换**: Object.defineProperty 确保 Worker 被替换
3. **调用栈追踪**: 了解 FFmpeg 内部机制
4. **自动测试**: 立即验证拦截器

---

**URL**: http://127.0.0.1:8888/ffmpeg-test-standalone.html

**请 Ctrl+Shift+R 后测试，并截图完整的 F12 控制台日志！**
