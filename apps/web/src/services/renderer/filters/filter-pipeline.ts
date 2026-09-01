/**
 * FilterPipeline - 滤镜管线
 *
 * 管理多个滤镜的链式应用
 */

import { FFmpegService } from '../ffmpeg/ffmpeg-service'
import type {
  FilterChain,
  FilterApplyOptions,
  FilterApplyResult,
  VideoFilter,
  ColorCorrectionFilter,
  BlurFilter,
  SharpenFilter,
  LutFilter,
} from './filter-types'

/**
 * FilterPipeline 类
 *
 * 提供滤镜链的构建、验证和应用功能
 */
export class FilterPipeline {
  private ffmpegService: FFmpegService

  constructor(ffmpegService: FFmpegService) {
    this.ffmpegService = ffmpegService
  }

  /**
   * 创建滤镜链
   */
  createFilterChain(filters: VideoFilter[] = []): FilterChain {
    return {
      filters,
      enabled: true,
    }
  }

  /**
   * 添加滤镜到滤镜链
   */
  addFilter(chain: FilterChain, filter: VideoFilter): FilterChain {
    return {
      ...chain,
      filters: [...chain.filters, filter],
    }
  }

  /**
   * 从滤镜链移除滤镜
   */
  removeFilter(chain: FilterChain, filterId: string): FilterChain {
    return {
      ...chain,
      filters: chain.filters.filter((f) => f.id !== filterId),
    }
  }

  /**
   * 更新滤镜
   */
  updateFilter(chain: FilterChain, filterId: string, updates: Partial<VideoFilter>): FilterChain {
    return {
      ...chain,
      filters: chain.filters.map((f) =>
        f.id === filterId ? { ...f, ...updates } as VideoFilter : f
      ),
    }
  }

  /**
   * 启用/禁用滤镜
   */
  toggleFilter(chain: FilterChain, filterId: string, enabled: boolean): FilterChain {
    return this.updateFilter(chain, filterId, { enabled })
  }

  /**
   * 启用/禁用整个滤镜链
   */
  toggleChain(chain: FilterChain, enabled: boolean): FilterChain {
    return { ...chain, enabled }
  }

  /**
   * 清空滤镜链
   */
  clearChain(chain: FilterChain): FilterChain {
    return {
      ...chain,
      filters: [],
    }
  }

  /**
   * 构建 FFmpeg 滤镜图
   *
   * 将滤镜链转换为 FFmpeg 滤镜图字符串
   */
  buildFilterGraph(chain: FilterChain): string {
    if (!chain.enabled || chain.filters.length === 0) {
      return ''
    }

    // 收集启用的滤镜
    const enabledFilters = chain.filters.filter((f) => f.enabled)

    if (enabledFilters.length === 0) {
      return ''
    }

    // 构建滤镜字符串
    const filterStrings = enabledFilters.map((filter) => this.buildFilterString(filter))

    // 用逗号连接滤镜
    return filterStrings.join(',')
  }

  /**
   * 构建单个滤镜的 FFmpeg 参数
   */
  private buildFilterString(filter: VideoFilter): string {
    switch (filter.type) {
      case 'color-correction':
        return this.buildColorCorrectionString(filter)
      case 'blur':
        return this.buildBlurString(filter)
      case 'sharpen':
        return this.buildSharpenString(filter)
      case 'lut':
        return this.buildLutString(filter)
      default:
        console.warn(`[FilterPipeline] 未知滤镜类型:`, (filter as any).type)
        return ''
    }
  }

  /**
   * 构建颜色校正滤镜字符串
   */
  private buildColorCorrectionString(filter: ColorCorrectionFilter): string {
    const parts: string[] = []

    // 亮度
    if (filter.brightness !== 0) {
      parts.push(`brightness=${filter.brightness}`)
    }

    // 对比度
    if (filter.contrast !== 1) {
      parts.push(`contrast=${filter.contrast}`)
    }

    // 饱和度
    if (filter.saturation !== 1) {
      parts.push(`saturation=${filter.saturation}`)
    }

    // 色相
    if (filter.hue !== 0) {
      parts.push(`hue=${filter.hue}`)
    }

    if (parts.length === 0) {
      return ''
    }

    return `eq=${parts.join(':')}`
  }

  /**
   * 构建模糊滤镜字符串
   */
  private buildBlurString(filter: BlurFilter): string {
    if (filter.strength === 0) {
      return ''
    }

    switch (filter.blurType) {
      case 'gaussian':
        return `gaussian=sigma=${filter.strength}`
      case 'box':
        return `boxblur=${filter.strength}:${filter.strength}`
      case 'motion':
        return `tblend=all_mode=average`
      default:
        return `gaussian=sigma=${filter.strength}`
    }
  }

  /**
   * 构建锐化滤镜字符串
   */
  private buildSharpenString(filter: SharpenFilter): string {
    if (filter.amount === 0) {
      return ''
    }

    return `unsharp=${filter.radius}:${filter.radius}:${filter.amount}`
  }

