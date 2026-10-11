package dev.aglaea.mobile;

import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;

public class PlaybackBridge {
    public interface Listener {
        void emit(String name, String data);
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile Listener listener;

    public PlaybackBridge(Listener listener) {
        this.listener = listener;
    }

    @JavascriptInterface
    public void emitEvent(String name, String data) {
        // JavaBridge 线程立即返回，不等待 WebView 正阻塞的主线程。
        main.post(() -> {
            Listener current = listener;
            if (current != null) current.emit(name, data);
        });
    }

    public void dispose() {
        listener = null;
        main.removeCallbacksAndMessages(null);
    }
}
