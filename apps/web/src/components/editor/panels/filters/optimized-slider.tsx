/**
 * 优化的滑块控件
 *
 * 提供更好的用户体验和预设支持
 */

import { useState, useCallback, useEffect } from 'react'

interface PresetButton {
  value: number
  label: string
}

interface OptimizedSliderProps {
  /** 标签 */
  label: string
  /** 当前值 */
  value: number
  /** 最小值 */
  min: number
  /** 最大值 */
  max: number
  /** 步长 */
  step: number
  /** 值变化回调 */
  onChange: (value: number) => void
  /** 预设按钮 */
  presets?: PresetButton[]
  /** 是否显示重置按钮 */
  showReset?: boolean
  /** 重置值 */
  resetValue?: number
  /** 格式化显示 */
  formatValue?: (value: number) => string
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * 优化的滑块控件
 *
 * 特性：
 * - 实时数值显示
 * - 预设按钮
 * - 重置按钮
 * - 键盘支持
 * - 触摸优化
 */
export function OptimizedSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  presets = [],
  showReset = false,
  resetValue = min,
  formatValue = (v) => v.toFixed(2),
  disabled = false,
}: OptimizedSliderProps) {
  const [isDragging, setIsDragging] = useState(false)

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      let newValue = value

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault()
          newValue = Math.min(value + step, max)
          break
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault()
          newValue = Math.max(value - step, min)
          break
        case 'Home':
          e.preventDefault()
          newValue = min
          break
        case 'End':
          e.preventDefault()
          newValue = max
          break
        default:
          return
      }

      onChange(newValue)
    },
    [value, min, max, step, onChange]
  )

  // 处理预设按钮点击
  const handlePresetClick = useCallback(
    (presetValue: number) => {
      onChange(presetValue)
    },
    [onChange]
  )

  // 处理重置
  const handleReset = useCallback(() => {
    onChange(resetValue)
  }, [resetValue, onChange])

  // 计算百分比
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={`optimized-slider ${disabled ? 'optimized-slider--disabled' : ''}`}>
      <div className="optimized-slider__header">
        <label className="optimized-slider__label">{label}</label>
        <div className="optimized-slider__value-group">
          <span className="optimized-slider__value">{formatValue(value)}</span>
          {showReset && value !== resetValue && (
            <button
              type="button"
              className="optimized-slider__reset-btn"
              onClick={handleReset}
              disabled={disabled}
              title="重置"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      <div className="optimized-slider__track-container">
        <div
          className="optimized-slider__track-fill"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          className="optimized-slider__input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onKeyDown={handleKeyDown}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
        />
      </div>

      {presets.length > 0 && (
        <div className="optimized-slider__presets">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`optimized-slider__preset-btn ${
                value === preset.value ? 'optimized-slider__preset-btn--active' : ''
              }`}
              onClick={() => handlePresetClick(preset.value)}
              disabled={disabled}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 数字输入组件
 *
 * 用于精确数值输入
 */
interface NumberInputProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function NumberInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value.toString())

  // 同步外部 value 到 input
  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
  }

  // 处理失焦
  const handleBlur = () => {
    const numValue = parseFloat(inputValue)

    if (isNaN(numValue)) {
      setInputValue(value.toString())
      return
    }

    // 限制范围
    const clampedValue = Math.min(Math.max(numValue, min), max)
    setInputValue(clampedValue.toString())
    onChange(clampedValue)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur()
    }
  }

  return (
    <div className={`number-input ${disabled ? 'number-input--disabled' : ''}`}>
      <label className="number-input__label">{label}</label>
      <input
        type="number"
        className="number-input__field"
        value={inputValue}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
    </div>
  )
}
