import { Application } from '@nativescript/core';

export function createImmersiveScreen(): (enabled: boolean) => void {
  let restore: (() => void) | undefined;

  return enabled => {
    if (!enabled) {
      restore?.();
      restore = undefined;

      return;
    }

    if (restore) {
      return;
    }

    const window = Application.android.foregroundActivity.getWindow();
    const decor = window.getDecorView();
    const attributes = window.getAttributes();
    const oldFlags = attributes.flags;
    const supportsCutout = android.os.Build.VERSION.SDK_INT >= 28;
    const oldCutout = supportsCutout ? attributes.layoutInDisplayCutoutMode : 0;
    const oldVisibility = decor.getSystemUiVisibility();

    restore = () => {
      const previous = window.getAttributes();
      previous.flags = oldFlags;

      if (supportsCutout) {
        previous.layoutInDisplayCutoutMode = oldCutout;
      }

      window.setAttributes(previous);
      decor.setSystemUiVisibility(oldVisibility);
    };

    if (supportsCutout) {
      attributes.layoutInDisplayCutoutMode = android.os.Build.VERSION.SDK_INT >= 30 ? 3 : 1;
    }

    attributes.flags |= android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN;
    window.setAttributes(attributes);
    const flags = android.view.View;
    decor.setSystemUiVisibility(
      flags.SYSTEM_UI_FLAG_LAYOUT_STABLE |
        flags.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
        flags.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
        flags.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
        flags.SYSTEM_UI_FLAG_FULLSCREEN |
        flags.SYSTEM_UI_FLAG_IMMERSIVE_STICKY,
    );
  };
}
