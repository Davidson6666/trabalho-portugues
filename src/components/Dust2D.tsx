/** Poeira em CSS para a versão 2D (no 3D quem faz isso é o Sparkles). */
import { useMemo } from 'react';

export function Dust2D() {
  const motes = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 3,
        dur: 14 + Math.random() * 16,
        delay: -Math.random() * 20,
      })),
    [],
  );
  return (
    <div className="dust2d" aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          style={{ left: m.left, top: m.top, width: m.size, height: m.size, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }}
        />
      ))}
    </div>
  );
}
