const http = require('http')
const fs = require('fs')
const path = require('path')

// 创建简单的测试报告端点
const server = http.createServer((req, res) => {
  if (req.url === '/test-report' && req.method === 'GET') {
    // 读取测试结果
    const result = localStorage?.getItem?.('ffmpeg-test-result') || '{}'

    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    })
    res.end(result)
  } else if (req.url === '/submit-report' && req.method === 'POST') {
    // 接收测试报告
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      const report = JSON.parse(body)
      console.log('\n=== 测试报告 ===')
      console.log('时间:', report.timestamp)
      console.log('成功:', report.success ? '✅' : '❌')
      if (report.error) console.log('错误:', report.error)
      if (report.version) console.log('版本:', report.version)
      console.log('日志数:', report.logs?.length || 0)
      console.log('================\n')

      res.writeHead(200, {'Access-Control-Allow-Origin': '*'})
      res.end('OK')

      process.exit(0)
    })
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(9999, () => {
  console.log('测试报告服务器运行在 http://127.0.0.1:9999')
  console.log('等待测试报告...\n')
})
