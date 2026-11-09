/** Painel de ajustes: tema de leitura, som e partículas. */
import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../scene/Scene3D';

interface Props {
  theme: Theme;
  sound: boolean;
  particles: boolean;
  onTheme: (t: Theme) => void;
  onSound: (on: boolean) => void;
  onParticles: (on: boolean) => void;
}

const THEMES: { id: Theme; label: string }[] = [
  { id: 'claro', label: 'Claro' },
  { id: 'sepia', label: 'Sépia' },
  { id: 'noturno', label: 'Noturno' },
];

export function Settings({ theme, sound, particles, onTheme, onSound, onParticles }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="settings" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost settings-toggle"
        aria-expanded={open}
        aria-controls="painel-ajustes"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">⚙</span> Ajustes
      </button>
      {open && (
        <div className="settings-panel" id="painel-ajustes" role="group" aria-label="Ajustes de leitura">
          <fieldset>
            <legend>Tema de leitura</legend>
            <div className="seg">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`seg-btn swatch-${t.id}`}
                  aria-pressed={theme === t.id}
                  onClick={() => onTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="switch">
            <input type="checkbox" checked={sound} onChange={(e) => onSound(e.target.checked)} />
            <span>Som de página</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={particles} onChange={(e) => onParticles(e.target.checked)} />
            <span>Poeira flutuando</span>
          </label>
        </div>
      )}
    </div>
  );
}
