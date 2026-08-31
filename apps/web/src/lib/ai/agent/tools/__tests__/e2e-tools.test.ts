/**
 * FFmpeg AI 工具端到端测试（简化版）
 *
 * 测试重点：
 * 1. 工具文件结构完整性
 * 2. 工具 Schema 正确性
 * 3. 错误处理一致性
 * 4. 参数验证逻辑
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TOOLS_DIR = join(import.meta.dir, '..');
const __TESTS_DIR = join(import.meta.dir);

describe('FFmpeg AI 工具端到端测试', () => {
    describe('文件完整性验证', () => {
        const toolFiles = [
            'ffmpeg-basic-tools.ts',        // Phase 1: 3 tools
            'ffmpeg-video-tools-phase2.ts', // Phase 2: 4 tools
            'ffmpeg-format-tools.ts',       // Phase 3: 2 tools
            'ffmpeg-filter-tools.ts',       // Phase 4: 7 tools
            'ffmpeg-subtitle-tools.ts',     // Phase 5: 4 tools
            'ffmpeg-audio-tools.ts',        // Phase 6: 5 tools
            'ffmpeg-video-tools.ts',        // Phase 7: 4 tools
        ];

        it('所有工具文件应该存在', () => {
            toolFiles.forEach(file => {
                const filePath = join(TOOLS_DIR, file);
                expect(existsSync(filePath), `${file} 应该存在`).toBe(true);
            });
        });

        it('工具文件应该有内容', () => {
            toolFiles.forEach(file => {
                const filePath = join(TOOLS_DIR, file);
                const content = readFileSync(filePath, 'utf-8');
                expect(content.length, `${file} 应该有内容`).toBeGreaterThan(0);
            });
        });

        it('工具文件应该导出工具数组', () => {
            toolFiles.forEach(file => {
                const filePath = join(TOOLS_DIR, file);
                const content = readFileSync(filePath, 'utf-8');
                expect(content, `${file} 应该导出工具数组`).toContain('export const ffmpeg');
            });
        });
    });

    describe('工具 Schema 验证', () => {
        it('工具文件应该包含必要的 Schema 字段', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('name:');
            expect(content).toContain('description:');
            expect(content).toContain('parameters:');
            expect(content).toContain('async execute(');
            expect(content).toContain('type: "object"');
            expect(content).toContain('properties:');
        });

        it('工具应该使用统一的参数格式', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('type: "string"');
            expect(content).toContain('description:');
            expect(content).toContain('required:');
        });

        it('工具应该有完整的多语言描述', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-video-tools-phase2.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('Use cases:');
            expect(content).toMatch(/\n\s*\n/); // 多行描述
        });
    });

    describe('错误处理验证', () => {
        it('工具应该包含绝对路径验证', () => {
            const files = [
                'ffmpeg-basic-tools.ts',
                'ffmpeg-video-tools-phase2.ts',
                'ffmpeg-format-tools.ts',
            ];

            files.forEach(file => {
                const filePath = join(TOOLS_DIR, file);
                const content = readFileSync(filePath, 'utf-8');

                expect(content, `${file} 应该包含绝对路径验证`).toContain('isAbsolutePath');
                expect(content, `${file} 应该检查路径`).toContain('startsWith("/")');
            });
        });

        it('工具应该包含 EditorCore 错误处理', () => {
            const files = [
                'ffmpeg-basic-tools.ts',
                'ffmpeg-video-tools-phase2.ts',
                'ffmpeg-format-tools.ts',
            ];

            files.forEach(file => {
                const filePath = join(TOOLS_DIR, file);
                const content = readFileSync(filePath, 'utf-8');

                expect(content, `${file} 应该检查 EditorCore`).toContain('EditorCore.getInstance()');
                expect(content, `${file} 应该检查 renderer`).toContain('editor.renderer');
                expect(content, `${file} 应该有错误消息`).toContain('not enabled');
            });
        });

        it('工具应该包含 try-catch 错误处理', () => {
            const files = [
                'ffmpeg-basic-tools.ts',
                'ffmpeg-video-tools-phase2.ts',
                'ffmpeg-format-tools.ts',
            ];

            files.forEach(file => {
                const filePath = join(TOOLS_DIR, file);
                const content = readFileSync(filePath, 'utf-8');

                expect(content, `${file} 应该有 try-catch`).toContain('try {');
                expect(content, `${file} 应该有 catch`).toContain('} catch (error) {');
            });
        });

        it('工具应该返回统一的响应格式', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('success:');
            expect(content).toContain('message:');
        });
    });

    describe('工具数量统计', () => {
        it('Phase 1: FFmpeg 基础工具应该有 3 个', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            const toolCount = (content.match(/export const \w+Tool:/g) || []).length;
            expect(toolCount).toBe(3);
        });

        it('Phase 2: 视频导出工具应该有 4 个', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-video-tools-phase2.ts');
            const content = readFileSync(filePath, 'utf-8');

            const toolCount = (content.match(/export const \w+Tool:/g) || []).length;
            expect(toolCount).toBe(4);
        });

        it('Phase 3: 格式转换工具应该有 2 个', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-format-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            const toolCount = (content.match(/export const \w+Tool:/g) || []).length;
            expect(toolCount).toBe(2);
        });

        it('Phase 4: 视频滤镜工具应该有 7 个', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-filter-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            const toolCount = (content.match(/export const \w+Tool:/g) || []).length;
            expect(toolCount).toBe(7);
        });

        it('Phase 5: 字幕工具应该有 4 个', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-subtitle-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            const toolCount = (content.match(/export const \w+Tool:/g) || []).length;
            expect(toolCount).toBe(4);
        });

        it('Phase 6: 音频处理工具应该有 5 个', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-audio-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            const toolCount = (content.match(/export const \w+Tool:/g) || []).length;
            expect(toolCount).toBe(5);
        });

        it('Phase 7: 视频合并/分割工具应该有 4 个', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-video-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            const toolCount = (content.match(/export const \w+Tool:/g) || []).length;
            expect(toolCount).toBe(4);
        });

        it('所有 Phase 总共应该有 29 个工具', () => {
            const toolFiles = [
                'ffmpeg-basic-tools.ts',
                'ffmpeg-video-tools-phase2.ts',
                'ffmpeg-format-tools.ts',
                'ffmpeg-filter-tools.ts',
                'ffmpeg-subtitle-tools.ts',
                'ffmpeg-audio-tools.ts',
                'ffmpeg-video-tools.ts',
            ];

            let totalTools = 0;
            toolFiles.forEach(file => {
                const filePath = join(TOOLS_DIR, file);
                const content = readFileSync(filePath, 'utf-8');
                totalTools += (content.match(/export const \w+Tool:/g) || []).length;
            });

            expect(totalTools).toBe(29);
        });
    });

    describe('代码质量验证', () => {
        it('工具文件应该有 Phase 注释', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('Phase 1');
            expect(content).toContain('工具');
        });

        it('工具应该使用 TypeScript 类型', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('import type');
            expect(content).toContain('AgentTool');
        });

        it('工具应该导出工具数组', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('export const ffmpegBasicTools = [');
            expect(content).toContain('];');
        });
    });

    describe('参数验证一致性', () => {
        it('文件路径参数应该有正确的类型定义', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            // 检查至少有一个文件路径参数的定义
            expect(content).toMatch(/filePath:.*\{/);
            expect(content).toMatch(/type:.*"string"/);
        });

        it('数值参数应该有范围验证', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-audio-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toMatch(/Math\.max.*Math\.min/); // 范围验证
        });

        it('枚举参数应该有 enum 定义', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-subtitle-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('enum:');
        });
    });

    describe('工具执行逻辑验证', () => {
        it('工具应该构建 FFmpeg 命令', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('ffmpegService.exec(');
        });

        it('工具应该使用异步执行', () => {
            const filePath = join(TOOLS_DIR, 'ffmpeg-basic-tools.ts');
            const content = readFileSync(filePath, 'utf-8');

            expect(content).toContain('async execute(');
        });
    });
});

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  FFmpeg AI 工具端到端测试（简化版）                              ║
║  测试文件完整性、Schema、错误处理和参数验证                       ║
╚══════════════════════════════════════════════════════════════╝

运行测试: bun test src/lib/ai/agent/tools/__tests__/e2e-tools.test.ts
`);
