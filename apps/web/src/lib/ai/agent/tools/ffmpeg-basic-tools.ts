/**
 * Phase 1: FFmpeg 基础工具
 *
 * 提供 FFmpegService 核心功能的 AI 工具接口
 */

import { EditorCore } from "@/core";
import type { AgentTool } from "./types";

/**
 * 验证文件路径
 */
function isAbsolutePath(path: unknown): path is string {
	return typeof path === "string" && path.startsWith("/");
}

/**
 * 执行 FFmpeg 命令
 *
 * 使用场景：
 * - 执行自定义 FFmpeg 命令
 * - 高级用户需要精细控制
 * - 特殊编码参数或滤镜
 */
export const executeFFmpegCommandTool: AgentTool = {
	name: "execute_ffmpeg_command",
	description: `Execute a custom FFmpeg command with full control.

Use cases:
- Advanced users who need precise control over FFmpeg parameters
- Custom encoding settings not covered by other tools
- Special filter chains or complex operations
- Debugging or troubleshooting

Warning: This is a low-level tool. Use higher-level tools (merge_videos, convert_video_format, etc.) when possible.

Examples of valid commands:
- ['-i', 'input.mp4', '-c:v', 'libx264', '-crf', '23', 'output.mp4']
- ['-i', 'input.mp4', '-vf', 'scale=1280:720', '-c:a', 'aac', 'output.mp4']
- ['-f', 'lavfi', '-i', 'testsrc=duration=5:size=320x240:rate=30', 'test.mp4']`,
	parameters: {
		type: "object",
		properties: {
			args: {
				type: "array",
				items: { type: "string" },
				description:
					"Array of FFmpeg command arguments (e.g., ['-i', 'input.mp4', '-c:v', 'libx264', 'output.mp4'])",
			},
			timeout: {
				type: "number",
				description:
					"Timeout in milliseconds (default: 300000 = 5 minutes)",
				default: 300000,
			},
		},
		required: ["args"],
	},
	async execute(args) {
		try {
			const commandArgs = args.args as string[];
			const timeout = (args.timeout as number) ?? 300000;

			if (!Array.isArray(commandArgs) || commandArgs.length === 0) {
				return {
					success: false,
					message: "FFmpeg command args must be a non-empty array",
				};
			}

			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message:
						"FFmpeg export is not enabled. Please enable FFmpeg export first.",
				};
			}

			// 获取 FFmpegService
			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService) {
				return {
					success: false,
					message: "FFmpegService is not initialized. Please enable FFmpeg export first.",
				};
			}

			// 执行 FFmpeg 命令
			const result = await ffmpegService.exec(commandArgs, {
				timeout,
			});

			return {
				success: result.exitCode === 0,
				message: result.exitCode === 0
					? `FFmpeg command executed successfully in ${result.duration}ms`
					: `FFmpeg command failed with exit code ${result.exitCode}`,
				data: {
					stdout: result.stdout,
					stderr: result.stderr,
					exitCode: result.exitCode,
					duration: result.duration,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error executing FFmpeg command: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 获取 FFmpeg 状态
 *
 * 使用场景：
 * - 检查 FFmpeg 是否已加载
 * - 获取 FFmpeg 版本信息
 * - 检查 FFmpeg 配置
 */
export const getFFmpegStatusTool: AgentTool = {
	name: "get_ffmpeg_status",
	description: `Get the current status of FFmpeg service.

Use cases:
- Check if FFmpeg is loaded and ready
- Get FFmpeg version information
- Verify FFmpeg configuration
- Troubleshoot FFmpeg issues`,
	parameters: {
		type: "object",
		properties: {},
		required: [],
	},
	async execute() {
		try {
			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;

			if (!renderer) {
				return {
					success: true,
					message:
						"FFmpeg export is not enabled. FFmpeg is not loaded.",
					data: {
						loaded: false,
						enabled: false,
					},
				};
			}

			// 获取 FFmpegService
			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService) {
				return {
					success: true,
					message: "FFmpeg export is enabled but FFmpegService is not initialized.",
					data: {
						enabled: true,
						loaded: false,
					},
				};
			}

			const isLoaded = ffmpegService.isLoaded();

			return {
				success: true,
				message: isLoaded
					? "FFmpeg is loaded and ready"
					: "FFmpeg export is enabled but FFmpeg is not loaded yet",
				data: {
					enabled: true,
					loaded: isLoaded,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error getting FFmpeg status: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

/**
 * 检查文件是否存在
 *
 * 使用场景：
 * - 验证输入文件是否存在
 * - 检查输出文件是否已存在
 * - 文件存在性检查
 */
export const checkFileExistsTool: AgentTool = {
	name: "check_file_exists",
	description: `Check if a file exists in the virtual file system.

Use cases:
- Verify input files before processing
- Check if output files already exist
- File existence validation`,
	parameters: {
		type: "object",
		properties: {
			filePath: {
				type: "string",
				description:
					"Absolute path to the file (e.g., '/video.mp4')",
			},
		},
		required: ["filePath"],
	},
	async execute(args) {
		try {
			const filePath = args.filePath as string;

			if (!isAbsolutePath(filePath)) {
				return {
					success: false,
					message:
						"File path must be an absolute path (e.g., '/video.mp4')",
				};
			}

			const editor = EditorCore.getInstance();
			const renderer = editor.renderer;
			if (!renderer) {
				return {
					success: false,
					message: "FFmpeg export is not enabled.",
				};
			}

			// 获取 FFmpegService
			const ffmpegService = (renderer as any).ffmpegService;
			if (!ffmpegService) {
				return {
					success: false,
					message: "FFmpegService is not initialized.",
				};
			}

			// 检查文件是否存在
			const exists = await ffmpegService.exists(filePath);

			return {
				success: true,
				message: exists
					? `File '${filePath}' exists`
					: `File '${filePath}' does not exist`,
				data: {
					exists,
					filePath,
				},
			};
		} catch (error) {
			return {
				success: false,
				message: `Error checking file: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
		}
	},
};

// 导出所有 Phase 1 工具
export const ffmpegBasicTools = [
	executeFFmpegCommandTool,
	getFFmpegStatusTool,
	checkFileExistsTool,
];
