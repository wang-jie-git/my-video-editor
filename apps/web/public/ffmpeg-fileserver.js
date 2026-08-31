const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 8889
const BASE_DIR = path.join(__dirname, 'node_modules')

const mimeTypes = {
  '.js': 'application/javascript',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`)

  // 只处理 @ffmpeg 相关请求
  if (!req.url.startsWith('/@ffmpeg/')) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  // 移除前导 /
  const filePath = path.join(BASE_DIR, req.url.substring(1))

  console.log(`Looking for: ${filePath}`)

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error: ${err.message}`)
      res.writeHead(404)
      res.end('Not found')
      return
    }

    const ext = path.extname(filePath)
    const contentType = mimeTypes[ext] || 'application/octet-stream'

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log(`FFmpeg file server running at http://localhost:${PORT}/`)
  console.log(`Serving from: ${BASE_DIR}`)
})
