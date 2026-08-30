"use client";

/**
 * 剪辑模式快捷胶囊条（dsh-video-modes 桥）。
 *
 * 渲染位置：项目首页「首页 > 所有项目」面包屑行下方。
 * 点击胶囊 → postMessage 通知父页面（DSH web 主界面，3080 端口），
 * 由父页面 dsh-video-modes 插件把对应模式指令填入输入框。
 *
 * 说明：Cutia 内嵌于 DSH 的跨域 iframe（4455），父页面无法直接注入 DOM，
 * 故本组件在 Cutia 内部渲染；新建项目时 router 跳转离开本页，组件自动卸载。
 */
const MODES = [
	{ id: "m1-photo", label: "图文成片", icon: "🖼️" },
	{ id: "m2-tts", label: "口播成片", icon: "🎙️" },
	{ id: "m3-vlog", label: "旅行/风光 Vlog", icon: "🏔️" },
	{ id: "m4-marketing", label: "营销短视频", icon: "📣" },
	{ id: "m5-subtitle", label: "快速加字幕", icon: "💬" },
	{ id: "m6-color", label: "快速调色", icon: "🎨" },
] as const;

export function VideoModesBar() {
	const applyMode = (modeId: string) => {
		try {
			window.parent.postMessage(
				{ type: "dsh-video-modes:apply-mode", modeId },
				"*",
			);
		} catch {
			// 非 iframe 环境（直接访问 4455）时静默失败，不影响页面
		}
	};

	return (
		<div className="flex flex-wrap items-center gap-2 px-8 pt-1">
			<span className="text-sm font-semibold text-foreground/70 select-none">
				🎬 剪辑模式
			</span>
			{MODES.map((m) => (
				<button
					key={m.id}
					type="button"
					onClick={() => applyMode(m.id)}
					title={`${m.label}：点击后将模式指令填入左侧输入框`}
					className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 text-sm text-foreground transition-colors hover:border-primary hover:bg-accent"
				>
					<span aria-hidden="true">{m.icon}</span>
					<span>{m.label}</span>
				</button>
			))}
		</div>
	);
}
