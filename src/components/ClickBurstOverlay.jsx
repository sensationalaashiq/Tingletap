import React, { useEffect, useRef } from 'react';

const LUXURY_COLORS = [
  '#fbbf24', // champagne gold
  '#fde68a', // soft gold pearl
  '#a855f7', // royal amethyst
  '#6366f1', // indigo sapphire
  '#f472b6', // rose quartz
  '#ffffff', // diamond white
];

const ClickBurstOverlay = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles = [];
    let rings = [];
    let rafId = null;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const drawStar = (x, y, r, rot, alpha, color) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      const inner = r * 0.36;
      for (let i = 0; i < 4; i++) {
        const a1 = (i * Math.PI) / 2;
        const a2 = a1 + Math.PI / 4;
        if (i === 0) ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
        else ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
        ctx.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += ring.vr;
        ring.vr *= 0.94;
        ring.alpha -= 0.045;
        if (ring.alpha <= 0) {
          rings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = ring.alpha;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= 0.92;
        p.vy = p.vy * 0.92 + 0.08;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life -= p.decay;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = Math.max(0, p.life);
        if (p.shape === 'star') {
          drawStar(p.x, p.y, p.size * (0.6 + alpha * 0.5), p.rot, alpha, p.color);
        } else if (p.shape === 'spark') {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 1.9, p.y - p.vy * 1.9);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (particles.length > 0 || rings.length > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    const spawnBurst = (x, y) => {
      if (particles.length > 140) particles.splice(0, particles.length - 100);

      rings.push({
        x,
        y,
        r: 4,
        vr: 3.1,
        alpha: 0.55,
        color: '#fbbf24',
      });

      const count = 18;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const speed = 2.1 + Math.random() * 4.2;
        const shape = i % 3 === 0 ? 'star' : i % 3 === 1 ? 'spark' : 'dot';
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          size: shape === 'star' ? 4.4 + Math.random() * 2.5 : 2.6 + Math.random() * 2,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.22,
          life: 1,
          decay: 0.026 + Math.random() * 0.018,
          color: LUXURY_COLORS[(i + Math.floor(Math.random() * 3)) % LUXURY_COLORS.length],
          shape,
        });
      }

      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const handlePointerDown = (e) => {
      if (e.button && e.button !== 0) return;
      spawnBurst(e.clientX, e.clientY);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', resize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
};

export default ClickBurstOverlay;
