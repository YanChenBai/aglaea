package dev.aglaea.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.IBinder;
import android.os.Build;
import android.os.PowerManager;
import java.lang.ref.WeakReference;

public class PlaybackService extends Service {
    private static final String CHANNEL = "aglaea_playback";
    private static PlaybackService instance;
    private static WeakReference<PlaybackWebView> webview = new WeakReference<>(null);
    private static boolean playing;
    private static boolean notificationPermissionRequested;
    private AudioManager audio;
    private AudioFocusRequest focus;
    private PowerManager.WakeLock wakeLock;
    private boolean focused;
    private boolean locallyPaused;
    private MediaSession mediaSession;
    private Bitmap artwork;
    private String title = "Aglaea 房间播放";
    private long position;
    private long duration;
    private float speed = 1f;
    private static final String PLAY = "dev.aglaea.mobile.PLAY";
    private static final String PAUSE = "dev.aglaea.mobile.PAUSE";

    public static void connect(Context context, PlaybackWebView view) {
        webview = new WeakReference<>(view);
        context.startForegroundService(new Intent(context, PlaybackService.class));
    }

    public static void requestNotificationPermission(Activity activity) {
        if (Build.VERSION.SDK_INT < 33 || activity == null
            || notificationPermissionRequested
            || activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) return;
        notificationPermissionRequested = true;
        activity.requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 4201);
    }

    public static void updatePlayback(boolean wanted) {
        boolean changed = playing != wanted;
        playing = wanted;
        if (instance != null) {
            if (changed) instance.updateFocus();
            instance.deliverFocus();
        }
    }

    public static void updateMedia(String title, long position, long duration, float speed) {
        if (instance == null) return;
        boolean changed = !instance.title.equals(title) || instance.duration != duration;
        instance.title = title;
        instance.position = position;
        instance.duration = duration;
        instance.speed = speed;
        if (changed) {
            instance.mediaSession.setMetadata(new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, "Aglaea · 房间同步")
                .putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, instance.artwork)
                .putLong(MediaMetadata.METADATA_KEY_DURATION, duration).build());
            instance.refreshNotification();
        }
        instance.publishState();
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
        mediaSession = new MediaSession(this, "aglaea_playback");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS
            | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        artwork = BitmapFactory.decodeResource(getResources(),
            getResources().getIdentifier("media_artwork", "drawable", getPackageName()));
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { setLocallyPaused(false); }
            @Override public void onPause() { setLocallyPaused(true); }
        });
        mediaSession.setMetadata(new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, "Aglaea · 房间同步")
            .putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, artwork).build());
        // 首次发布通知前补齐会话状态，避免系统先接收到空的媒体会话。
        publishState();
        mediaSession.setActive(true);
        startForeground(1, notification());

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
        if (playing && !locallyPaused) {
            focused = audio.requestAudioFocus(focus) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } else {
            audio.abandonAudioFocusRequest(focus);
            focused = false;
        }
        deliverFocus();
    }

    private void deliverFocus() {
        boolean allowed = playing && focused && !locallyPaused;
        if (allowed && !wakeLock.isHeld()) wakeLock.acquire();
        if (!allowed && wakeLock.isHeld()) wakeLock.release();
        PlaybackWebView view = webview.get();
        if (view != null) {
            view.setBackgroundPlayback(allowed);
            view.evaluateJavascript("window.aglaeaAudioFocus?.(" + allowed + "," + locallyPaused + ");", null);
        }
        publishState();
        refreshNotification();
    }

    private void setLocallyPaused(boolean paused) {
        locallyPaused = paused;
        updateFocus();
    }

    private void publishState() {
        boolean active = playing && focused && !locallyPaused;
        mediaSession.setPlaybackState(new PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE)
            .setState(active ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                position, active ? speed : 0f).build());
    }

    private Notification notification() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent open = PendingIntent.getActivity(this, 0, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        mediaSession.setSessionActivity(open);
        boolean active = playing && focused && !locallyPaused;
        PendingIntent control = PendingIntent.getService(this, active ? 1 : 2,
            new Intent(this, PlaybackService.class).setAction(active ? PAUSE : PLAY),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
            .setSmallIcon(getResources().getIdentifier("ic_notification", "drawable", getPackageName()))
            .setLargeIcon(artwork)
            .setContentTitle(title).setContentText("Aglaea · 房间同步")
            .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .addAction(new Notification.Action.Builder(
                active ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                active ? "暂停本机" : "继续跟随", control).build())
            .setStyle(new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken()).setShowActionsInCompactView(0))
            .build();
    }

    private void refreshNotification() {
        getSystemService(NotificationManager.class).notify(1, notification());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && PLAY.equals(intent.getAction())) setLocallyPaused(false);
        else if (intent != null && PAUSE.equals(intent.getAction())) setLocallyPaused(true);
        else deliverFocus();
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        playing = false;
        audio.abandonAudioFocusRequest(focus);
        focused = false;
        deliverFocus();
        mediaSession.setActive(false);
        mediaSession.release();
        stopForeground(STOP_FOREGROUND_REMOVE);
        webview.clear();
        instance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
