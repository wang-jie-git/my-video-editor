/**
 * FilterPresetGallery - 滤镜预设画廊
 *
 * 以卡片形式展示滤镜预设
 */

import { useState } from 'react'
import type { FilterChain } from '../../../../services/renderer/filters/filter-types'
import styles from './filter-preset-gallery.module.css'

interface FilterPreset {
  id: string
  name: string
  description: string
  chain: FilterChain
  thumbnail?: string
  category: 'color' | 'effect' | 'artistic' | 'custom'
}

interface FilterPresetGalleryProps {
  /** 预设列表 */
  presets: FilterPreset[]
  /** 预设选择回调 */
  onSelect: (preset: FilterPreset) => void
  /** 当前选中的预设 ID */
  selectedId?: string
}

/**
 * FilterPresetGallery 组件
 *
 * 以卡片网格形式展示滤镜预设
 */
export function FilterPresetGallery({
  presets,
  onSelect,
  selectedId,
}: FilterPresetGalleryProps) {
  const [category, setCategory] = useState<FilterPreset['category'] | 'all'>('all')

  // 过滤预设
  const filteredPresets =
    category === 'all'
      ? presets
      : presets.filter((p) => p.category === category)

  // 分类标签
  const categories = [
    { key: 'all', label: '全部' },
    { key: 'color', label: '调色' },
    { key: 'effect', label: '特效' },
    { key: 'artistic', label: '艺术' },
    { key: 'custom', label: '自定义' },
  ] as const

  return (
    <div className={styles.gallery}>
      {/* 分类筛选 */}
      <div className={styles.categories}>
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            className={`${styles.categoryBtn} ${
              category === cat.key ? styles.categoryBtnActive : ''
            }`}
            onClick={() => setCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 预设网格 */}
      <div className={styles.grid}>
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            className={`${styles.card} ${
              selectedId === preset.id ? styles.cardSelected : ''
            }`}
            onClick={() => onSelect(preset)}
          >
            {/* 缩略图 */}
            <div className={styles.thumbnail}>
              {preset.thumbnail ? (
                <img src={preset.thumbnail} alt={preset.name} />
              ) : (
                <div className={styles.thumbnailPlaceholder}>
                  <span>🎬</span>
                </div>
              )}
            </div>

            {/* 信息 */}
            <div className={styles.info}>
              <h4 className={styles.name}>{preset.name}</h4>
              <p className={styles.description}>{preset.description}</p>
            </div>

            {/* 滤镜数量标签 */}
            <div className={styles.badge}>
              {preset.chain.filters.length} 个滤镜
            </div>
          </div>
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <div className={styles.empty}>
          <p>暂无预设</p>
        </div>
      )}
    </div>
  )
}

/**
 * 预设缩略图生成器
 *
 * 从滤镜链生成预览缩略图
 */
export class PresetThumbnailGenerator {
  /**
   * 生成渐变背景作为缩略图
   */
  static generateGradient(chain: FilterChain): string {
    // 根据滤镜链参数生成渐变颜色
    const colorFilter = chain.filters.find((f) => f.type === 'color-correction')

    if (!colorFilter || colorFilter.type !== 'color-correction') {
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }

    const { brightness, contrast, saturation, hue } = colorFilter

    // 根据参数调整颜色
    const lightness = 50 + brightness * 10
    const saturate = 100 + saturation * 50
    const rotate = hue

    return `linear-gradient(
      135deg,
      hsl(${rotate}, ${saturate}%, ${lightness}%) 0%,
      hsl(${(rotate + 60) % 360}, ${saturate}%, ${lightness - 10}%) 100%
    )`
  }

  /**
   * 生成 SVG 缩略图
   */
  static generateSVG(chain: FilterChain, width: number = 160, height: number = 90): string {
    const gradient = this.generateGradient(chain)

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:hsl(250, 70%, 60%);stop-opacity:1" />
            <stop offset="100%" style="stop-color:hsl(280, 70%, 50%);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dominant-baseline="middle">
          ${chain.filters.length} 滤镜
        </text>
      </svg>
    `

    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  /**
   * 生成 Canvas 缩略图
   */
  static async generateCanvas(
    chain: FilterChain,
    width: number = 320,
    height: number = 180
  ): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!

      // 绘制渐变背景
      const gradient = ctx.createLinearGradient(0, 0, width, height)

      const colorFilter = chain.filters.find((f) => f.type === 'color-correction')

      if (colorFilter && colorFilter.type === 'color-correction') {
        const { brightness, saturation, hue } = colorFilter
        const lightness = 50 + brightness * 10
        const saturate = 50 + saturation * 50

        gradient.addColorStop(0, `hsl(${hue}, ${saturate}%, ${lightness}%)`)
        gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, ${saturate}%, ${lightness - 10}%)`)
      } else {
        gradient.addColorStop(0, '#667eea')
        gradient.addColorStop(1, '#764ba2')
      }

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // 绘制滤镜数量
      ctx.fillStyle = 'white'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${chain.filters.length} 滤镜`, width / 2, height / 2)

      // 转换为 Data URL
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    })
  }
}
