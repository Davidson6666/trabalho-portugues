/**
 * Tela cheia. Os navegadores só permitem entrar em tela cheia dentro de um
 * clique/toque do usuário, por isso `enterFullscreen` é chamada no selo da
 * abertura e no botão da barra superior. Falhas (ex.: iPhone) são ignoradas.
 */
import { useEffect, useState } from 'react';

type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export const fullscreenSupported = (): boolean => {
  const el = document.documentElement as FsEl;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
};

export const isFullscreen = (): boolean => {
  const d = document as FsDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
};

export function enterFullscreen(): void {
  try {
    const el = document.documentElement as FsEl;
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.();
    p?.catch(() => undefined);
  } catch {
    /* sem suporte: segue normal */
  }
}

export function toggleFullscreen(): void {
  if (!isFullscreen()) return enterFullscreen();
  try {
    const d = document as FsDoc;
    (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.())?.catch(() => undefined);
  } catch {
    /* ignore */
  }
}

export function useIsFullscreen(): boolean {
  const [fs, setFs] = useState(isFullscreen);
  useEffect(() => {
    const on = () => setFs(isFullscreen());
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => {
      document.removeEventListener('fullscreenchange', on);
      document.removeEventListener('webkitfullscreenchange', on);
    };
  }, []);
  return fs;
}
