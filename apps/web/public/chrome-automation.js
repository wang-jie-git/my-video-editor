// 使用 Chrome DevTools Protocol 自动化测试
// 这个方法不需要 puppeteer，直接使用 Chrome 的远程调试功能

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

// Chrome DevTools Protocol URL
const chromeDebugUrl = 'http://127.0.0.1:9222/json'

async function runTest() {
  console.log('🚀 启动 Chrome 自动化测试...\n')

  // 1. 启动 Chrome 并开启远程调试
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

  if (!fs.existsSync(chromePath)) {
    console.error('❌ Chrome 未找到:', chromePath)
    console.log('尝试使用默认 Chrome...')
  }

  // 检查 Chrome 是否已经在运行
  let chromeRunning = false
  try {
    const response = await fetch(chromeDebugUrl)
    if (response.ok) {
      const tabs = await response.json()
      console.log(`✓ Chrome 已在运行 (${tabs.length} 个标签页)`)
      chromeRunning = true
    }
  } catch (e) {
    console.log('Chrome 未运行，正在启动...')
  }

  if (!chromeRunning) {
    console.log('正在启动 Chrome（远程调试模式）...')
    exec(`"${chromePath}" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-$$ &`, (err) => {
      if (err) {
        console.error('❌ 启动 Chrome 失败:', err)
        process.exit(1)
      }

      console.log('✓ Chrome 启动中，等待就绪...')
      setTimeout(runTest, 3000) // 3 秒后重试
    })
    return
  }

  // 2. 获取标签页列表
  try {
    const response = await fetch(chromeDebugUrl)
    const tabs = await response.json()

    // 查找测试页面
    const testTab = tabs.find(tab =>
      tab.url && tab.url.includes('ffmpeg-test-standalone.html')
    )

    if (testTab) {
      console.log('✓ 找到测试页面:', testTab.url)
      console.log('  Tab ID:', testTab.id)

      // 3. 连接 WebSocket 并执行 JavaScript
      const wsUrl = testTab.webSocketDebuggerUrl

      console.log('\n⚠️  请手动在 Chrome 中:')
      console.log('1. 按 F12 打开 DevTools')
      console.log('2. 切换到 Console 标签')
      console.log('3. 点击"运行所有测试"')
      console.log('4. 截图或复制日志发给我\n')

      console.log('或者使用以下命令获取截图:')
      console.log(`  cd ${__dirname} && node screenshot-test.js`)

    } else {
      console.log('⚠️  未找到测试页面')
      console.log('可用的标签页:')
      tabs.forEach(tab => {
        console.log(`  - ${tab.title || '(no title)'}: ${tab.url}`)
      })
    }

  } catch (e) {
    console.error('❌ 获取标签页失败:', e.message)
    process.exit(1)
  }
}

runTest()
