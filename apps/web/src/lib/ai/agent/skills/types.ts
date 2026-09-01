/**
 * Skill 类型定义
 */

/**
 * Skill 定义（与 Claude Skills 规范兼容，含 frontmatter）
 */
export interface SkillDefinition {
	/** 技能名称（唯一标识，如 "ffmpeg-migration"） */
	name: string;
	/** 技能描述（给 AI 判断何时使用） */
	description: string;
	/** 技能内容（markdown 指令） */
	content: string;
	/** 来源类型 */
	source: "bundled" | "user" | "project" | "plugin";
	/** 来源路径 */
	path?: string;
	/** 标签 */
	tags?: string[];
	/** frontmatter 额外字段 */
	metadata?: Record<string, unknown>;
}

/**
 * Skill 加载结果
 */
export interface SkillLoadResult {
	success: boolean;
	message: string;
	data?: unknown;
}

/**
 * Skill 注册表状态
 */
export interface SkillRegistryState {
	/** 技能总数 */
	total: number;
	/** 各来源数量 */
	bySource: Record<SkillDefinition["source"], number>;
}