/**
 * FormatConverterPanel - 格式转换面板
 *
 * 提供视频格式转换的 UI 界面
 */

import { useTranslation } from '@i18next-toolkit/nextjs-approuter'
import { useState, useCallback } from 'react'
import { FormatDetector } from './format-detector'
import { ConversionProgress } from './conversion-progress'
import type { FormatConvertUIOptions, FormatConvertProgress } from './types'

interface FormatConverterPanelProps {
  /** 转换完成回调 */
  onConvertComplete?: (result: { success: boolean; outputUrl?: string }) => void
}

/**
 * FormatConverterPanel 组件
 */
export function FormatConverterPanel({
  onConvertComplete,
}: FormatConverterPanelProps) {
  const { t } = useTranslation()

  // 状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'webm'>('mp4')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'very_high'>('high')
  const [includeAudio, setIncludeAudio] = useState(true)
  const [progress, setProgress] = useState<FormatConvertProgress>({
    file: '',
    progress: 0,
    status: 'idle',
  })
  const [outputUrl, setOutputUrl] = useState<string>('')

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setFileName(file.name)
      setProgress({
        file: file.name,
        progress: 0,
        status: 'idle',
      })
      setOutputUrl('')
    }
  }, [])

  // 处理格式检测
  const handleDetect = useCallback((format: string, isVideo: boolean, supported: boolean) => {
    console.log('[FormatConverter] 格式检测:', { format, isVideo, supported })
  }, [])

  // 处理转换
  const handleConvert = useCallback(async () => {
    if (!selectedFile) {
      return
    }

    try {
      // 更新状态：检测中
      setProgress({
        file: fileName,
        progress: 0,
        status: 'detecting',
      })

      // TODO: 调用 FormatConverter.convertToMP4()
      // 这里需要集成真实的 FormatConverter

      // 模拟转换进度
      setProgress({
        file: fileName,
        progress: 0.3,
        status: 'converting',
      })

      // 模拟完成
      setTimeout(() => {
        setProgress({
          file: fileName,
          progress: 1,
          status: 'completed',
        })

        // 通知父组件
        onConvertComplete?.({
          success: true,
          outputUrl: '/output.mp4',
        })
      }, 2000)
    } catch (error) {
      setProgress({
        file: fileName,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : '转换失败',
      })
    }
  }, [selectedFile, fileName, onConvertComplete])

  // 重置
  const handleReset = useCallback(() => {
    setSelectedFile(null)
    setFileName('')
    setOutputUrl('')
    setProgress({
      file: '',
      progress: 0,
      status: 'idle',
    })
  }, [])

  return (
    <div className="format-converter-panel">
      <div className="panel-header">
        <h3>{t('formatConverter.title')}</h3>
        <p className="panel-description">{t('formatConverter.description')}</p>
      </div>

      <div className="panel-content">
        {/* 文件选择 */}
        <div className="form-group">
          <label htmlFor="file-input">{t('formatConverter.selectFile')}</label>
          <input
            id="file-input"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="file-input"
          />
          {fileName && (
            <div className="selected-file">
              {fileName}
            </div>
          )}
        </div>

        {/* 格式检测 */}
        {fileName && (
          <div className="form-group">
            <label>{t('formatConverter.formatDetection')}</label>
            <FormatDetector fileName={fileName} onDetect={handleDetect} />
          </div>
        )}

        {/* 输出格式 */}
        <div className="form-group">
          <label htmlFor="output-format">{t('formatConverter.outputFormat')}</label>
          <select
            id="output-format"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as 'mp4' | 'webm')}
            className="select-input"
            disabled={progress.status === 'converting'}
          >
            <option value="mp4">MP4 (H.264)</option>
            <option value="webm">WebM (VP9)</option>
          </select>
        </div>

        {/* 质量预设 */}
        <div className="form-group">
          <label htmlFor="quality">{t('formatConverter.quality')}</label>
          <select
            id="quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as any)}
            className="select-input"
            disabled={progress.status === 'converting'}
          >
            <option value="low">{t('formatConverter.qualityLow')}</option>
            <option value="medium">{t('formatConverter.qualityMedium')}</option>
            <option value="high">{t('formatConverter.qualityHigh')}</option>
            <option value="very_high">{t('formatConverter.qualityVeryHigh')}</option>
          </select>
        </div>

        {/* 音频选项 */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
              disabled={progress.status === 'converting'}
            />
            <span>{t('formatConverter.includeAudio')}</span>
          </label>
        </div>

        {/* 转换进度 */}
        {progress.file && progress.status !== 'idle' && (
          <div className="form-group">
            <label>{t('formatConverter.conversionProgress')}</label>
            <ConversionProgress
              fileName={progress.file}
              progress={progress.progress}
              status={progress.status}
              error={progress.error}
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="action-buttons">
          <button
            onClick={handleConvert}
            disabled={!selectedFile || progress.status === 'converting'}
            className="btn-primary"
          >
            {progress.status === 'converting' ? t('formatConverter.converting') : t('formatConverter.convert')}
          </button>

          <button
            onClick={handleReset}
            disabled={progress.status === 'converting'}
            className="btn-secondary"
          >
            {t('formatConverter.reset')}
          </button>
        </div>
      </div>

      <style jsx>{`
        .format-converter-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          background: var(--surface-primary);
          border-radius: 12px;
        }

        .panel-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .panel-description {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .panel-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .file-input {
          padding: 8px 12px;
          background: var(--surface-elevated);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          cursor: pointer;
        }

        .selected-file {
          padding: 8px 12px;
          background: var(--surface-elevated);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text-primary);
        }

        .select-input {
          padding: 8px 12px;
          background: var(--surface-elevated);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: var(--accent-primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--accent-primary-hover);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--surface-elevated);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--surface-muted);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
