/**
 * FFmpeg.wasm Phase 1 - 浏览器验证页面（客户端直接测试）
 *
 * 访问: http://localhost:4100/zh/ffmpeg-test
 *
 * 直接在前端使用 FFmpegService，不通过 API
 */

'use client'

import { useState, useCallback } from 'react'

export default function FFmpegTestPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [ffmpegInitialized, setFfmpegInitialized] = useState(false)

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const colors = {
      info: '#60a5fa',
      success: '#34d399',
      error: '#f87171',
    }
    setLogs((prev) => [...prev, `[${timestamp}] <span style="color: ${colors[type]}">${message}</span>`])
  }, [])

  const runTest = async (action: string) => {
    setLoading(true)
    setResults(null)
    setProgress(0)
    setLogs([])

    addLog(`开始测试: ${action}`, 'info')

    try {
      // 动态导入 FFmpegService（避免 Next.js 16 静态分析问题）
      const { FFmpegService } = await import('@/services/renderer/ffmpeg/ffmpeg-service')

      // 创建 FFmpegService 实例
      addLog('创建 FFmpegService...', 'info')
      const service = new FFmpegService({
        logLevel: 'info',
      })

      // 加载 FFmpeg
      setProgress(10)
      addLog('加载 FFmpeg.wasm...', 'info')
      await service.load()
      setFfmpegInitialized(true)
      setProgress(30)
      addLog('✅ FFmpeg 加载成功', 'success')

      let data: any

      // 执行测试
      switch (action) {
        case 'version':
          data = await testVersion(service)
          break
        case 'formats':
          data = await testFormats(service)
          break
        case 'codecs':
          data = await testCodecs(service)
          break
        case 'filters':
          data = await testFilters(service)
          break
        case 'file-io':
          data = await testFileIO(service)
          break
        case 'video-generation':
          data = await testVideoGeneration(service)
          break
        case 'all':
          data = await runAllTests(service)
          break
        default:
          throw new Error(`未知操作: ${action}`)
      }

      setProgress(100)
      addLog(`✅ ${action} 测试完成`, 'success')
      setResults({ success: true, test: action, data })

      // 清理
      await service.cleanup()
      addLog('🧹 清理完成', 'info')
    } catch (error) {
      console.error('测试失败:', error)

      // 提供更友好的错误信息
      let errorMessage = error.message
      if (error.message.includes('Failed to fetch')) {
        errorMessage = '网络错误：无法下载 FFmpeg 核心文件。请检查：\n1. 网络连接是否正常\n2. 是否可以访问 unpkg.com\n3. 是否被防火墙或代理阻止'
      } else if (error.message.includes('timeout')) {
        errorMessage = '加载超时：FFmpeg 下载时间过长，请检查网络速度'
      }

      addLog(`❌ 测试失败: ${errorMessage}`, 'error')
      setResults({
        success: false,
        test: action,
        error: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      padding: '40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700' }}>
          🎬 FFmpeg.wasm Phase 1 浏览器测试
        </h1>

        <p style={{ fontSize: '1.125rem', color: '#9ca3af', marginBottom: '2rem' }}>
          直接在浏览器中测试 FFmpeg.wasm 基础功能
        </p>

        {/* 状态指示器 */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: ffmpegInitialized ? '#10b981' : '#6b7280',
          }} />
          <span style={{ color: ffmpegInitialized ? '#10b981' : '#9ca3af' }}>
            {ffmpegInitialized ? '✅ FFmpeg.wasm 已就绪' : '⏳ FFmpeg.wasm 未加载'}
          </span>
        </div>

        {/* 测试控制 */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '2rem',
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#3b82f6' }}>
            测试控制
          </h2>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <TestButton onClick={() => runTest('version')} loading={loading}>
              版本信息
            </TestButton>
            <TestButton onClick={() => runTest('formats')} loading={loading}>
              支持的格式
            </TestButton>
            <TestButton onClick={() => runTest('codecs')} loading={loading}>
              编解码器
            </TestButton>
            <TestButton onClick={() => runTest('filters')} loading={loading}>
              可用滤镜
            </TestButton>
            <TestButton onClick={() => runTest('file-io')} loading={loading}>
              文件读写
            </TestButton>
            <TestButton onClick={() => runTest('video-generation')} loading={loading}>
              视频生成
            </TestButton>
            <TestButton onClick={() => runTest('all')} loading={loading} primary>
              运行所有测试
            </TestButton>
          </div>

          {/* 进度条 */}
          {loading && (
            <div>
              <div style={{
                background: '#333',
                borderRadius: '8px',
                height: '24px',
                overflow: 'hidden',
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                  height: '100%',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                }}>
                  {progress}%
                </div>
              </div>
              <p style={{
                fontSize: '14px',
                color: '#9ca3af',
                textAlign: 'center',
                marginTop: '8px',
              }}>
                {progress < 100 ? '执行中...' : '✅ 完成'}
              </p>
            </div>
          )}
        </div>

        {/* 日志输出 */}
        {logs.length > 0 && (
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '2rem',
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#3b82f6' }}>
              日志输出
            </h2>
            <div style={{
              background: '#0a0a0a',
              borderRadius: '8px',
              padding: '16px',
              fontFamily: 'Monaco, "Courier New", monospace',
              fontSize: '13px',
              maxHeight: '300px',
              overflowY: 'auto',
              lineHeight: '1.6',
            }}>
              {logs.map((log, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: log }} />
              ))}
            </div>
          </div>
        )}

        {/* 测试结果 */}
        {results && (
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '2rem',
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#3b82f6' }}>
              测试结果
            </h2>
            <ResultDisplay data={results} />
          </div>
        )}

        {/* 说明 */}
        <div style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#3b82f6' }}>
            ⚠️ 注意事项
          </h2>
          <ul style={{ lineHeight: '1.8', color: '#d1d5db', marginLeft: '20px' }}>
            <li>FFmpeg.wasm 需要在浏览器中运行（不是在服务器上）</li>
            <li>首次加载需要从 CDN 下载 FFmpeg 核心文件（~8MB），可能需要几秒钟</li>
            <li>需要浏览器支持 SharedArrayBuffer 和 WebAssembly</li>
            <li>测试过程中会生成临时文件，测试完成后会自动清理</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * 测试按钮
 */
