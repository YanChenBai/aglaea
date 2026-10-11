export const DEFAULT_PAGE_ZOOM = 50;

export function desktopUserAgent(nativeUserAgent: string): string {
  const chromiumVersion = nativeUserAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? '120.0.0.0';

  // 保留设备实际 Chromium 版本，只把平台与移动端标记替换为桌面环境。
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromiumVersion} Safari/537.36`;
}
