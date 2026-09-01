/**
 * Skill 加载器
 *
 * 从多个来源加载 Skill：
 * - bundled：内置技能（项目内 apps/web/src/lib/ai/agent/skills/bundled/）
 * - user：用户全局技能（~/.openharness/skills/ 或 ~/.agents/skills/）
 * - project：项目级技能（<repo>/.openharness/skills/ 或 <repo>/skills/）
 *
 * 每个 skill 是带 frontmatter 的 markdown 文件：
 * ---
 * name: skill-name
 * description: 技能描述
 * tags: [a, b]
 * ---
 * 技能正文（markdown 指令）
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getSkillRegistry } from "./registry";
import type { SkillDefinition } from "./types";

/** 内置技能目录 */
export const BUNDLED_SKILLS_DIR = path.join(
	process.cwd(),
	"src/lib/ai/agent/skills/bundled",
);

/** 用户技能目录（按优先级） */
export const USER_SKILL_DIRS = [
	path.join(process.cwd(), ".openharness/skills"),
	path.join(process.cwd(), "skills"),
];

/**
 * 解析 frontmatter + body
 * 支持 --- 包裹的 YAML 简化解析（name/description/tags）
 */
export function parseSkillFrontmatter(
	content: string,
): { name?: string; description?: string; tags?: string[]; body: string } {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) {
		return { body: content };
	}

	const frontmatter = match[1];
	const body = match[2].trim();

	let name: string | undefined;
	let description: string | undefined;
	let tags: string[] | undefined;

	for (const line of frontmatter.split("\n")) {
		const nameMatch = line.match(/^name\s*:\s*["']?([^"'\n]+)["']?$/);
		if (nameMatch) {
			name = nameMatch[1].trim();
			continue;
		}
		const descMatch = line.match(/^description\s*:\s*["']?([^"'\n]+)["']?$/);
		if (descMatch) {
			description = descMatch[1].trim();
			continue;
		}
		const tagsMatch = line.match(/^tags\s*:\s*\[(.*)\]$/);
		if (tagsMatch) {
			tags = tagsMatch[1]
				.split(",")
				.map((t) => t.trim().replace(/["'\[\]]/g, ""))
				.filter(Boolean);
		}
	}

	return { name, description, tags, body };
}

/**
 * 从目录加载单个 md 文件为 SkillDefinition
 */
export async function loadSkillFromFile(
	filePath: string,
	source: SkillDefinition["source"],
): Promise<SkillDefinition | null> {
	try {
		const raw = await readFile(filePath, "utf-8");
		const fileName = path.basename(filePath, ".md");

		const { name, description, tags, body } =
			parseSkillFrontmatter(raw);

		if (!body) return null;

		return {
			name: name ?? fileName,
			description: description ?? `技能 ${fileName}（无描述）`,
			content: body,
			source,
			path: filePath,
			tags,
		};
	} catch (error) {
		console.warn(`[Skills] Failed to load skill from ${filePath}:`, error);
		return null;
	}
}

/**
 * 从目录加载所有技能
 */
export async function loadSkillsFromDir(
	dir: string,
	source: SkillDefinition["source"],
): Promise<SkillDefinition[]> {
	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		// 目录不存在则跳过
		return [];
	}

	const skills: SkillDefinition[] = [];
	for (const entry of entries) {
		if (!entry.endsWith(".md")) continue;
		const filePath = path.join(dir, entry);
		const skill = await loadSkillFromFile(filePath, source);
		if (skill) skills.push(skill);
	}
	return skills;
}

/**
 * 加载内置技能（bundled）
 */
export async function loadBundledSkills(): Promise<SkillDefinition[]> {
	return loadSkillsFromDir(BUNDLED_SKILLS_DIR, "bundled");
}

/**
 * 加载用户/项目技能
 */
export async function loadExternalSkills(): Promise<SkillDefinition[]> {
	const all: SkillDefinition[] = [];
	for (const dir of USER_SKILL_DIRS) {
		const dirSkills = await loadSkillsFromDir(dir, "project");
		all.push(...dirSkills);
	}
	return all;
}

/**
 * 加载所有技能并注册到全局注册表
 */
export async function loadSkillRegistry(): Promise<void> {
	const registry = getSkillRegistry();
	registry.clear();

	const [bundled, external] = await Promise.all([
		loadBundledSkills(),
		loadExternalSkills(),
	]);

	registry.registerAll([...bundled, ...external]);
	console.log(
		`[Skills] Loaded ${registry.getState().total} skills ` +
			`(${bundled.length} bundled, ${external.length} external)`,
	);
}

/**
 * 从文本直接创建技能（运行时添加）
 */
export function createSkillFromText(
	name: string,
	description: string,
	content: string,
	source: SkillDefinition["source"] = "user",
): SkillDefinition {
	return { name, description, content, source };
}