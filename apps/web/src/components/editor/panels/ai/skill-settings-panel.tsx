/**
 * 技能列表面板
 *
 * 展示 AI 助手可用的 Skill 列表（从 GET /api/ai/skills 获取）。
 * 供 AI 助手的设置页使用。
 */

"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@i18next-toolkit/nextjs-approuter";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface SkillSummary {
	name: string;
	description: string;
	source: string;
	tags: string[];
}

const SOURCE_LABELS: Record<string, string> = {
	bundled: "内置",
	user: "用户",
	project: "项目",
	plugin: "插件",
};

export function SkillSettingsPanel() {
	const { t } = useTranslation();
	const [skills, setSkills] = useState<SkillSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function fetchSkills() {
			try {
				const res = await fetch("/api/ai/skills");
				const data = await res.json();
				if (cancelled) return;
				if (!res.ok || !data.success) {
					setError(data.message ?? t("Failed to load skills"));
					return;
				}
				setSkills(data.skills ?? []);
				setError(null);
			} catch {
				if (!cancelled) {
					setError(t("Failed to load skills"));
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		fetchSkills();
		return () => {
			cancelled = true;
		};
	}, [t]);

	return (
		<div className="space-y-3">
			<div className="space-y-0.5">
				<p className="text-sm font-medium">{t("Skills")}</p>
				<p className="text-muted-foreground text-xs">
					{t("Reusable workflow instructions available to the AI assistant")}
				</p>
			</div>

			{loading && (
				<div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
					<HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
					{t("Loading...")}
				</div>
			)}

			{!loading && error && (
				<div className="text-destructive rounded-md border p-3 text-sm">
					{error}
				</div>
			)}

			{!loading && !error && skills.length === 0 && (
				<div className="text-muted-foreground py-4 text-sm">
					{t("No skills available")}
				</div>
			)}

			{!loading && !error && skills.length > 0 && (
				<div className="space-y-2">
					{skills.map((skill) => (
						<div
							key={skill.name}
							className="bg-muted/50 rounded-md border p-3"
						>
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm font-medium">{skill.name}</span>
								<span className="bg-background text-muted-foreground rounded border px-1.5 py-0.5 text-[10px] uppercase">
									{SOURCE_LABELS[skill.source] ?? skill.source}
								</span>
							</div>
							<p className="text-muted-foreground mt-1 text-xs">
								{skill.description}
							</p>
							{skill.tags.length > 0 && (
								<div className="mt-1.5 flex flex-wrap gap-1">
									{skill.tags.map((tag) => (
										<span
											key={tag}
											className="text-muted-foreground bg-background rounded px-1.5 py-0.5 text-[10px]"
										>
											#{tag}
										</span>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}