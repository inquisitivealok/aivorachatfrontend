// Generates an alert beep using Web Audio API — no external audio file needed
export const playAlertTone = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const beep = (startTime, freq, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // 3 descending alert beeps
    beep(ctx.currentTime,       880, 0.3);
    beep(ctx.currentTime + 0.4, 660, 0.3);
    beep(ctx.currentTime + 0.8, 880, 0.5);
  } catch {}
};
