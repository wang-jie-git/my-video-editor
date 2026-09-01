/**
 * FilterPanel - 滤镜控制面板
 *
 * 提供完整的滤镜编辑界面
 */

import { useState, useCallback } from 'react'
import { FilterPipeline } from '@/services/renderer/filters/filter-pipeline'
import { ColorCorrection } from '@/services/renderer/filters/color-correction'
import { Blur } from '@/services/renderer/filters/blur'
import { Sharpen } from '@/services/renderer/filters/sharpen'
import { LutFilterImpl } from '@/services/renderer/filters/lut'
import {
  createEmptyFilterChain,
  type FilterChain,
  type VideoFilter,
  type ColorCorrectionFilter,
  type BlurFilter,
  type SharpenFilter,
  type LutFilter,
} from '@/services/renderer/filters'
import filterPanelStyles from './filter-panel.module.css'

interface FilterPanelProps {
  /** 初始滤镜链 */
  initialChain?: FilterChain
  /** 滤镜链变化回调 */
  onChainChange?: (chain: FilterChain) => void
  /** 应用滤镜回调 */
  onApply?: (chain: FilterChain) => void
}

/**
 * FilterPanel 组件
 *
 * 提供滤镜管理、参数调整、预设选择等功能
 */
export function FilterPanel({ initialChain, onChainChange, onApply }: FilterPanelProps) {
  const [chain, setChain] = useState<FilterChain>(
    initialChain || createEmptyFilterChain()
  )
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 获取当前激活的滤镜
  const activeFilter = chain.filters.find((f) => f.id === activeFilterId)

  // 更新滤镜链并通知
  const updateChain = useCallback(
    (newChain: FilterChain) => {
      setChain(newChain)
      onChainChange?.(newChain)
    },
    [onChainChange]
  )

  // 添加滤镜
  const handleAddFilter = useCallback(
    (filter: VideoFilter) => {
      const pipeline = new FilterPipeline(null as any)
      const newChain = pipeline.addFilter(chain, filter)
      updateChain(newChain)
      setActiveFilterId(filter.id)
      setError(null)
    },
    [chain, updateChain]
  )

  // 移除滤镜
  const handleRemoveFilter = useCallback(
    (filterId: string) => {
      const pipeline = new FilterPipeline(null as any)
      const newChain = pipeline.removeFilter(chain, filterId)
      updateChain(newChain)

      if (activeFilterId === filterId) {
        setActiveFilterId(null)
      }
    },
    [chain, activeFilterId, updateChain]
  )

  // 更新滤镜参数
  const handleUpdateFilter = useCallback(
    (filterId: string, updates: Partial<VideoFilter>) => {
      const pipeline = new FilterPipeline(null as any)
      const newChain = pipeline.updateFilter(chain, filterId, updates)

      // 验证
      const validation = pipeline.validateFilterChain(newChain)
      if (!validation.valid) {
        setError(validation.errors[0])
        return
      }

      setError(null)
      updateChain(newChain)
    },
    [chain, updateChain]
  )

  // 切换滤镜启用状态
  const handleToggleFilter = useCallback(
    (filterId: string, enabled: boolean) => {
      const pipeline = new FilterPipeline(null as any)
      const newChain = pipeline.toggleFilter(chain, filterId, enabled)
      updateChain(newChain)
    },
    [chain, updateChain]
  )

  // 应用预设
  const handleApplyPreset = useCallback(
    (presetName: string, filterType: VideoFilter['type']) => {
      let newFilter: VideoFilter | null = null

      switch (filterType) {
        case 'color-correction': {
          const cc = new ColorCorrection(activeFilter as ColorCorrectionFilter)
          newFilter = cc.applyPreset(presetName as any)
          break
        }
        case 'blur': {
          const blur = new Blur(activeFilter as BlurFilter)
          newFilter = blur.applyPreset(presetName as any)
          break
        }
        case 'sharpen': {
          const sharpen = new Sharpen(activeFilter as SharpenFilter)
          newFilter = sharpen.applyPreset(presetName as any)
          break
        }
        case 'lut': {
          const lut = new LutFilterImpl(activeFilter as LutFilter)
          newFilter = lut.applyPreset(presetName as any)
          break
        }
      }

      if (newFilter && activeFilterId) {
        handleUpdateFilter(activeFilterId, newFilter)
      }
    },
    [activeFilter, activeFilterId, handleUpdateFilter]
  )

  // 重置滤镜
  const handleResetFilter = useCallback(
    (filterId: string) => {
      const filter = chain.filters.find((f) => f.id === filterId)
      if (!filter) return

      let resetFilter: VideoFilter | null = null

      switch (filter.type) {
        case 'color-correction': {
          const cc = new ColorCorrection(filter as ColorCorrectionFilter)
          resetFilter = cc.reset()
          break
        }
        case 'blur': {
          const blur = new Blur(filter as BlurFilter)
          resetFilter = blur.reset()
          break
        }
        case 'sharpen': {
          const sharpen = new Sharpen(filter as SharpenFilter)
          resetFilter = sharpen.reset()
          break
        }
        case 'lut': {
          const lut = new LutFilterImpl(filter as LutFilter)
          resetFilter = lut.reset()
          break
        }
      }

      if (resetFilter) {
        handleUpdateFilter(filterId, resetFilter)
      }
    },
    [chain.filters, handleUpdateFilter]
  )

  // 应用所有滤镜
  const handleApply = useCallback(() => {
    onApply?.(chain)
  }, [chain, onApply])

  return (
    <div className={filterPanelStyles.filterPanel}>
      <div className={filterPanelStyles.header}>
        <h2 className={filterPanelStyles.title}>滤镜</h2>
        <button
          type="button"
          className={filterPanelStyles.applyBtn}
          onClick={handleApply}
          disabled={!hasEnabledFilters(chain)}
        >
          应用滤镜
        </button>
      </div>

      {error && <div className={filterPanelStyles.error}>{error}</div>}

      {/* 滤镜列表 */}
      <div className={filterPanelStyles.list}>
        <FilterList
          filters={chain.filters}
          activeFilterId={activeFilterId}
          onSelect={setActiveFilterId}
          onRemove={handleRemoveFilter}
          onToggle={handleToggleFilter}
        />

        {/* 添加滤镜按钮 */}
        <AddFilterButtons onAdd={handleAddFilter} />
      </div>

      {/* 滤镜参数编辑器 */}
      {activeFilter && (
        <div className={filterPanelStyles.editor}>
          <FilterEditor
            filter={activeFilter}
            onUpdate={(updates) => handleUpdateFilter(activeFilter.id, updates)}
            onApplyPreset={(preset) => handleApplyPreset(preset, activeFilter.type)}
            onReset={() => handleResetFilter(activeFilter.id)}
          />
        </div>
      )}
    </div>
  )
}

