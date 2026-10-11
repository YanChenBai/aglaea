import { AWebView } from '@nativescript-community/ui-webview/index.android';

export class PlaybackWebView extends AWebView {
  private playbackBridge?: dev.aglaea.mobile.PlaybackBridge;

  override initNativeView(): void {
    super.initNativeView();
    const view = this.nativeViewProtected as unknown as android.webkit.WebView;
    view.setWebViewClient(new dev.aglaea.mobile.PlaybackWebViewClient(this.nativeWebClient));
    this.playbackBridge = new dev.aglaea.mobile.PlaybackBridge(
      new dev.aglaea.mobile.PlaybackBridge.Listener({
        emit: (name, data) => {
          let value: unknown = data;

          try {
            value = JSON.parse(data);
          } catch {
            // 与插件保持一致，无法解析时保留原始字符串。
          }

          this.onWebViewEvent(name, value);
        },
      }),
    );
    view.addJavascriptInterface(this.playbackBridge, 'androidWebViewBridge');
  }

  override disposeNativeView(): void {
    this.playbackBridge?.dispose();
    this.playbackBridge = undefined;
    super.disposeNativeView();
  }

  override createNativeView(): android.webkit.WebView {
    const view = new dev.aglaea.mobile.PlaybackWebView(this._context);
    const settings = view.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setAllowFileAccess(true);
    settings.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
    settings.setAllowUniversalAccessFromFileURLs(true);

    return view;
  }
}
