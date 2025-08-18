"use client";

// Dev-only FPS monitor
export function FPSMeter() {
  if (process.env.NODE_ENV !== "development") return null;
  let rafId;
  let last = performance.now();
  let frames = 0;
  const el = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!el) return null;
  el.style.cssText = `position:fixed;bottom:8px;left:8px;z-index:9999;background:rgba(0,0,0,.6);color:#0f0;padding:4px 6px;border-radius:6px;font:12px/1.2 system-ui, sans-serif;pointer-events:none`;

  function tick(now) {
    frames++;
    if (now - last >= 1000) {
      el.textContent = `${frames} fps`;
      frames = 0;
      last = now;
    }
    rafId = requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  document.body.appendChild(el);
  return null;
}

// Screen reader only live region for announcing phase transitions
export function SRLiveRegion() {
  return (
    <div aria-live="polite" aria-atomic="true" style={{position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(1px, 1px, 1px, 1px)'}}>
      {/* Content will be injected by pages via document.getElementById('sr-announce') */}
      <span id="sr-announce"></span>
    </div>
  );
}

// Register service worker for offline mode
export function ServiceWorkerRegistrar() {
  if (typeof window === 'undefined') return null;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';
      navigator.serviceWorker.register(swUrl).catch(() => {});
    });
  }
  return null;
}