interface FilterListProps {
  filters: VideoFilter[]
  activeFilterId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}

function FilterList({ filters, activeFilterId, onSelect, onRemove, onToggle }: FilterListProps) {
  if (filters.length === 0) {
    return (
      <div className={filterPanelStyles.empty}>
        <p>暂无滤镜</p>
        <p className={filterPanelStyles.hint}>点击下方按钮添加滤镜</p>
      </div>
    )
  }

  return (
    <div className={filterPanelStyles.filterList}>
      {filters.map((filter) => (
        <div
          key={filter.id}
          className={`${filterPanelStyles.filterItem} ${activeFilterId === filter.id ? filterPanelStyles.filterItemActive : ''}`}
          onClick={() => onSelect(filter.id)}
        >
          <div className={filterPanelStyles.itemHeader}>
            <label className={filterPanelStyles.toggle}>
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={(e) => {
                  e.stopPropagation()
                  onToggle(filter.id, e.target.checked)
                }}
              />
              <span className={filterPanelStyles.name}>{filter.name}</span>
            </label>
            <button
              type="button"
              className={filterPanelStyles.removeBtn}
              onClick={(e) => {
                e.stopPropagation()
                onRemove(filter.id)
              }}
            >
              ✕
            </button>
          </div>
          <div className={filterPanelStyles.itemDesc}>{filter.description}</div>
        </div>
      ))}
    </div>
  )
}

interface AddFilterButtonsProps {
  onAdd: (filter: VideoFilter) => void
}

