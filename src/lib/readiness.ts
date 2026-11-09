/**
 * Controle de "tudo pronto" para a abertura.
 *
 * Cada recurso (fontes, imagens, cena 3D) registra uma tarefa. A abertura só
 * termina quando todas as tarefas forem concluídas E o tempo mínimo passar.
 * Assim o site nunca aparece pela metade.
 */
import { useSyncExternalStore } from 'react';

const pending = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export function startTask(name: string): () => void {
  pending.add(name);
  emit();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    pending.delete(name);
    emit();
  };
}

export function useAllReady(): boolean {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
  return pending.size === 0;
}

/** Fontes do Google Fonts usadas no livro. */
export function trackFonts(): void {
  const done = startTask('fonts');
  const families = [
    '400 1em "EB Garamond"',
    'italic 400 1em "EB Garamond"',
    '400 1em "IM Fell English"',
    '400 1em "IM Fell English SC"',
    '400 1em "IM Fell DW Pica"',
    'italic 400 1em "IM Fell DW Pica"',
    '400 1em "UnifrakturMaguntia"',
  ];
  const timeout = new Promise((r) => setTimeout(r, 6000)); // rede lenta: não travar para sempre
  Promise.race([Promise.all(families.map((f) => document.fonts.load(f))).then(() => document.fonts.ready), timeout])
    .catch(() => undefined)
    .finally(done);
}

/** Pré-carrega imagens. Erro também conta como "pronto" (vira placeholder). */
export function trackImages(urls: string[]): void {
  const done = startTask('images');
  let left = urls.length;
  if (left === 0) return done();
  const tick = () => {
    left--;
    if (left <= 0) done();
  };
  urls.forEach((u) => {
    const img = new Image();
    img.onload = tick;
    img.onerror = tick;
    img.src = u;
  });
  setTimeout(done, 10000);
}
