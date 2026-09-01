import { expect, test, mock } from "bun:test";
import { mock as mockModule } from "bun:test";

// bun 环境无 localStorage（zustand persist 需要），先注入
(globalThis as any).localStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
	clear: () => {},
};

// mock runAgentLoop：避免真实网络请求，记录是否被调用
const sendSpy = mock((_args: any) => Promise.resolve([]));
mockModule.module("@/lib/ai/agent/service", () => ({
	runAgentLoop: sendSpy,
}));

const { useAgentStore } = await import("./agent-store");

test("error 状态下 sendMessage 不再静默吞消息（回归：b8de274）", async () => {
	const store = useAgentStore;

	// 1. 模拟之前 401 报错遗留：status=error
	store.setState({
		status: "error",
		config: { baseUrl: "https://api.example.com/v1", apiKey: "sk-test", model: "m" },
		messages: [
			{ id: "err-1", role: "assistant", content: "Error: LLM API error (401)", timestamp: 1 },
		],
	});

	// 2. 发送新消息（不 await，观察同步状态）
	const pending = store.getState().sendMessage("你好");

	// 3. 关键断言：消息必须立即进入对话（旧 bug 是 status !== idle 直接 return）
	const syncMessages = store.getState().messages;
	const userMsg = syncMessages.find((m) => m.role === "user" && m.content === "你好");
	expect(userMsg).toBeDefined();
	// 旧的 Error 遗留被清除
	expect(syncMessages.some((m) => m.content.startsWith("Error:"))).toBe(false);
	// 状态进入 thinking（说明已通过守卫，进入发送链路）
	expect(store.getState().status).toBe("thinking");
	// runAgentLoop 确实被调用
	expect(sendSpy).toHaveBeenCalled();

	// 清理（避免影响其他测试）
	await pending.catch(() => {});
	store.getState().clearMessages();
});
