// Timer sounds (Web Audio). Must be unlocked by a user gesture; "ambient" session so music keeps playing.
export let actx = null;

export function unlockAudio() {
  try {
    // iOS: "ambient" mixes with music instead of stopping it (but respects the silent switch)
    if (navigator.audioSession) navigator.audioSession.type = "ambient";
    if (!actx || actx.state === "closed") { const C = window.AudioContext || window.webkitAudioContext; actx = new C(); }
    wake();
  } catch (e) {}
}

// iOS leaves the context "suspended" or "interrupted" (music started, a call, the app hidden): anything but running
// gets resumed before a sound (works once a gesture has unlocked it)
function wake() {
  if (actx && actx.state !== "running") { const p = actx.resume(); if (p && p.catch) p.catch(() => {}); }
}

export function tone(freq, at, len, vol = 0.35) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.frequency.value = freq;
  o.connect(g); g.connect(actx.destination);
  const s = actx.currentTime + at;
  g.gain.setValueAtTime(0.0001, s);
  g.gain.exponentialRampToValueAtTime(vol, s + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, s + len);
  o.start(s); o.stop(s + len + 0.05);
}

// short tick for the 3-2-1 countdown
export function tick() {
  if (!actx) return;
  try { wake(); tone(660, 0, 0.09, 0.3); } catch (e) {}
}

// soft blip when rest starts
export function blip() {
  if (!actx) return;
  try { wake(); tone(520, 0, 0.07, 0.15); } catch (e) {}
}

export function beep() {
  if (!actx) return;
  try { wake(); tone(988, 0, 0.18); tone(988, 0.22, 0.18); tone(1319, 0.44, 0.45); } catch (e) {}
}

// Vibration: a short buzz for a touch that took (long press, drag), a long one for "time to act" (with beep()).
export function vibrate(pattern = 20) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}
export const VIBRATE_ACT = [300, 150, 300];
