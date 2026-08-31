/**
 * FFmpeg.wasm Phase 1 - 浏览器集成测试
 *
 * 此文件用于在浏览器环境中手动测试 FFmpeg.wasm
 * 可以保存为 HTML 文件在浏览器中打开
 */

import { FFmpegService } from './ffmpeg-service'

async function runTests() {
  console.log('=== FFmpeg.wasm Phase 1 浏览器集成测试 ===\n')

  const service = new FFmpegService({
    logLevel: 'debug',
  })

  try {
    // 1. 加载 FFmpeg
    console.log('1️⃣  加载 FFmpeg...')
    await service.load()
    console.log('✅ FFmpeg 加载成功\n')

    // 2. 获取版本
    console.log('2️⃣  获取版本信息...')
    const versionResult = await service.exec(['-version'])
    console.log('版本命令输出:', versionResult.stdout.substring(0, 200))
    console.log('✅ 版本信息获取成功\n')

    // 3. 列出支持的格式
    console.log('3️⃣  列出支持的格式...')
    const formatsResult = await service.exec(['-formats'])
    console.log('✅ 格式列表获取成功\n')

    // 4. 列出支持的编解码器
    console.log('4️⃣  列出支持的编解码器...')
    const codecsResult = await service.exec(['-codecs'])
    console.log('✅ 编解码器列表获取成功\n')

    // 5. 列出可用的滤镜
    console.log('5️⃣  列出可用的滤镜...')
    const filtersResult = await service.exec(['-filters'])
    console.log('✅ 滤镜列表获取成功\n')

    // 6. 测试文件写入和读取
    console.log('6️⃣  测试文件写入和读取...')
    const testFileName = 'test.txt'
    const testContent = new TextEncoder().encode('Hello FFmpeg.wasm!')

    await service.writeFile(testFileName, testContent)
    const readContent = await service.readFile(testFileName)
    const decodedContent = new TextDecoder().decode(readContent)

    console.log('写入内容:', 'Hello FFmpeg.wasm!')
    console.log('读取内容:', decodedContent)
    console.assert(decodedContent === 'Hello FFmpeg.wasm!', '内容不匹配')
    console.log('✅ 文件读写测试成功\n')

    // 7. 列出文件
    console.log('7️⃣  列出虚拟文件系统...')
    const files = await service.listDir('.')
    console.log('文件列表:', files.map((f) => f.name))
    console.log('✅ 文件列表获取成功\n')

    // 8. 测试简单的视频转换
    console.log('8️⃣  测试视频信息查询...')
    // 创建一个简单的测试视频
    await service.exec([
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=1:size=320x240:rate=1',
      '-y',
      'test-video.mp4',
    ])

    const probeResult = await service.exec(['-i', 'test-video.mp4'])
    console.log('视频信息:', probeResult.stderr.substring(0, 200))
    console.log('✅ 视频信息查询成功\n')

    // 9. 清理
    console.log('9️⃣  清理临时文件...')
    await service.deleteFile(testFileName)
    await service.deleteFile('test-video.mp4')
    console.log('✅ 清理完成\n')

    console.log('=== 所有测试通过 ✅ ===')
  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
runTests()
