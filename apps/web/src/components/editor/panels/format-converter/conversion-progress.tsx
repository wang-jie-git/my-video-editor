/**
 * ConversionProgress - 转换进度条组件
 *
 * 显示格式转换的实时进度
 */

import { useTranslation } from '@i18next-toolkit/nextjs-approuter'

interface ConversionProgressProps {
  /** 当前文件 */
  fileName: string
  /** 进度（0-1） */
  progress: number
  /** 状态 */
  status: 'idle' | 'detecting' | 'converting' | 'completed' | 'error'
  /** 错误信息 */
  error?: string
}

/**
 * ConversionProgress 组件
 */
export function ConversionProgress({
  fileName,
  progress,
  status,
  error,
}: ConversionProgressProps) {
  const { t } = useTranslation()

  // 状态映射
  const statusConfig = {
    idle: { label: t('formatConverter.statusIdle'), color: 'var(--text-muted)' },
    detecting: { label: t('formatConverter.statusDetecting'), color: 'var(--accent-primary)' },
    converting: { label: t('formatConverter.statusConverting'), color: 'var(--accent-primary)' },
    completed: { label: t('formatConverter.statusCompleted'), color: 'rgb(34, 197, 94)' },
    error: { label: t('formatConverter.statusError'), color: 'rgb(239, 68, 68)' },
  }

  const config = statusConfig[status]
  const percentage = Math.round(progress * 100)

  return (
    <div className="conversion-progress">
      <div className="progress-header">
        <span className="file-name">{fileName}</span>
        <span className="status-label" style={{ color: config.color }}>
          {config.label}
          {status === 'converting' && ` ${percentage}%`}
        </span>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{
            width: `${percentage}%`,
            backgroundColor: config.color,
          }}
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <style jsx>{`
        .conversion-progress {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--surface-elevated);
          border-radius: 8px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }

        .status-label {
          font-size: 12px;
          font-weight: 500;
        }

        .progress-bar-container {
          height: 8px;
          background: var(--surface-muted);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          transition: width 0.3s ease, background-color 0.3s ease;
        }

        .error-message {
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border-left: 3px solid rgb(239, 68, 68);
          border-radius: 4px;
          font-size: 13px;
          color: rgb(239, 68, 68);
        }
      `}</style>
    </div>
  )
}