function TestButton({
  onClick,
  loading,
  children,
  primary = false,
}: {
  onClick: () => void
  loading: boolean
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: primary ? '#10b981' : '#3b82f6',
        color: '#fff',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  )
}

/**
 * 测试函数
 */
async function testVersion(service: FFmpegService) {
  console.log('[Test] 获取版本信息...')
  const result = await service.exec(['-version'])
  const version = result.stdout.split('\n')[0]

  return {
    success: true,
    test: 'version',
    data: {
      version,
      exitCode: result.exitCode,
      duration: result.duration,
    },
  }
}

async function testFormats(service: FFmpegService) {
  console.log('[Test] 获取支持的格式...')
  const result = await service.exec(['-formats'])

  const lines = result.stdout.split('\n')
  const formats = lines
    .filter((line) => line.includes('E') && (line.includes('mp4') || line.includes('mov') || line.includes('avi')))
    .slice(0, 10)
    .map((line) => line.trim())

  return {
    success: true,
    test: 'formats',
    data: {
      formats,
      rawOutput: result.stdout.substring(0, 2000),
    },
  }
}

async function testCodecs(service: FFmpegService) {
  console.log('[Test] 获取支持的编解码器...')
  const result = await service.exec(['-codecs'])

  const lines = result.stdout.split('\n')
  const videoCodecs = lines
    .filter((line) => line.includes('E') && (line.includes('h264') || line.includes('vp9') || line.includes('av1')))
    .slice(0, 10)
    .map((line) => line.trim())

  return {
    success: true,
    test: 'codecs',
    data: {
      videoCodecs,
      rawOutput: result.stdout.substring(0, 2000),
    },
  }
}

async function testFilters(service: FFmpegService) {
  console.log('[Test] 获取可用的滤镜...')
  const result = await service.exec(['-filters'])

  const lines = result.stdout.split('\n')
  const videoFilters = lines
    .filter((line) => line.includes('V') && (line.includes('eq') || line.includes('blur') || line.includes('unsharp') || line.includes('lut3d')))
    .slice(0, 15)
    .map((line) => line.trim())

  return {
    success: true,
    test: 'filters',
    data: {
      videoFilters,
      rawOutput: result.stdout.substring(0, 2000),
    },
  }
}

async function testFileIO(service: FFmpegService) {
  console.log('[Test] 测试文件读写...')

  const testFileName = `test-${Date.now()}.txt`
  const testContent = new TextEncoder().encode('Hello FFmpeg.wasm!')

  await service.writeFile(testFileName, testContent)
  const readContent = await service.readFile(testFileName)
  const decodedContent = new TextDecoder().decode(readContent)

  const files = await service.listDir('.')

  await service.deleteFile(testFileName)

  return {
    success: true,
    test: 'file-io',
    data: {
      write: 'Hello FFmpeg.wasm!',
      read: decodedContent,
      match: decodedContent === 'Hello FFmpeg.wasm!',
      files,
    },
  }
}

