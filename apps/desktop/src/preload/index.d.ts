import type { DesktopApi } from "./index";

declare global {
  interface Window {
    desktopAPI?: DesktopApi;
  }
}

export {};