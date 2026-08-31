#!/usr/bin/env python3
"""
增强 Worker 拦截器的调试版本
"""

# 读取原始文件
with open('/Users/mac/Desktop/cutia/apps/web/public/ffmpeg-test-standalone.html', 'r') as f:
    content = f.read()

# 查找并替换 Worker 拦截器部分
old_script = """  <script>
    // 🔧 Worker 拦截器 - 必须在 FFmpeg 模块加载之前设置
    // 使用非 module script 确保最早执行
    (function() {
      console.log('[Worker拦截] 设置开始')
      const OriginalWorker = globalThis.Worker

      // 创建一个简单的 worker 脚本（通过 Blob URL）
      const workerCode = `
        self.onmessage = function(e) {
          // 简单的响应
          self.postMessage({ type: 'message' })
        }
      `
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const blobURL = URL.createObjectURL(blob)

      console.log('[Worker拦截] Blob URL 已创建:', blobURL)

      // 替换 Worker 构造函数
      let workerIndex = 0
      globalThis.Worker = function(url, options) {
        workerIndex++
        console.log(\`[Worker拦截] #\${workerIndex} Worker 创建: \${url}\`)

        // 拦截所有 worker.js 请求
        if (typeof url === 'string' && url.includes('worker.js')) {
          console.log(\`[Worker拦截] #\${workerIndex} 拦截成功，使用 Blob URL\`)
          const worker = new OriginalWorker(blobURL, options)
          console.log(\`[Worker拦截] #\${workerIndex} Worker 已创建\`)
          return worker
        }

        return new OriginalWorker(url, options)
      }
      globalThis.Worker.prototype = OriginalWorker.prototype
      console.log('[Worker拦截] Worker 构造函数已替换')

      // 更新状态指示器
      setTimeout(function() {
        const status = document.getElementById('workerStatus')
        if (status) {
          status.textContent = '✓ Worker 拦截器已启用'
          status.style.background = '#10b981'
        }
      }, 100)
    })()
  </script>"""

new_script = """  <script>
    // 🔧 Worker 拦截器 - 增强调试版
    (function() {
      console.log('[Worker拦截] ========== 开始设置 ==========')
      const OriginalWorker = globalThis.Worker
      console.log('[Worker拦截] 原始 Worker:', OriginalWorker)

      // 创建 Blob URL
      const workerCode = 'self.onmessage=function(e){self.postMessage({type:\\'message\\'})}'
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const blobURL = URL.createObjectURL(blob)
      console.log('[Worker拦截] Blob URL:', blobURL)

      // 验证 Blob
      fetch(blobURL).then(r => console.log('[Worker拦截] Blob 验证:', r.status, r.ok ? '✓' : '✗')).catch(e => console.error('[Worker拦截] Blob 失败:', e))

      let callCount = 0
      let interceptedCount = 0

      globalThis.Worker = function(url, options) {
        callCount++
        const isFFmpegWorker = typeof url === 'string' && url.includes('worker.js')
        console.log('[Worker拦截] 调用 #' + callCount + ':', url)
        console.log('[Worker拦截] 是否 FFmpeg Worker:', isFFmpegWorker)

        if (isFFmpegWorker) {
          interceptedCount++
          console.log('[Worker拦截] ✓✓✓ 拦截成功！#' + interceptedCount)
          const worker = new OriginalWorker(blobURL, options)
          console.log('[Worker拦截] Worker 实例:', worker)
          return worker
        }

        console.log('[Worker拦截] 未拦截，使用原始 Worker')
        return new OriginalWorker(url, options)
      }
      globalThis.Worker.prototype = OriginalWorker.prototype
      console.log('[Worker拦截] Worker 已替换:', globalThis.Worker)
      console.log('[Worker拦截] ========== 设置完成 ==========')

      // 自动测试
      setTimeout(function() {
        console.log('[Worker拦截] 自动测试...')
        try {
          new globalThis.Worker('https://unpkg.com/@ffmpeg/test/worker.js')
        } catch(e) {
          console.error('[Worker拦截] 测试失败:', e)
        }
      }, 500)

      // 更新状态
      setTimeout(function() {
        var status = document.getElementById('workerStatus')
        if (status) {
          status.textContent = '✓ 拦截器已启用 (调用: ' + callCount + ', 拦截: ' + interceptedCount + ')'
          status.style.background = '#10b981'
        }
      }, 1000)
    })()
  </script>"""

if old_script in content:
    content = content.replace(old_script, new_script)
    print('✓ Worker 拦截器已更新')
else:
    print('✗ 未找到原始脚本，尝试搜索...')
    # 尝试找到脚本的位置
    if '<body>' in content:
        print('找到 <body> 标签')
    if 'Worker 拦截器' in content:
        print('找到 Worker 拦截器注释')

with open('/Users/mac/Desktop/cutia/apps/web/public/ffmpeg-test-standalone.html', 'w') as f:
    f.write(content)

print('文件已保存')