async function testVideoGeneration(service: FFmpegService) {
  console.log('[Test] 生成测试视频...')

  const outputFile = `test-video-${Date.now()}.mp4`

  await service.exec([
    '-f',
    'lavfi',
    '-i',
    'testsrc=duration=1:size=320x240:rate=1',
    '-y',
    outputFile,
  ])

  const files = await service.listDir('.')
  const videoFile = files.find((f) => f.name === outputFile)

  const probeResult = await service.exec(['-i', outputFile])

  await service.deleteFile(outputFile)

  return {
    success: true,
    test: 'video-generation',
    data: {
      fileName: outputFile,
      fileSize: videoFile?.size || 0,
      probeInfo: probeResult.stderr.substring(0, 500),
    },
  }
}

async function runAllTests(service: FFmpegService) {
  console.log('[Test] 运行所有测试...')

  const results: any = {}

  // 版本测试
  try {
    results.version = await testVersion(service)
  } catch (error: any) {
    results.version = { success: false, error: error.message }
  }

  // 格式测试
  try {
    results.formats = await testFormats(service)
  } catch (error: any) {
    results.formats = { success: false, error: error.message }
  }

  // 编解码器测试
  try {
    results.codecs = await testCodecs(service)
  } catch (error: any) {
    results.codecs = { success: false, error: error.message }
  }

  // 滤镜测试
  try {
    results.filters = await testFilters(service)
  } catch (error: any) {
    results.filters = { success: false, error: error.message }
  }

  // 文件 IO 测试
  try {
    results['file-io'] = await testFileIO(service)
  } catch (error: any) {
    results['file-io'] = { success: false, error: error.message }
  }

  // 视频生成测试
  try {
    results['video-generation'] = await testVideoGeneration(service)
  } catch (error: any) {
    results['video-generation'] = { success: false, error: error.message }
  }

  // 统计
  const values = Object.values(results)
  const passed = values.filter((r: any) => r.success).length
  const total = values.length

  return {
    test: 'all',
    summary: {
      total,
      passed,
      failed: total - passed,
      passRate: `${((passed / total) * 100).toFixed(1)}%`,
    },
    results,
  }
}

/**
 * 结果显示组件
 */
function ResultDisplay({ data }: { data: any }) {
  if (data.test === 'all') {
    const summary = data.summary

    if (!summary) {
      return <div style={{ color: '#f87171' }}>错误: 测试结果数据不完整</div>
    }

    return (
      <div>
        <div style={{
          background: '#0a0a0a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            marginBottom: '12px',
            color: summary.passed === summary.total ? '#10b981' : '#f59e0b',
          }}>
            测试汇总
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                {summary.total}
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>总计</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                {summary.passed}
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>通过</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
                {summary.failed}
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>失败</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                {summary.passRate}
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>通过率</div>
            </div>
          </div>
        </div>

        {Object.entries(data.results).map(([key, value]: [string, any]) => {
          if (!value.success) {
            return (
              <div key={key} style={{
                background: '#0a0a0a',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                borderLeft: '4px solid #ef4444',
              }}>
                <h4 style={{ color: '#ef4444', marginBottom: '8px' }}>❌ {key}</h4>
                <p style={{ color: '#f87171' }}>{value.error || 'Unknown error'}</p>
              </div>
            )
          }

          return (
            <div key={key} style={{
              background: '#0a0a0a',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              borderLeft: '4px solid #10b981',
            }}>
              <h4 style={{ color: '#10b981', marginBottom: '8px' }}>✅ {key}</h4>
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'Monaco, "Courier New", monospace',
                fontSize: '13px',
                color: '#d1d5db',
              }}>
                {JSON.stringify(value.data || value, null, 2)}
              </pre>
            </div>
          )
        })}
      </div>
    )
  }

  // 单个测试
  const borderColor = data.success ? '#10b981' : '#ef4444'

  return (
    <div style={{
      background: '#0a0a0a',
      borderRadius: '8px',
      padding: '16px',
      borderLeft: `4px solid ${borderColor}`,
    }}>
      <h3 style={{
        color: borderColor,
        marginBottom: '12px',
      }}>
        {data.success ? '✅' : '❌'} {data.test}
      </h3>
      <pre style={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'Monaco, "Courier New", monospace',
        fontSize: '13px',
        color: '#d1d5db',
      }}>
        {JSON.stringify(data.data || data.error, null, 2)}
      </pre>
    </div>
  )
}
