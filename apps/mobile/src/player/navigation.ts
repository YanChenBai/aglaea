export function isBilibiliUrl(value: string): boolean {
  // NativeScript 没有浏览器 URL 全局对象；限制域名边界且禁止 userinfo。
  return /^https:\/\/(?:[a-z0-9-]+\.)*bilibili\.com(?::443)?(?:[/?#]|$)/i.test(value);
}

export function playbackUrl(value?: string): string | undefined {
  if (!value || !isBilibiliUrl(value)) {
    return undefined;
  }

  return value.replace(/^https:\/\/m\.bilibili\.com(?=[:/]|$)/i, 'https://www.bilibili.com');
}
