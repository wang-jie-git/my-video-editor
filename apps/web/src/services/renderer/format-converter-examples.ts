/**
 * FormatConverter 使用示例
 *
 * 展示如何在真实项目中使用 FormatConverter
 */

import { FormatConverter } from '@/services/renderer/format-converter'
import { FFmpegService } from '@/services/renderer/ffmpeg/ffmpeg-service'

/**
 * 示例 1: 基础格式转换
 */
export async function example1_BasicConversion() {
  // 1. 创建服务
  const ffmpegService = new FFmpegService()
  const converter = new FormatConverter(ffmpegService)

  // 2. 加载 FFmpeg
  await ffmpegService.load()

  // 3. 准备输入文件（需要先写入 FFmpeg 虚拟文件系统）
  const inputFile = 'video.mov'
  // await ffmpegService.writeFile(inputFile, videoData)

  // 4. 执行转换
  const result = await converter.convertToMP4(inputFile, {
    format: 'mp4',
    quality: 'high',
    includeAudio: true,
  })

  // 5. 处理结果
  if (result.success) {
    console.log('转换成功:', result.size, 'bytes')
    // const outputData = result.data
  } else {
    console.error('转换失败:', result.error)
  }
}

/**
 * 示例 2: 批量转换
 */
export async function example2_BatchConversion() {
  const ffmpegService = new FFmpegService()
  const converter = new FormatConverter(ffmpegService)

  await ffmpegService.load()

  // 批量转换文件
  const files = ['video1.mov', 'video2.avi', 'video3.mkv']

  const results = await converter.batchConvert(
    files,
    { format: 'mp4', quality: 'medium' },
    (file, progress) => {
      console.log(`${file}: ${(progress * 100).toFixed(1)}%`)
    }
  )

  // 统计结果
  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  console.log(`转换完成: ${successCount} 成功, ${failCount} 失败`)
}

/**
 * 示例 3: 高级质量控制
 */
export async function example3_AdvancedQuality() {
  const ffmpegService = new FFmpegService()
  const converter = new FormatConverter(ffmpegService)

  await ffmpegService.load()

  // MOV → MP4 (H.265, CRF 20, slow preset)
  const result = await converter.convertToMP4('video.mov', {
    format: 'mp4',
    codec: 'libx265',
    crf: 20,
    preset: 'slow',
    includeAudio: true,
    overwrite: true,
  })

  if (result.success) {
    console.log('高级质量转换成功:', result.size, 'bytes')
  }
}

/**
 * 示例 4: MOV → WebM (VP9)
 */
export async function example4_MovToWebM() {
  const ffmpegService = new FFmpegService()
  const converter = new FormatConverter(ffmpegService)

  await ffmpegService.load()

  // MOV → WebM (VP9, very_high quality)
  const result = await converter.convertToMP4('video.mov', {
    format: 'webm',
    codec: 'libvpx-vp9',
    quality: 'very_high',
    includeAudio: true,
  })

  if (result.success) {
    console.log('WebM 转换成功:', result.size, 'bytes')
  }
}

/**
 * 示例 5: AVI → MP4 (无音频)
 */
export async function example5_AviToMp4NoAudio() {
  const ffmpegService = new FFmpegService()
  const converter = new FormatConverter(ffmpegService)

  await ffmpegService.load()

  // AVI → MP4 (移除音频)
  const result = await converter.convertToMP4('video.avi', {
    format: 'mp4',
    quality: 'high',
    includeAudio: false,
  })

  if (result.success) {
    console.log('转换成功（无音频）:', result.size, 'bytes')
  }
}

/**
 * 示例 6: 格式检测
 */
export function example6_FormatDetection() {
  const ffmpegService = new FFmpegService()
  const converter = new FormatConverter(ffmpegService)

  // 检测文件格式
  const testFiles = [
    'movie.mp4',
    'clip.mov',
    'video.avi',
    'film.mkv',
    'document.txt',
    'image.jpg',
  ]

  for (const file of testFiles) {
    const result = converter.detectFormat(file)

    console.log(`${file}:`)
    console.log(`  格式: ${result.format}`)
    console.log(`  视频: ${result.isVideo}`)
    console.log(`  支持: ${result.supported}`)
  }
}

/**
 * 示例 7: 批量转换与进度追踪
 */
export async function example7_BatchWithProgress() {
  const ffmpegService = new FFmpegService()
  const converter = new FormatConverter(ffmpegService)

  await ffmpegService.load()

  // 准备文件列表
  const files = [
    'video1.mov',
    'video2.avi',
    'video3.mkv',
    'video4.flv',
    'video5.wmv',
  ]

  console.log(`开始批量转换 ${files.length} 个文件`)

  const startTime = Date.now()

  const results = await converter.batchConvert(
    files,
    { format: 'mp4', quality: 'high' },
    (file, progress) => {
      const percent = (progress * 100).toFixed(1)
      console.log(`[${file}] ${percent}%`)
    }
  )

  const duration = Date.now() - startTime

  // 统计结果
  const successResults = results.filter((r) => r.success)
  const failResults = results.filter((r) => !r.success)

  console.log(`\n批量转换完成 (${duration}ms)`)
  console.log(`成功: ${successResults.length}`)
  console.log(`失败: ${failResults.length}`)

  if (failResults.length > 0) {
    console.log('\n失败文件:')
    failResults.forEach((r) => {
      console.log(`  - ${r.error}`)
    })
  }
}

/**
 * 示例 8: 与 UI 组件集成
 */
export async function example8_WithUIComponents() {
  // 在 React 组件中使用
  /*
  import { FormatConverterPanel } from '@/components/editor/panels/format-converter'

  function FormatConverterPage() {
    const handleConvertComplete = (result) => {
      if (result.success) {
        console.log('转换完成:', result.outputUrl)
      }
    }

    return (
      <FormatConverterPanel onConvertComplete={handleConvertComplete} />
    )
  }
  */
}

/**
 * 示例 9: 错误处理
 */
export async function example9_ErrorHandling() {
  const ffmpegService = new FFmpegService()
  const converter = new FormatConverter(ffmpegService)

  await ffmpegService.load()

  try {
    // 转换不支持的格式
    const result = await converter.convertToMP4('video.xyz', {
      format: 'mp4',
    })

    if (!result.success) {
      console.error('转换失败:', result.error)
      // 显示错误提示给用户
    }
  } catch (error) {
    console.error('异常:', error)
    // 处理异常情况
  }
}

/**
 * 示例 10: 获取转换支持信息
 */
export function example10_ConversionSupport() {
  const ffmpegService = new FFmpegService()
  const converter = new FormatConverter(ffmpegService)

  // 获取支持的格式
  const formats = converter.getSupportedFormats()
  console.log('支持的格式:', formats)

  // 获取转换支持矩阵
  const support = converter.getConversionSupport()
  console.log('转换支持矩阵:', support)

  // 检查特定格式支持
  console.log('MP4 → MP4:', support.mp4?.includes('mp4'))
  console.log('MOV → WebM:', support.mov?.includes('webm'))
  console.log('WMV → WebM:', support.wmv?.includes('webm'))
}
