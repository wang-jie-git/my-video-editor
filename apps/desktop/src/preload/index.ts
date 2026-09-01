import { contextBridge, ipcRenderer } from "electron";

/**
 * preload - 安全的渲染进程桥（contextIsolation + sandbox 模式下唯一与 main 通信的入口）
 *
 * 原则：
 * - 不暴露原始 ipcRenderer
 * - 只暴露白名单能力
 * - 所有返回值通过 { success, data, error } Result 包装（IPC 错误序列化友好）
 */
export interface DesktopAppInfo {
  name: string;
  version: string;
  platform: string;
  isDesktop: boolean;
}

const api = {
  /** 应用基本信息（版本/平台/是否桌面端） */
  getAppInfo: (): Promise<DesktopAppInfo> => ipcRenderer.invoke("app:get-info"),

  /** 窗口控制 */
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: (): Promise<void> => ipcRenderer.invoke("window:toggle-maximize"),
    close: (): Promise<void> => ipcRenderer.invoke("window:close"),
  },
};

export type DesktopApi = typeof api;

contextBridge.exposeInMainWorld("desktopAPI", api);