package dev.aglaea.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.IBinder;
import android.os.PowerManager;
import java.lang.ref.WeakReference;

public class PlaybackService extends Service {
    private static final String CHANNEL = "aglaea_playback";
    private static PlaybackService instance;
    private static WeakReference<PlaybackWebView> webview = new WeakReference<>(null);
    private static boolean playing;
    private AudioManager audio;
    private AudioFocusRequest focus;
    private PowerManager.WakeLock wakeLock;
    private boolean focused;

    public static void connect(Context context, PlaybackWebView view) {
        webview = new WeakReference<>(view);
        context.startForegroundService(new Intent(context, PlaybackService.class));
    }

    public static void updatePlayback(boolean wanted) {
        boolean changed = playing != wanted;
        playing = wanted;
        if (instance != null) {
            if (changed) instance.updateFocus();
            instance.deliverFocus();
        }
    }

    public static void retryFocus() {
        if (instance != null && playing && !instance.focused) instance.updateFocus();
    }

    public static void disconnect(Context context) {
        playing = false;
        context.stopService(new Intent(context, PlaybackService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        NotificationManager notifications = getSystemService(NotificationManager.class);
        notifications.createNotificationChannel(new NotificationChannel(
            CHANNEL, "房间后台播放", NotificationManager.IMPORTANCE_LOW));
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent open = PendingIntent.getActivity(this, 0, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("Aglaea 房间播放")
            .setContentText("保持房间同步，退出房间后结束后台播放")
            .setContentIntent(open).setOngoing(true).build();
        startForeground(1, notification);

        audio = getSystemService(AudioManager.class);
        focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE).build())
            .setWillPauseWhenDucked(true)
            .setOnAudioFocusChangeListener(change -> {
                focused = change == AudioManager.AUDIOFOCUS_GAIN;
                deliverFocus();
            }).build();
        wakeLock = getSystemService(PowerManager.class).newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK, "aglaea:playback");
        updateFocus();
    }

    private void updateFocus() {
        if (playing) {
            focused = audio.requestAudioFocus(focus) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } else {
            audio.abandonAudioFocusRequest(focus);
            focused = false;
        }
        deliverFocus();
    }

    private void deliverFocus() {
        boolean allowed = playing && focused;
        if (allowed && !wakeLock.isHeld()) wakeLock.acquire();
        if (!allowed && wakeLock.isHeld()) wakeLock.release();
        PlaybackWebView view = webview.get();
        if (view != null) {
            view.setBackgroundPlayback(allowed);
            view.evaluateJavascript("window.aglaeaAudioFocus?.(" + allowed + ");", null);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        deliverFocus();
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        playing = false;
        audio.abandonAudioFocusRequest(focus);
        focused = false;
        deliverFocus();
        webview.clear();
        instance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