function AddFilterButtons({ onAdd }: AddFilterButtonsProps) {
  return (
    <div className={filterPanelStyles.addButtons}>
      <p className={filterPanelStyles.addButtonsLabel}>添加滤镜</p>
      <div className={filterPanelStyles.addButtonsGrid}>
        <button
          type="button"
          className={filterPanelStyles.addButton}
          onClick={() =>
            onAdd({
              id: `color-correction-${Date.now()}`,
              name: '颜色校正',
              description: '调整亮度、对比度、饱和度和色相',
              type: 'color-correction',
              enabled: true,
              brightness: 0,
              contrast: 1,
              saturation: 1,
              hue: 0,
            })
          }
        >
          🎨 颜色校正
        </button>
        <button
          type="button"
          className={filterPanelStyles.addButton}
          onClick={() =>
            onAdd({
              id: `blur-${Date.now()}`,
              name: '模糊',
              description: '应用模糊效果',
              type: 'blur',
              enabled: true,
              strength: 5,
              blurType: 'gaussian',
            })
          }
        >
          🌫️ 模糊
        </button>
        <button
          type="button"
          className={filterPanelStyles.addButton}
          onClick={() =>
            onAdd({
              id: `sharpen-${Date.now()}`,
              name: '锐化',
              description: '增强图像清晰度',
              type: 'sharpen',
              enabled: true,
              amount: 1,
              radius: 1,
            })
          }
        >
          ✨ 锐化
        </button>
        <button
          type="button"
          className={filterPanelStyles.addButton}
          onClick={() =>
            onAdd({
              id: `lut-${Date.now()}`,
              name: 'LUT',
              description: '应用 3D LUT 色彩映射',
              type: 'lut',
              enabled: true,
              intensity: 1,
            })
          }
        >
          🎬 LUT
        </button>
      </div>
    </div>
  )
}

interface FilterEditorProps {
  filter: VideoFilter
  onUpdate: (updates: Partial<VideoFilter>) => void
  onApplyPreset: (preset: string) => void
  onReset: () => void
}

function FilterEditor({ filter, onUpdate, onApplyPreset, onReset }: FilterEditorProps) {
  return (
    <div className={filterPanelStyles.editor}>
      <div className={filterPanelStyles.editorHeader}>
        <h3 className={filterPanelStyles.editorTitle}>{filter.name}</h3>
        <button
          type="button"
          className={filterPanelStyles.resetBtn}
          onClick={onReset}
        >
          重置
        </button>
      </div>

      {/* 预设选择 */}
      <FilterPresets type={filter.type} onApply={onApplyPreset} />

      {/* 参数编辑器 */}
      {filter.type === 'color-correction' && (
        <ColorCorrectionControls
          filter={filter as ColorCorrectionFilter}
          onChange={onUpdate}
        />
      )}
      {filter.type === 'blur' && (
        <BlurControls
          filter={filter as BlurFilter}
          onChange={onUpdate}
        />
      )}
      {filter.type === 'sharpen' && (
        <SharpenControls
          filter={filter as SharpenFilter}
          onChange={onUpdate}
        />
      )}
      {filter.type === 'lut' && (
        <LutControls
          filter={filter as LutFilter}
          onChange={onUpdate}
        />
      )}
    </div>
  )
}

interface FilterPresetsProps {
  type: VideoFilter['type']
  onApply: (preset: string) => void
}

