/**
 * MCP 配置面板
 *
 * 功能：
 * - 启用/禁用 MCP 功能
 * - 添加/删除 MCP Server
 * - 启用/禁用单个 Server
 * - 查看 Server 连接状态
 */

"use client";

import { useMcpStore } from "@/lib/ai/agent/mcp/mcp-store";
import type { McpServerConfig, McpServerStatus } from "@/lib/ai/agent/mcp/types";
import { useEffect, useState } from "react";

/**
 * MCP 配置面板组件
 *
 * @example
 * ```tsx
 * <McpSettingsPanel />
 * ```
 */
export function McpSettingsPanel() {
  const {
    config,
    serverStatuses,
    toggleEnabled,
    addServer,
    updateServer,
    removeServer,
    toggleServerEnabled,
    connectServer,
    disconnectAll,
    refreshStatus,
  } = useMcpStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newServer, setNewServer] = useState({
    name: "",
    serverPath: "",
    serverArgs: "",
  });

  // 刷新状态
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStatus();
    }, 5000); // 每 5 秒刷新一次

    return () => clearInterval(interval);
  }, [refreshStatus]);

  // 处理添加 Server
  const handleAddServer = () => {
    if (!newServer.name.trim() || !newServer.serverPath.trim()) {
      return;
    }

    addServer({
      name: newServer.name.trim(),
      description: "",
      enabled: config.enabled,
      serverPath: newServer.serverPath.trim(),
      serverArgs: newServer.serverArgs
        .split(" ")
        .filter((arg) => arg.trim()),
      timeout: 30000,
      icon: "🔌",
      category: "custom",
    });

    setNewServer({ name: "", serverPath: "", serverArgs: "" });
    setIsAdding(false);
  };

  // 获取 Server 状态
  const getStatus = (id: string): McpServerStatus | undefined => {
    return serverStatuses.find((s: McpServerStatus) => s.id === id);
  };

  return (
    <div className="mcp-settings-panel">
      <div className="mcp-header">
        <h2>MCP 配置</h2>
        <p className="mcp-description">
          管理 MCP (Model Context Protocol) Server 连接
        </p>
      </div>

      {/* 全局开关 */}
      <div className="mcp-section">
        <div className="mcp-toggle">
          <label htmlFor="mcp-enabled">启用 MCP</label>
          <input
            id="mcp-enabled"
            type="checkbox"
            checked={config.enabled}
            onChange={toggleEnabled}
          />
        </div>
        <p className="mcp-hint">
          启用后，AI 助手可以调用所有 MCP Server 的工具
        </p>
      </div>

      {/* Server 列表 */}
      {config.enabled && (
        <div className="mcp-section">
          <div className="mcp-section-header">
            <h3>MCP Servers ({config.servers.length})</h3>
            <button
              className="mcp-button mcp-button-primary"
              onClick={() => setIsAdding(true)}
            >
              + 添加 Server
            </button>
          </div>

          {/* 添加 Server 表单 */}
          {isAdding && (
            <div className="mcp-add-form">
              <div className="mcp-form-group">
                <label>名称</label>
                <input
                  type="text"
                  placeholder="如：My MCP Server"
                  value={newServer.name}
                  onChange={(e) =>
                    setNewServer({ ...newServer, name: e.target.value })
                  }
                />
              </div>
              <div className="mcp-form-group">
                <label>Server 路径</label>
                <input
                  type="text"
                  placeholder="/path/to/mcp-server.js"
                  value={newServer.serverPath}
                  onChange={(e) =>
                    setNewServer({ ...newServer, serverPath: e.target.value })
                  }
                />
              </div>
              <div className="mcp-form-group">
                <label>参数（空格分隔）</label>
                <input
                  type="text"
                  placeholder="--arg1 --arg2"
                  value={newServer.serverArgs}
                  onChange={(e) =>
                    setNewServer({ ...newServer, serverArgs: e.target.value })
                  }
                />
              </div>
              <div className="mcp-form-actions">
                <button
                  className="mcp-button mcp-button-primary"
                  onClick={handleAddServer}
                  disabled={!newServer.name || !newServer.serverPath}
                >
                  添加
                </button>
                <button
                  className="mcp-button mcp-button-secondary"
                  onClick={() => {
                    setIsAdding(false);
                    setNewServer({ name: "", serverPath: "", serverArgs: "" });
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* Server 列表 */}
          <div className="mcp-server-list">
            {config.servers.map((server: McpServerConfig) => {
              const status = getStatus(server.id);
              return (
                <div key={server.id} className="mcp-server-item">
                  <div className="mcp-server-info">
                    <div className="mcp-server-header">
                      <span className="mcp-server-icon">{server.icon}</span>
                      <div className="mcp-server-details">
                        <h4>{server.name}</h4>
                        <p className="mcp-server-path">{server.serverPath}</p>
                      </div>
                    </div>
                    {status && (
                      <div className="mcp-server-status">
                        <span
                          className={`mcp-status-indicator ${
                            status.connected ? "connected" : "disconnected"
                          }`}
                        />
                        <span className="mcp-status-text">
                          {status.connected
                            ? `${status.toolsCount} 个工具`
                            : "未连接"}
                        </span>
                        {status.lastError && (
                          <span className="mcp-status-error">
                            {status.lastError}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mcp-server-actions">
                    <label className="mcp-switch">
                      <input
                        type="checkbox"
                        checked={server.enabled}
                        onChange={() => toggleServerEnabled(server.id)}
                        disabled={!config.enabled}
                      />
                      <span>启用</span>
                    </label>
                    <button
                      className="mcp-button mcp-button-danger"
                      onClick={() => removeServer(server.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 断开所有按钮 */}
          {config.servers.length > 0 && (
            <div className="mcp-actions">
              <button
                className="mcp-button mcp-button-secondary"
                onClick={() => disconnectAll()}
              >
                断开所有连接
              </button>
            </div>
          )}
        </div>
      )}

      {/* 预设配置 */}
      <div className="mcp-section">
        <h3>预设配置</h3>
        <div className="mcp-presets">
          <button
            className="mcp-preset-button"
            onClick={() => {
              addServer({
                name: "One Memory",
                description: "One Memory 记忆系统（19 个工具）",
                enabled: config.enabled,
                serverPath:
                  "/Users/mac/Desktop/AI-memory/packages/memory-mcp/build/index.js",
                serverArgs: ["--embedder", "simple"],
                timeout: 30000,
                icon: "🧠",
                category: "memory",
              });
            }}
          >
            🧠 One Memory
          </button>
          {/* TODO: 添加更多预设 */}
        </div>
      </div>

      <style jsx>{`
        .mcp-settings-panel {
          padding: 20px;
          background: var(--background, #fff);
          border-radius: 8px;
          max-width: 800px;
          margin: 0 auto;
        }

        .mcp-header {
          margin-bottom: 24px;
        }

        .mcp-header h2 {
          margin: 0 0 8px;
          font-size: 24px;
        }

        .mcp-description {
          color: var(--text-secondary, #666);
          margin: 0;
        }

        .mcp-section {
          margin-bottom: 32px;
          padding: 20px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 8px;
        }

        .mcp-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .mcp-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .mcp-toggle label {
          font-weight: 500;
        }

        .mcp-hint {
          font-size: 14px;
          color: var(--text-secondary, #666);
          margin: 0;
        }

        .mcp-button {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .mcp-button-primary {
          background: var(--primary, #0070f3);
          color: white;
        }

        .mcp-button-primary:hover {
          background: var(--primary-dark, #0051cc);
        }

        .mcp-button-secondary {
          background: var(--background-secondary, #f5f5f5);
          color: var(--text-primary, #333);
        }

        .mcp-button-secondary:hover {
          background: var(--border, #e5e5e5);
        }

        .mcp-button-danger {
          background: transparent;
          padding: 4px 8px;
        }

        .mcp-add-form {
          padding: 16px;
          background: var(--background-secondary, #f5f5f5);
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .mcp-form-group {
          margin-bottom: 12px;
        }

        .mcp-form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .mcp-form-group input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 6px;
          font-size: 14px;
        }

        .mcp-form-actions {
          display: flex;
          gap: 8px;
        }

        .mcp-server-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mcp-server-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--background-secondary, #f5f5f5);
          border-radius: 6px;
        }

        .mcp-server-info {
          flex: 1;
        }

        .mcp-server-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .mcp-server-icon {
          font-size: 24px;
        }

        .mcp-server-details h4 {
          margin: 0 0 4px;
          font-size: 16px;
        }

        .mcp-server-path {
          font-size: 12px;
          color: var(--text-secondary, #666);
          margin: 0;
          font-family: monospace;
        }

        .mcp-server-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .mcp-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .mcp-status-indicator.connected {
          background: #10b981;
        }

        .mcp-status-indicator.disconnected {
          background: #ef4444;
        }

        .mcp-status-text {
          color: var(--text-secondary, #666);
        }

        .mcp-status-error {
          color: #ef4444;
          font-size: 12px;
        }

        .mcp-server-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
        }

        .mcp-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .mcp-actions {
          margin-top: 16px;
        }

        .mcp-presets {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .mcp-preset-button {
          padding: 12px 20px;
          background: var(--background-secondary, #f5f5f5);
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .mcp-preset-button:hover {
          background: var(--primary-light, #e6f2ff);
          border-color: var(--primary, #0070f3);
        }
      `}</style>
    </div>
  );
}
