/**
 * FFmpeg.wasm 独立测试页面
 * 这个页面完全绕过 Next.js，直接在浏览器中测试 FFmpeg
 *
 * 访问: http://localhost:4100/zh/ffmpeg-browser-test
 */

'use client'

import { useEffect, useState } from 'react'

export default function FFmpegBrowserTestPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString()
    const colors = { success: '#10b981', error: '#ef4444', info: '#60a5fa' }
    setLogs(prev => [...prev, `[${time}] <span style="color: ${colors[type]}">${msg}</span>`])
  }

  const runTest = async () => {
    setLoading(true)
    setLogs([])
    setResults(null)

    addLog('开始独立测试...')

    try {
      // 动态导入 FFmpeg
      addLog('导入 @ffmpeg/ffmpeg...')
      const ffmpegModule = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js')

      addLog('导入 @ffmpeg/util...')
      const utilModule = await import('https://unpkg.com/@ffmpeg/util@0.12.10/dist/esm/index.js')

      const { FFmpeg } = ffmpegModule
      const { fetchFile, toBlobURL } = utilModule

      addLog('创建 FFmpeg 实例...')
      const ffmpeg = new FFmpeg()

      ffmpeg.on('log', ({ message }: { message: string }) => {
        addLog(`[FFmpeg] ${message}`)
      })

      ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        addLog(`进度: ${(progress * 100).toFixed(2)}%`)
      })

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
      addLog('加载核心文件...')

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      ffmpeg.fetchFile = fetchFile
      addLog('✅ FFmpeg 加载完成！', 'success')

      // 运行测试
      const testResults: any = {}

      // 测试 1: 版本
      try {
        addLog('测试: 版本信息')
        const versionResult = await ffmpeg.exec(['-version'])
        testResults.version = {
          version: versionResult.stdout.split('\n')[0],
          exitCode: versionResult.exitCode,
        }
        addLog('✅ 版本测试通过', 'success')
      } catch (e: any) {
        testResults.version = { error: e.message }
        addLog('❌ 版本测试失败', 'error')
      }

      // 测试 2: 格式
      try {
        addLog('测试: 支持的格式')
        const formatsResult = await ffmpeg.exec(['-formats'])
        const formats = formatsResult.stdout.split('\n')
          .filter((l: string) => l.includes('E') && (l.includes('mp4') || l.includes('mov') || l.includes('avi')))
          .slice(0, 10)
        testResults.formats = { formats }
        addLog('✅ 格式测试通过', 'success')
      } catch (e: any) {
        testResults.formats = { error: e.message }
        addLog('❌ 格式测试失败', 'error')
      }

      // 测试 3: 编解码器
      try {
        addLog('测试: 编解码器')
        const codecsResult = await ffmpeg.exec(['-codecs'])
        const codecs = codecsResult.stdout.split('\n')
          .filter((l: string) => l.includes('E') && (l.includes('h264') || l.includes('vp9')))
          .slice(0, 10)
        testResults.codecs = { codecs }
        addLog('✅ 编解码器测试通过', 'success')
      } catch (e: any) {
        testResults.codecs = { error: e.message }
        addLog('❌ 编解码器测试失败', 'error')
      }

      // 测试 4: 滤镜
      try {
        addLog('测试: 可用滤镜')
        const filtersResult = await ffmpeg.exec(['-filters'])
        const filters = filtersResult.stdout.split('\n')
          .filter((l: string) => l.includes('V') && (l.includes('eq') || l.includes('blur') || l.includes('unsharp') || l.includes('lut3d')))
          .slice(0, 15)
        testResults.filters = { filters }
        addLog('✅ 滤镜测试通过', 'success')
      } catch (e: any) {
        testResults.filters = { error: e.message }
        addLog('❌ 滤镜测试失败', 'error')
      }

      // 测试 5: 文件 IO
      try {
        addLog('测试: 文件读写')
        const filename = `test-${Date.now()}.txt`
        const content = new TextEncoder().encode('Hello FFmpeg.wasm!')
        await ffmpeg.writeFile(filename, content)
        const data = await ffmpeg.readFile(filename)
        const text = new TextDecoder().decode(data)
        await ffmpeg.deleteFile(filename)
        testResults['file-io'] = { write: 'Hello FFmpeg.wasm!', read: text, match: text === 'Hello FFmpeg.wasm!' }
        addLog('✅ 文件读写测试通过', 'success')
      } catch (e: any) {
        testResults['file-io'] = { error: e.message }
        addLog('❌ 文件读写测试失败', 'error')
      }

      // 测试 6: 视频生成
      try {
        addLog('测试: 视频生成')
        const videoFile = `test-${Date.now()}.mp4`
        await ffmpeg.exec(['-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x240:rate=1', '-y', videoFile])
        const files = await ffmpeg.listDir('.')
        await ffmpeg.deleteFile(videoFile)
        testResults.video = { file: videoFile, size: files.find((f: any) => f.name === videoFile)?.size || 0 }
        addLog('✅ 视频生成测试通过', 'success')
      } catch (e: any) {
        testResults.video = { error: e.message }
        addLog('❌ 视频生成测试失败', 'error')
      }

      // 统计
      const values = Object.values(testResults)
      const passed = values.filter((r: any) => !r.error).length
      const total = values.length

      setResults({
        test: 'all',
        summary: { total, passed, failed: total - passed, passRate: `${((passed / total) * 100).toFixed(1)}%` },
        results: testResults,
      })

      addLog(`✅ 测试完成: ${passed}/${total} 通过`, 'success')
    } catch (error: any) {
      addLog(`❌ 测试失败: ${error.message}`, 'error')
      setResults({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '40px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#3b82f6' }}>
          🎬 FFmpeg.wasm 浏览器独立测试
        </h1>

        <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
          完全绕过 Next.js，直接在浏览器中从 CDN 加载并测试 FFmpeg.wasm
        </p>

        <button
          onClick={runTest}
          disabled={loading}
          style={{
            background: '#10b981',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '2rem',
          }}
        >
          {loading ? '测试中...' : '运行所有测试'}
        </button>

        {logs.length > 0 && (
          <div style={{
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '2rem',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}>
            {logs.map((log, i) => (
              <div key={i} dangerouslySetInnerHTML={{ __html: log }} />
            ))}
          </div>
        )}

        {results && results.summary && (
          <div style={{
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <h3 style={{
              color: results.summary.passed === results.summary.total ? '#10b981' : '#f59e0b',
              marginBottom: '12px',
            }}>
              测试汇总: {results.summary.passed}/{results.summary.total} 通过 ({results.summary.passRate})
            </h3>

            {Object.entries(results.results).map(([key, value]: [string, any]) => {
              const success = !value.error
              return (
                <div key={key} style={{
                  background: '#0a0a0a',
                  borderLeft: `4px solid ${success ? '#10b981' : '#ef4444'}`,
                  padding: '12px',
                  margin: '8px 0',
                  borderRadius: '4px',
                }}>
                  <h4 style={{ color: success ? '#10b981' : '#ef4444', margin: '0 0 8px 0' }}>
                    {success ? '✅' : '❌'} {key}
                  </h4>
                  <pre style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#d1d5db',
                  }}>
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
