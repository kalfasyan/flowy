// The day of the cycle as a number on the app's icon, for people who turn it on.
// It's set while the app is open, so it can lag behind until the app is opened again.
// Browsers without the Badging API, or iOS without notifications on, show nothing.

const key = 'flowy:badge';

class Badge {
  supported = 'setAppBadge' in navigator;
  on = $state(read());

  set(on: boolean) {
    this.on = on;
    try {
      if (on) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
    } catch {
      // private browsing: it stays on until the app closes
    }
  }

  /** Shows the cycle day when it's on and known, and clears the icon otherwise. */
  show(cycleDay: number | null) {
    if (!this.supported) return;
    const count = this.on ? cycleDay : null;
    // refused without permission (iOS needs notifications on); nothing to do about it here
    (count ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => {});
  }
}

function read() {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export const badge = new Badge();
