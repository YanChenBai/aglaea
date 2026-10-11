package dev.aglaea.mobile;

import android.graphics.Bitmap;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class PlaybackWebViewClient extends WebViewClient {
    private final WebViewClient delegate;

    public PlaybackWebViewClient(WebViewClient delegate) {
        this.delegate = delegate;
    }

    // 网络线程不进入 NativeScript；本应用不使用插件的 x-local 资源拦截。
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return null;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
        return null;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return delegate.shouldOverrideUrlLoading(view, request);
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        return delegate.shouldOverrideUrlLoading(view, url);
    }

    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
        delegate.onPageStarted(view, url, favicon);
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        delegate.onPageFinished(view, url);
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        delegate.onReceivedError(view, request, error);
    }

    @Override
    public void onReceivedError(WebView view, int code, String description, String url) {
        delegate.onReceivedError(view, code, description, url);
    }
}
