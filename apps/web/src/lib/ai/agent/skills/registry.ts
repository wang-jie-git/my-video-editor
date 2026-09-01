/**
 * SkillRegistry - Skill 注册表
 *
 * 管理所有已加载的 Skill：
 * - 注册 / 获取 / 列出
 * - 按名称 / 来源过滤
 * - 技能重名处理
 */
import type { SkillDefinition } from "./types";

export class SkillRegistry {
	private skills = new Map<string, SkillDefinition>();

	/**
	 * 注册单个 Skill
	 */
	register(skill: SkillDefinition): void {
		this.skills.set(skill.name, skill);
	}

	/**
	 * 批量注册
	 */
	registerAll(skills: SkillDefinition[]): void {
		for (const skill of skills) {
			this.register(skill);
		}
	}

	/**
	 * 根据名称获取
	 */
	get(name: string): SkillDefinition | undefined {
		return this.skills.get(name);
	}

	/**
	 * 列出所有技能
	 */
	listSkills(filterSource?: SkillDefinition["source"]): SkillDefinition[] {
		const all = Array.from(this.skills.values());
		if (!filterSource) return all;
		return all.filter((s) => s.source === filterSource);
	}

	/**
	 * 列出技能名称
	 */
	listNames(): string[] {
		return Array.from(this.skills.keys());
	}

	/**
	 * 检查技能是否存在
	 */
	has(name: string): boolean {
		return this.skills.has(name);
	}

	/**
	 * 移除技能
	 */
	remove(name: string): boolean {
		return this.skills.delete(name);
	}

	/**
	 * 清理所有技能
	 */
	clear(): void {
		this.skills.clear();
	}

	/**
	 * 获取统计状态
	 */
	getState(): { total: number; bySource: Record<string, number> } {
		const bySource: Record<string, number> = {};
		for (const skill of this.skills.values()) {
			bySource[skill.source] = (bySource[skill.source] ?? 0) + 1;
		}
		return { total: this.skills.size, bySource };
	}
}

/**
 * 全局单例
 */
let registryInstance: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry {
	if (!registryInstance) {
		registryInstance = new SkillRegistry();
	}
	return registryInstance;
}

export function setSkillRegistry(registry: SkillRegistry | null): void {
	registryInstance = registry;
}