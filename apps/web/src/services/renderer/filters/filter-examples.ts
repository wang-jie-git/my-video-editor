/**
 * 视频滤镜使用示例
 *
 * 展示如何使用 FilterPipeline 和各种滤镜
 */

import { FFmpegService } from './ffmpeg/ffmpeg-service'
import {
  FilterPipeline,
  ColorCorrection,
  Blur,
  Sharpen,
  LutFilterImpl,
  createColorCorrectionFilter,
  createBlurFilter,
  createSharpenFilter,
  createLutFilter,
  COLOR_CORRECTION_PRESETS,
  BLUR_PRESETS,
  createEmptyFilterChain,
  cloneFilterChain,
  mergeFilterChains,
  removeFiltersByType,
  getFiltersByType,
  hasEnabledFilters,
} from './index'

// ==================== 示例 1: 基础颜色校正 ====================

/**
 * 示例 1: 应用基础颜色校正
 */
export async function example1_basicColorCorrection() {
  console.log('示例 1: 基础颜色校正')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建滤镜链
  const chain = createEmptyFilterChain()

  // 添加颜色校正滤镜
  const colorFilter = createColorCorrectionFilter({
    brightness: 0.1,  // 增加亮度
    contrast: 1.2,    // 增加对比度
    saturation: 1.1,  // 增加饱和度
  })

  const chainWithColor = pipeline.addFilter(chain, colorFilter)

  // 应用滤镜
  const result = await pipeline.applyFilters({
    inputFile: 'input.mp4',
    outputFile: 'output_color.mp4',
    filterChain: chainWithColor,
    onProgress: (progress) => console.log(`进度: ${progress}%`),
  })

  if (result.success) {
    console.log('✅ 颜色校正完成:', result.outputFile)
  } else {
    console.error('❌ 失败:', result.error)
  }
}

// ==================== 示例 2: 使用颜色校正预设 ====================

/**
 * 示例 2: 使用预设快速调整颜色
 */
export async function example2_colorCorrectionPreset() {
  console.log('示例 2: 使用颜色校正预设')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建基础滤镜
  const baseFilter = createColorCorrectionFilter()

  // 应用 "vivid" 预设（鲜艳风格）
  const vividFilter = {
    ...baseFilter,
    ...COLOR_CORRECTION_PRESETS.vivid,
  }

  const chain = pipeline.addFilter(createEmptyFilterChain(), vividFilter)

  // 应用滤镜
  const result = await pipeline.applyFilters({
    inputFile: 'input.mp4',
    outputFile: 'output_vivid.mp4',
    filterChain: chain,
  })

  console.log(result.success ? '✅ vivid 预设完成' : '❌ 失败')
}

// ==================== 示例 3: 模糊效果 ====================

/**
 * 示例 3: 应用模糊效果
 */
export async function example3_blurEffect() {
  console.log('示例 3: 模糊效果')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建模糊滤镜
  const blurFilter = createBlurFilter({
    strength: 10,        // 中等强度
    blurType: 'gaussian', // 高斯模糊
  })

  const chain = pipeline.addFilter(createEmptyFilterChain(), blurFilter)

  // 应用滤镜
  const result = await pipeline.applyFilters({
    inputFile: 'input.mp4',
    outputFile: 'output_blur.mp4',
    filterChain: chain,
  })

  console.log(result.success ? '✅ 模糊完成' : '❌ 失败')
}

// ==================== 示例 4: 锐化效果 ====================

/**
 * 示例 4: 应用锐化效果
 */
export async function example4_sharpenEffect() {
  console.log('示例 4: 锐化效果')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建锐化滤镜
  const sharpenFilter = createSharpenFilter({
    amount: 1.5,  // 锐化强度
    radius: 2,    // 半径
  })

  const chain = pipeline.addFilter(createEmptyFilterChain(), sharpenFilter)

  // 应用滤镜
  const result = await pipeline.applyFilters({
    inputFile: 'input.mp4',
    outputFile: 'output_sharpen.mp4',
    filterChain: chain,
  })

  console.log(result.success ? '✅ 锐化完成' : '❌ 失败')
}

// ==================== 示例 5: 组合多个滤镜 ====================

/**
 * 示例 5: 组合多个滤镜
 */
export async function example5_combinedFilters() {
  console.log('示例 5: 组合多个滤镜')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建滤镜链
  let chain = createEmptyFilterChain()

  // 1. 添加颜色校正
  chain = pipeline.addFilter(chain, createColorCorrectionFilter({
    brightness: 0.05,
    contrast: 1.1,
    saturation: 1.15,
  }))

  // 2. 添加锐化
  chain = pipeline.addFilter(chain, createSharpenFilter({
    amount: 0.8,
    radius: 1.5,
  }))

  // 3. 添加轻微模糊（降噪）
  chain = pipeline.addFilter(chain, createBlurFilter({
    strength: 2,
    blurType: 'gaussian',
  }))

  // 应用所有滤镜
  const result = await pipeline.applyFilters({
    inputFile: 'input.mp4',
    outputFile: 'output_combined.mp4',
    filterChain: chain,
    onProgress: (progress) => console.log(`进度: ${progress}%`),
  })

  console.log(result.success ? '✅ 组合滤镜完成' : '❌ 失败')
}

// ==================== 示例 6: 动态调整滤镜参数 ====================

/**
 * 示例 6: 动态调整滤镜参数
 */
