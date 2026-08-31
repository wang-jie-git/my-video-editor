/**
 * 字幕样式编辑器组件
 *
 * 提供字幕样式的可视化编辑器
 */

import React from 'react'
import type { SubtitleStyle } from '@/services/renderer/subtitles'
import { SUBTITLE_STYLE_PRESETS } from '@/services/renderer/subtitles'
import styles from './subtitle-panel.module.css'

export interface SubtitleStyleEditorProps {
  style: SubtitleStyle
  onChange: (style: SubtitleStyle) => void
}

/**
 * 字幕样式编辑器组件
 */
export function SubtitleStyleEditor({ style, onChange }: SubtitleStyleEditorProps) {
  // 应用预设
  const handleApplyPreset = (presetName: keyof typeof SUBTITLE_STYLE_PRESETS) => {
    const preset = SUBTITLE_STYLE_PRESETS[presetName]
    if (preset) {
      onChange({ ...style, ...preset })
    }
  }

  // 重置样式
  const handleReset = () => {
    onChange({
      font: 'Arial',
      fontSize: 24,
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    })
  }

  // 单个样式属性变更
  const handlePropertyChange = <K extends keyof SubtitleStyle>(
    key: K,
    value: SubtitleStyle[K]
  ) => {
    onChange({ ...style, [key]: value })
  }

  // 阴影属性变更
  const handleShadowChange = <K extends keyof NonNullable<SubtitleStyle['shadow']>>(
    key: K,
    value: SubtitleStyle['shadow'][K]
  ) => {
    onChange({
      ...style,
      shadow: {
        ...style.shadow,
        [key]: value,
      },
    })
  }

  return (
    <div className={styles.styleEditor}>
      <div className={styles.styleEditorHeader}>
        <h4>Style</h4>
        <div className={styles.styleEditorActions}>
          <select
            className={styles.presetSelect}
            onChange={(e) => {
              if (e.target.value) {
                handleApplyPreset(e.target.value as keyof typeof SUBTITLE_STYLE_PRESETS)
                e.target.value = ''
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Apply Preset
            </option>
            {Object.keys(SUBTITLE_STYLE_PRESETS).map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
          <button className={styles.resetButton} onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      <div className={styles.styleEditorContent}>
        {/* 字体 */}
        <div className={styles.styleField}>
          <label className={styles.styleFieldLabel}>Font</label>
          <select
            className={styles.styleSelect}
            value={style.font || 'Arial'}
            onChange={(e) => handlePropertyChange('font', e.target.value)}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
            <option value="Comic Sans MS">Comic Sans MS</option>
            <option value="Impact">Impact</option>
          </select>
        </div>

        {/* 字体大小 */}
        <div className={styles.styleField}>
          <label className={styles.styleFieldLabel}>Font Size</label>
          <div className={styles.sliderWithValue}>
            <input
              type="range"
              className={styles.styleSlider}
              value={style.fontSize || 24}
              onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
              min={12}
              max={72}
            />
            <span className={styles.sliderValue}>{style.fontSize || 24}px</span>
          </div>
        </div>

        {/* 颜色 */}
        <div className={styles.styleFieldRow}>
          <div className={styles.styleField}>
            <label className={styles.styleFieldLabel}>Color</label>
            <div className={styles.colorPickerWrapper}>
              <input
                type="color"
                className={styles.colorPicker}
                value={style.color || '#FFFFFF'}
                onChange={(e) => handlePropertyChange('color', e.target.value)}
              />
              <input
                type="text"
                className={styles.colorInput}
                value={style.color || '#FFFFFF'}
                onChange={(e) => handlePropertyChange('color', e.target.value)}
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          <div className={styles.styleField}>
            <label className={styles.styleFieldLabel}>Background</label>
            <div className={styles.colorPickerWrapper}>
              <input
                type="color"
                className={styles.colorPicker}
                value={
                  typeof style.backgroundColor === 'string'
                    ? style.backgroundColor.replace(/^rgba?\(|\)$/g, '') || '#000000'
                    : '#000000'
                }
                onChange={(e) =>
                  handlePropertyChange('backgroundColor', e.target.value)
                }
              />
              <input
                type="text"
                className={styles.colorInput}
                value={
                  typeof style.backgroundColor === 'string'
                    ? style.backgroundColor
                    : 'rgba(0, 0, 0, 0.5)'
                }
                onChange={(e) =>
                  handlePropertyChange('backgroundColor', e.target.value)
                }
                placeholder="rgba(0, 0, 0, 0.5)"
              />
            </div>
          </div>
        </div>

        {/* 边框 */}
        <div className={styles.styleFieldRow}>
          <div className={styles.styleField}>
            <label className={styles.styleFieldLabel}>Border Color</label>
            <div className={styles.colorPickerWrapper}>
              <input
                type="color"
                className={styles.colorPicker}
                value={
                  style.borderColor?.replace(/^rgba?\(|\)$/g, '') || '#000000'
                }
                onChange={(e) =>
                  handlePropertyChange('borderColor', e.target.value)
                }
              />
              <input
                type="text"
                className={styles.colorInput}
                value={style.borderColor || '#000000'}
                onChange={(e) =>
                  handlePropertyChange('borderColor', e.target.value)
                }
                placeholder="#000000"
              />
            </div>
          </div>

          <div className={styles.styleField}>
            <label className={styles.styleFieldLabel}>Border Width</label>
            <div className={styles.sliderWithValue}>
              <input
                type="range"
                className={styles.styleSlider}
                value={style.borderWidth || 0}
                onChange={(e) =>
                  handlePropertyChange('borderWidth', parseInt(e.target.value))
                }
                min={0}
                max={5}
              />
              <span className={styles.sliderValue}>{style.borderWidth || 0}px</span>
            </div>
          </div>
        </div>

        {/* 加粗和斜体 */}
        <div className={styles.styleFieldRow}>
          <div className={styles.styleField}>
            <label className={styles.styleFieldLabel}>
              <input
                type="checkbox"
                checked={style.bold || false}
                onChange={(e) => handlePropertyChange('bold', e.target.checked)}
              />
              Bold
            </label>
          </div>

          <div className={styles.styleField}>
            <label className={styles.styleFieldLabel}>
              <input
                type="checkbox"
                checked={style.italic || false}
                onChange={(e) => handlePropertyChange('italic', e.target.checked)}
              />
              Italic
            </label>
          </div>
        </div>

        {/* 阴影 */}
        <div className={styles.shadowSection}>
          <label className={styles.styleFieldLabel}>Shadow</label>
          <div className={styles.styleFieldRow}>
            <div className={styles.styleField}>
              <label className={styles.styleFieldLabel}>Color</label>
              <input
                type="color"
                className={styles.colorPicker}
                value={style.shadow?.color || '#000000'}
                onChange={(e) => handleShadowChange('color', e.target.value)}
              />
            </div>

            <div className={styles.styleField}>
              <label className={styles.styleFieldLabel}>Blur</label>
              <div className={styles.sliderWithValue}>
                <input
                  type="range"
                  className={styles.styleSlider}
                  value={style.shadow?.blur || 0}
                  onChange={(e) => handleShadowChange('blur', parseInt(e.target.value))}
                  min={0}
                  max={10}
                />
                <span className={styles.sliderValue}>{style.shadow?.blur || 0}px</span>
              </div>
            </div>

            <div className={styles.styleField}>
              <label className={styles.styleFieldLabel}>Offset X</label>
              <div className={styles.sliderWithValue}>
                <input
                  type="range"
                  className={styles.styleSlider}
                  value={style.shadow?.x || 0}
                  onChange={(e) => handleShadowChange('x', parseInt(e.target.value))}
                  min={-10}
                  max={10}
                />
                <span className={styles.sliderValue}>{style.shadow?.x || 0}px</span>
              </div>
            </div>

            <div className={styles.styleField}>
              <label className={styles.styleFieldLabel}>Offset Y</label>
              <div className={styles.sliderWithValue}>
                <input
                  type="range"
                  className={styles.styleSlider}
                  value={style.shadow?.y || 0}
                  onChange={(e) => handleShadowChange('y', parseInt(e.target.value))}
                  min={-10}
                  max={10}
                />
                <span className={styles.sliderValue}>{style.shadow?.y || 0}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
