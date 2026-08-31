/**
 * TransitionSelector - 转场效果选择器
 *
 * 提供转场效果类型和时长的选择界面
 */

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { TransitionType } from "../../../services/renderer/video-composer/types";

export interface TransitionSelectorProps {
  /** 当前转场类型 */
  value?: TransitionType;
  /** 当前转场时长 */
  duration?: number;
  /** 变化回调 */
  onChange?: (transition: { type: TransitionType; duration: number }) => void;
}

/**
 * TransitionSelector 组件
 */
export function TransitionSelector({
  value = "fade",
  duration = 1.0,
  onChange,
}: TransitionSelectorProps) {
  const t = useTranslations("videoComposer");
  const [selectedType, setSelectedType] = useState<TransitionType>(value);
  const [selectedDuration, setSelectedDuration] = useState<number>(duration);

  // 转场类型选项
  const transitionTypes: Array<{ value: TransitionType; label: string }> = [
    { value: "fade", label: t("transitionFade") || "Fade" },
    { value: "slide", label: t("transitionSlide") || "Slide" },
    { value: "wipe", label: t("transitionWipe") || "Wipe" },
    { value: "dissolve", label: t("transitionDissolve") || "Dissolve" },
  ];

  // 时长预设（秒）
  const durationPresets = [
    { value: 0.3, label: "0.3s" },
    { value: 0.5, label: "0.5s" },
    { value: 1.0, label: "1.0s" },
    { value: 1.5, label: "1.5s" },
    { value: 2.0, label: "2.0s" },
    { value: 3.0, label: "3.0s" },
  ];

  // 处理转场类型变化
  const handleTypeChange = (type: TransitionType) => {
    setSelectedType(type);
    onChange?.({ type, duration: selectedDuration });
  };

  // 处理时长变化
  const handleDurationChange = (newDuration: number) => {
    setSelectedDuration(newDuration);
    onChange?.({ type: selectedType, duration: newDuration });
  };

  return (
    <div className="transition-selector">
      <div className="form-group">
        <label htmlFor="transition-type">
          {t("transitionType") || "转场类型"}
        </label>
        <select
          id="transition-type"
          value={selectedType}
          onChange={(e) => handleTypeChange(e.target.value as TransitionType)}
          className="select-input"
        >
          {transitionTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="transition-duration">
          {t("transitionDuration") || "转场时长"}
        </label>
        <select
          id="transition-duration"
          value={selectedDuration}
          onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
          className="select-input"
        >
          {durationPresets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <style jsx>{`
        .transition-selector {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
          background: var(--surface-elevated);
          border-radius: 8px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .select-input {
          padding: 8px 12px;
          background: var(--surface-primary);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
        }

        .select-input:hover {
          border-color: var(--border-focus);
        }

        .select-input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
}
