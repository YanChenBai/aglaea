package dev.aglaea.mobile;

import android.content.Context;
import android.webkit.WebView;
import android.graphics.Outline;
import android.view.View;
import android.view.ViewOutlineProvider;

public class PlaybackWebView extends WebView {
    private boolean backgroundPlayback;

    public PlaybackWebView(Context context) {
        super(context);
    }

    public void setBackgroundPlayback(boolean enabled) {
        backgroundPlayback = enabled;
        super.onWindowVisibilityChanged(enabled ? VISIBLE : getWindowVisibility());
    }

    public void setPlayerCornerRadius(float radius) {
        setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View view, Outline outline) {
                outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), radius);
            }
        });
        setClipToOutline(radius > 0);
        invalidateOutline();
    }

    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        // 房间播放期间保留网页的可见状态，避免 WebView 在锁屏时暂停媒体。
        super.onWindowVisibilityChanged(backgroundPlayback ? VISIBLE : visibility);
    }
}