function FilterPresets({ type, onApply }: FilterPresetsProps) {
  let presets: Record<string, string> = {}

  switch (type) {
    case 'color-correction':
      presets = {
        default: '默认',
        vivid: '鲜艳',
        muted: '柔和',
        warm: '暖色',
        cool: '冷色',
        vintage: '复古',
        dramatic: '戏剧',
      }
      break
    case 'blur':
      presets = {
        none: '无',
        light: '轻微',
        medium: '中等',
        strong: '强烈',
        box: '方框',
      }
      break
    case 'sharpen':
      presets = {
        none: '无',
        light: '轻微',
        medium: '中等',
        strong: '强烈',
      }
      break
    case 'lut':
      presets = {
        none: '无',
        light: '轻微',
        medium: '中等',
        full: '完全',
      }
      break
  }

  return (
    <div className={filterPanelStyles.presets}>
      <label className={filterPanelStyles.presetsLabel}>预设</label>
      <div className={filterPanelStyles.presetsButtons}>
        {Object.entries(presets).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={filterPanelStyles.presetButton}
            onClick={() => onApply(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ColorCorrectionControlsProps {
  filter: ColorCorrectionFilter
  onChange: (updates: Partial<ColorCorrectionFilter>) => void
}

function ColorCorrectionControls({ filter, onChange }: ColorCorrectionControlsProps) {
  return (
    <div className={filterPanelStyles.controls}>
      <SliderControl
        label="亮度"
        value={filter.brightness}
        min={-1}
        max={1}
        step={0.05}
        onChange={(brightness) => onChange({ brightness })}
      />
      <SliderControl
        label="对比度"
        value={filter.contrast}
        min={0}
        max={2}
        step={0.05}
        onChange={(contrast) => onChange({ contrast })}
      />
      <SliderControl
        label="饱和度"
        value={filter.saturation}
        min={0}
        max={2}
        step={0.05}
        onChange={(saturation) => onChange({ saturation })}
      />
      <SliderControl
        label="色相"
        value={filter.hue}
        min={-180}
        max={180}
        step={5}
        onChange={(hue) => onChange({ hue })}
      />
    </div>
  )
}

interface BlurControlsProps {
  filter: BlurFilter
  onChange: (updates: Partial<BlurFilter>) => void
}

function BlurControls({ filter, onChange }: BlurControlsProps) {
  return (
    <div className={filterPanelStyles.controls}>
      <SliderControl
        label="强度"
        value={filter.strength}
        min={0}
        max={20}
        step={1}
        onChange={(strength) => onChange({ strength })}
      />
      <div className={filterPanelStyles.control}>
        <label className={filterPanelStyles.controlLabel}>模糊类型</label>
        <select
          className={filterPanelStyles.select}
          value={filter.blurType}
          onChange={(e) => onChange({ blurType: e.target.value as BlurFilter['blurType'] })}
        >
          <option value="gaussian">高斯模糊</option>
          <option value="box">方框模糊</option>
          <option value="motion">运动模糊</option>
        </select>
      </div>
    </div>
  )
}

interface SharpenControlsProps {
  filter: SharpenFilter
  onChange: (updates: Partial<SharpenFilter>) => void
}

function SharpenControls({ filter, onChange }: SharpenControlsProps) {
  return (
    <div className={filterPanelStyles.controls}>
      <SliderControl
        label="强度"
        value={filter.amount}
        min={0}
        max={2}
        step={0.05}
        onChange={(amount) => onChange({ amount })}
      />
      <SliderControl
        label="半径"
        value={filter.radius}
        min={1}
        max={5}
        step={0.5}
        onChange={(radius) => onChange({ radius })}
      />
    </div>
  )
}

interface LutControlsProps {
  filter: LutFilter
  onChange: (updates: Partial<LutFilter>) => void
}

function LutControls({ filter, onChange }: LutControlsProps) {
  return (
    <div className={filterPanelStyles.controls}>
      <SliderControl
        label="强度"
        value={filter.intensity}
        min={0}
        max={1}
        step={0.05}
        onChange={(intensity) => onChange({ intensity })}
      />
      <div className={filterPanelStyles.control}>
        <label className={filterPanelStyles.controlLabel}>LUT 文件</label>
        <input
          type="file"
          className={filterPanelStyles.fileInput}
          accept=".cube"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) {
              // TODO: 读取文件并转换为 base64
              console.log('LUT 文件:', file.name)
            }
          }}
        />
      </div>
    </div>
  )
}

interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

function SliderControl({ label, value, min, max, step, onChange }: SliderControlProps) {
  return (
    <div className={filterPanelStyles.control}>
      <div className={filterPanelStyles.controlHeader}>
        <label className={filterPanelStyles.controlLabel}>{label}</label>
        <span className={filterPanelStyles.controlValue}>{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        className={filterPanelStyles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

// 辅助函数
function hasEnabledFilters(chain: FilterChain): boolean {
  return chain.filters.some((f) => f.enabled)
}
