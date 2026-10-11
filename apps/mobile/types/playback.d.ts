declare namespace dev.aglaea.mobile {
  class PlaybackWebViewClient extends android.webkit.WebViewClient {
    constructor(delegate: android.webkit.WebViewClient);
  }
  class PlaybackBridge extends java.lang.Object {
    constructor(listener: PlaybackBridge.Listener);
    dispose(): void;
  }
  namespace PlaybackBridge {
    class Listener extends java.lang.Object {
      constructor(implementation: { emit(name: string, data: string): void });
    }
  }
  class PlaybackWebView extends android.webkit.WebView {
    constructor(context: android.content.Context);
    setBackgroundPlayback(enabled: boolean): void;
    setPlayerCornerRadius(radius: number): void;
  }
  class PlaybackService extends android.app.Service {
    static connect(context: android.content.Context, view: android.webkit.WebView): void;
    static updatePlayback(playing: boolean): void;
    static updateMedia(title: string, position: number, duration: number, speed: number): void;
    static retryFocus(): void;
    static disconnect(context: android.content.Context): void;
  }
}
