/**
 * McpStore - Zustand store for MCP configuration and state
 *
 * 管理：
 * - MCP 全局开关
 * - MCP Server 列表
 * - Server 连接状态
 * - UI 状态（面板开关等）
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateUUID } from "@/utils/id";
import type { McpServerConfig, McpServerStatus, McpConfig } from "./types";

interface McpPersistedState {
  config: McpConfig;
}

interface McpState extends McpPersistedState {
  // Server 状态
  serverStatuses: McpServerStatus[];

  // UI 状态
  isSettingsOpen: boolean;

  // Actions
  toggleEnabled: () => void;
  setEnabled: (enabled: boolean) => void;
  addServer: (server: Omit<McpServerConfig, "id">) => void;
  updateServer: (id: string, updates: Partial<McpServerConfig>) => void;
  removeServer: (id: string) => void;
  toggleServerEnabled: (id: string) => void;
  toggleSettingsOpen: () => void;

  // Manager actions
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => void;
  connectAll: () => Promise<void>;
  disconnectAll: () => void;
  refreshStatus: () => void;
}

/**
 * 默认 MCP Server 配置
 */
const DEFAULT_SERVERS: McpServerConfig[] = [
  {
    id: "one-memory",
    name: "One Memory",
    description: "One Memory 记忆系统（38 个工具）",
    enabled: true,
    serverPath: "/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js",
    serverArgs: [
      "--embedder",
      "simple",
      "--codegraph-dir",
      "/Users/mac/Desktop/AI-memory/.codegraph",
    ],
    timeout: 30000,
    icon: "🧠",
    category: "memory",
  },
];

/**
 * 默认配置
 */
const DEFAULT_CONFIG: McpConfig = {
  enabled: true,
  servers: DEFAULT_SERVERS,
};

/**
 * MCP Store
 *
 * 持久化配置到 localStorage
 * - 不持久化连接状态（serverStatuses）
 */
export const useMcpStore = create<McpState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      serverStatuses: [],
      isSettingsOpen: false,

      // 切换全局开关
      toggleEnabled: () => {
        const newEnabled = !get().config.enabled;
        set((state) => ({
          config: { ...state.config, enabled: newEnabled },
        }));

        // 自动连接/断开所有 Server
        if (newEnabled) {
          get().connectAll();
        } else {
          get().disconnectAll();
        }
      },

      // 设置全局开关
      setEnabled: (enabled: boolean) => {
        set((state) => ({
          config: { ...state.config, enabled },
        }));

        if (enabled) {
          get().connectAll();
        } else {
          get().disconnectAll();
        }
      },

      // 添加 Server
      addServer: (server: Omit<McpServerConfig, "id">) => {
        const newServer: McpServerConfig = {
          ...server,
          id: generateUUID(),
        };

        set((state) => ({
          config: {
            ...state.config,
            servers: [...state.config.servers, newServer],
          },
        }));

        // 如果启用了全局开关且 Server 本身启用，自动连接
        if (get().config.enabled && newServer.enabled) {
          get().connectServer(newServer.id);
        }
      },

      // 更新 Server
      updateServer: (id: string, updates: Partial<McpServerConfig>) => {
        set((state) => ({
          config: {
            ...state.config,
            servers: state.config.servers.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          },
        }));

        // 如果更新了 enabled 状态
        if (updates.enabled !== undefined && get().config.enabled) {
          if (updates.enabled) {
            get().connectServer(id);
          } else {
            get().disconnectServer(id);
          }
        }
      },

      // 删除 Server
      removeServer: (id: string) => {
        // 先断开连接
        get().disconnectServer(id);

        set((state) => ({
          config: {
            ...state.config,
            servers: state.config.servers.filter((s) => s.id !== id),
          },
          serverStatuses: state.serverStatuses.filter((s) => s.id !== id),
        }));
      },

      // 切换 Server 启用状态
      toggleServerEnabled: (id: string) => {
        const server = get().config.servers.find((s) => s.id === id);
        if (!server) return;

        get().updateServer(id, { enabled: !server.enabled });
      },

      // 切换设置面板
      toggleSettingsOpen: () => {
        set((state) => ({ isSettingsOpen: !state.isSettingsOpen }));
      },

      // 连接单个 Server
      connectServer: async (id: string) => {
        const server = get().config.servers.find((s) => s.id === id);
        if (!server) {
          console.warn(`[McpStore] Server "${id}" not found`);
          return;
        }

        console.log(`[McpStore] Connecting server: ${server.name}`);

        // 浏览器环境：通过 HTTP bridge 让 server 端 spawn
        const { bridgeConnectServers } = await import("../bridge/mcp-bridge");
        const ok = await bridgeConnectServers([{ ...server, enabled: true }]);
        console.log(`[McpStore] Browser connect "${server.name}" via bridge: ${ok}`);
        get().refreshStatus();
      },

      // 断开单个 Server
      disconnectServer: (id: string) => {
        console.log(`[McpStore] Disconnecting server: ${id}`);

        // 浏览器环境：通过 HTTP bridge 让 server 端移除实例
        (async () => {
          const { bridgeDisconnectServer } = await import("../bridge/mcp-bridge");
          await bridgeDisconnectServer(id);
          get().refreshStatus();
        })();
      },

      // 连接所有启用的 Server
      connectAll: async () => {
        console.log("[McpStore] Connecting all enabled servers...");

        // 浏览器环境：通过 HTTP bridge 让 server 端 spawn
        const { bridgeConnectServers } = await import("../bridge/mcp-bridge");
        const ok = await bridgeConnectServers(get().config.servers);
        console.log(`[McpStore] Browser connectAll via bridge: ${ok}`);
        get().refreshStatus();
      },

      // 断开所有 Server
      disconnectAll: () => {
        console.log("[McpStore] Disconnecting all servers...");

        (async () => {
          for (const s of get().config.servers) {
            const { bridgeDisconnectServer } = await import("../bridge/mcp-bridge");
            await bridgeDisconnectServer(s.id);
          }
          set({ serverStatuses: [] });
        })();
      },

      // 刷新状态
      refreshStatus: () => {
        (async () => {
          const { bridgeFetchMcpStatuses } = await import("../bridge/mcp-bridge");
          const statuses = await bridgeFetchMcpStatuses();
          set({ serverStatuses: statuses });
        })();
      },
    }),
    {
      name: "mcp-config",
      version: 2,
      partialize: (state) => ({
        config: state.config,
      }),
      migrate: (persistedState, version) => {
        // v1 → v2：默认启用 One Memory server（旧配置 enabled: false 会覆盖新默认）
        if (version < 2) {
          return { config: DEFAULT_CONFIG };
        }
        return persistedState as McpPersistedState;
      },
    }
  )
);