  /**
   * 构建 LUT 滤镜字符串
   */
  private buildLutString(filter: LutFilter): string {
    if (!filter.lutFile && !filter.lutData) {
      return ''
    }

    const intensity = filter.intensity !== 1 ? `:interp=${filter.intensity}` : ''

    if (filter.lutFile) {
      return `lut3d=${filter.lutFile}${intensity}`
    } else if (filter.lutData) {
      // LUT 数据需要先写入文件
      // TODO: 实现 LUT 数据写入
      console.warn('[FilterPipeline] LUT 数据暂未实现')
      return ''
    }

    return ''
  }

  /**
   * 应用滤镜链
   */
  async applyFilters(options: FilterApplyOptions): Promise<FilterApplyResult> {
    const { inputFile, outputFile, filterChain, onProgress } = options

    try {
      // 1. 构建滤镜图
      const filterGraph = this.buildFilterGraph(filterChain)

      if (!filterGraph) {
        // 没有滤镜，直接复制
        await this.ffmpegService.exec([
          '-i', inputFile,
          '-c:v', 'copy',
          '-y', outputFile,
        ], { onProgress: onProgress ? (p) => onProgress(p.progress) : undefined })
      } else {
        // 应用滤镜
        await this.ffmpegService.exec([
          '-i', inputFile,
          '-vf', filterGraph,
          '-c:v', 'libx264',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-y', outputFile,
        ], { onProgress: onProgress ? (p) => onProgress(p.progress) : undefined })
      }

      // 2. 读取输出文件
      const data = await this.ffmpegService.readFile(outputFile)

      return {
        success: true,
        outputFile,
        size: data.length,
      }
    } catch (error) {
      console.error('[FilterPipeline] 应用滤镜失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '应用滤镜失败',
      }
    }
  }

  /**
   * 批量应用滤镜链
   */
  async batchApplyFilters(
    files: Array<{ input: string; output: string }>,
    filterChain: FilterChain,
    onProgress?: (file: string, progress: number) => void
  ): Promise<FilterApplyResult[]> {
    const results: FilterApplyResult[] = []

    for (let i = 0; i < files.length; i++) {
      const { input, output } = files[i]

      console.log(`[FilterPipeline] 批量应用滤镜 [${i + 1}/${files.length}]: ${input}`)

      const result = await this.applyFilters({
        inputFile: input,
        outputFile: output,
        filterChain,
        onProgress: (progress) => onProgress?.(input, progress),
      })

      results.push(result)

      // 失败继续下一个
      if (!result.success) {
        console.warn(`[FilterPipeline] 应用滤镜失败，跳过: ${input}`)
      }
    }

    return results
  }

  /**
   * 验证滤镜链
   */
  validateFilterChain(chain: FilterChain): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!chain) {
      return { valid: false, errors: ['滤镜链为空'] }
    }

    // 验证每个滤镜
    for (const filter of chain.filters) {
      switch (filter.type) {
        case 'color-correction':
          this.validateColorCorrection(filter, errors)
          break
        case 'blur':
          this.validateBlur(filter, errors)
          break
        case 'sharpen':
          this.validateSharpen(filter, errors)
          break
        case 'lut':
          this.validateLut(filter, errors)
          break
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 验证颜色校正滤镜
   */
  private validateColorCorrection(filter: ColorCorrectionFilter, errors: string[]) {
    if (filter.brightness < -1 || filter.brightness > 1) {
      errors.push(`亮度超出范围: ${filter.brightness}（-1 到 1）`)
    }

    if (filter.contrast < 0 || filter.contrast > 2) {
      errors.push(`对比度超出范围: ${filter.contrast}（0 到 2）`)
    }

    if (filter.saturation < 0 || filter.saturation > 2) {
      errors.push(`饱和度超出范围: ${filter.saturation}（0 到 2）`)
    }

    if (filter.hue < -180 || filter.hue > 180) {
      errors.push(`色相超出范围: ${filter.hue}（-180 到 180）`)
    }
  }

  /**
   * 验证模糊滤镜
   */
  private validateBlur(filter: BlurFilter, errors: string[]) {
    if (filter.strength < 0 || filter.strength > 20) {
      errors.push(`模糊强度超出范围: ${filter.strength}（0 到 20）`)
    }
  }

  /**
   * 验证锐化滤镜
   */
  private validateSharpen(filter: SharpenFilter, errors: string[]) {
    if (filter.amount < 0 || filter.amount > 2) {
      errors.push(`锐化强度超出范围: ${filter.amount}（0 到 2）`)
    }

    if (filter.radius < 1 || filter.radius > 5) {
      errors.push(`半径超出范围: ${filter.radius}（1 到 5）`)
    }
  }

  /**
   * 验证 LUT 滤镜
   */
  private validateLut(filter: LutFilter, errors: string[]) {
    if (filter.intensity < 0 || filter.intensity > 1) {
      errors.push(`LUT 强度超出范围: ${filter.intensity}（0 到 1）`)
    }

    if (!filter.lutFile && !filter.lutData) {
      errors.push('LUT 文件或数据必须指定')
    }
  }

  /**
   * 克隆滤镜链
   */
  cloneChain(chain: FilterChain): FilterChain {
    return {
      ...chain,
      filters: chain.filters.map((f) => ({ ...f })),
    }
  }
}