export async function example6_dynamicAdjustment() {
  console.log('示例 6: 动态调整滤镜参数')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建滤镜链
  let chain = createEmptyFilterChain()

  // 添加颜色校正
  const colorFilter = createColorCorrectionFilter()
  chain = pipeline.addFilter(chain, colorFilter)

  // 获取滤镜 ID
  const colorFilterId = colorFilter.id

  // 动态调整参数
  chain = pipeline.updateFilter(chain, colorFilterId, {
    brightness: 0.2,
    contrast: 1.3,
  })

  // 再次调整
  chain = pipeline.updateFilter(chain, colorFilterId, {
    saturation: 1.2,
  })

  // 应用滤镜
  const result = await pipeline.applyFilters({
    inputFile: 'input.mp4',
    outputFile: 'output_dynamic.mp4',
    filterChain: chain,
  })

  console.log(result.success ? '✅ 动态调整完成' : '❌ 失败')
}

// ==================== 示例 7: 启用/禁用滤镜 ====================

/**
 * 示例 7: 启用/禁用特定滤镜
 */
export async function example7_toggleFilters() {
  console.log('示例 7: 启用/禁用滤镜')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建多个滤镜
  let chain = createEmptyFilterChain()
  chain = pipeline.addFilter(chain, createColorCorrectionFilter())
  chain = pipeline.addFilter(chain, createBlurFilter({ strength: 10 }))
  chain = pipeline.addFilter(chain, createSharpenFilter({ amount: 1.5 }))

  // 禁用模糊滤镜
  const blurFilter = chain.filters.find((f) => f.type === 'blur')
  if (blurFilter) {
    chain = pipeline.toggleFilter(chain, blurFilter.id, false)
  }

  // 只应用颜色校正和锐化
  const result = await pipeline.applyFilters({
    inputFile: 'input.mp4',
    outputFile: 'output_no_blur.mp4',
    filterChain: chain,
  })

  console.log(result.success ? '✅ 滤镜切换完成' : '❌ 失败')
}

// ==================== 示例 8: 批量处理 ====================

/**
 * 示例 8: 批量应用滤镜到多个视频
 */
export async function example8_batchProcessing() {
  console.log('示例 8: 批量处理')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建滤镜链
  const filterChain = createEmptyFilterChain()
  const colorFilter = createColorCorrectionFilter({
    brightness: 0.1,
    contrast: 1.15,
  })
  const chain = pipeline.addFilter(filterChain, colorFilter)

  // 批量应用
  const files = [
    { input: 'video1.mp4', output: 'output1.mp4' },
    { input: 'video2.mp4', output: 'output2.mp4' },
    { input: 'video3.mp4', output: 'output3.mp4' },
  ]

  const results = await pipeline.batchApplyFilters(
    files,
    chain,
    (file, progress) => console.log(`${file}: ${progress}%`)
  )

  const successCount = results.filter((r) => r.success).length
  console.log(`✅ 批量处理完成: ${successCount}/${files.length}`)
}

// ==================== 示例 9: 验证滤镜链 ====================

/**
 * 示例 9: 验证滤镜参数
 */
export async function example9_validation() {
  console.log('示例 9: 验证滤镜参数')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建带有无效参数的滤镜
  const invalidFilter = createColorCorrectionFilter({
    brightness: 2,    // 超出范围 (-1 到 1)
    contrast: 3,      // 超出范围 (0 到 2)
  })

  const chain = pipeline.addFilter(createEmptyFilterChain(), invalidFilter)

  // 验证
  const validation = pipeline.validateFilterChain(chain)

  if (!validation.valid) {
    console.log('❌ 验证失败:', validation.errors)
    // 修正参数
    const correctedFilter = createColorCorrectionFilter({
      brightness: 0.5,
      contrast: 1.2,
    })
    const correctedChain = pipeline.addFilter(createEmptyFilterChain(), correctedFilter)
    console.log('✅ 已修正参数')
  }
}

// ==================== 示例 10: 克隆和合并滤镜链 ====================

/**
 * 示例 10: 克隆和合并滤镜链
 */
export async function example10_cloneAndMerge() {
  console.log('示例 10: 克隆和合并滤镜链')

  const ffmpegService = new FFmpegService()
  const pipeline = new FilterPipeline(ffmpegService)

  // 创建两个不同的滤镜链
  const chain1 = pipeline.addFilter(createEmptyFilterChain(), createColorCorrectionFilter())
  const chain2 = pipeline.addFilter(createEmptyFilterChain(), createSharpenFilter())

  // 克隆滤镜链
  const clonedChain1 = cloneFilterChain(chain1)

  // 合并两个滤镜链
  const mergedChain = mergeFilterChains(chain1, chain2)

  console.log(`原始滤镜数: ${chain1.filters.length}`)
  console.log(`克隆滤镜数: ${clonedChain1.filters.length}`)
  console.log(`合并后滤镜数: ${mergedChain.filters.length}`)

  // 应用合并后的滤镜
  const result = await pipeline.applyFilters({
    inputFile: 'input.mp4',
    outputFile: 'output_merged.mp4',
    filterChain: mergedChain,
  })

  console.log(result.success ? '✅ 合并滤镜完成' : '❌ 失败')
}

// ==================== 运行所有示例 ====================

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('🚀 开始运行所有滤镜示例\n')

  await example1_basicColorCorrection()
  console.log()

  await example2_colorCorrectionPreset()
  console.log()

  await example3_blurEffect()
  console.log()

  await example4_sharpenEffect()
  console.log()

  await example5_combinedFilters()
  console.log()

  await example6_dynamicAdjustment()
  console.log()

  await example7_toggleFilters()
  console.log()

  await example8_batchProcessing()
  console.log()

  await example9_validation()
  console.log()

  await example10_cloneAndMerge()
  console.log()

  console.log('✨ 所有示例运行完成！')
}
