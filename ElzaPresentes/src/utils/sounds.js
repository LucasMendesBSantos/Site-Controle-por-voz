function tone(ctx, freq, startTime, duration, volume = 0.25) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function play(notes) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const [freq, dur] of notes) {
      tone(ctx, freq, t, dur);
      t += dur + 0.03;
    }
    // Auto-close context after sounds finish
    setTimeout(() => ctx.close(), (t - ctx.currentTime + 0.2) * 1000);
  } catch {
    // Silently ignore if Web Audio is unavailable
  }
}

// Two ascending notes — mic ON
export function playMicStart() {
  play([[523, 0.1], [784, 0.14]]);
}

// Two descending notes — mic OFF
export function playMicStop() {
  play([[784, 0.1], [523, 0.14]]);
}
