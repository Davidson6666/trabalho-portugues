/**
 * Decide entre o modo 3D (WebGL) e a versão 2D simples.
 * Força o 2D com ?modo=2d na URL (útil para testar).
 */
export function canUse3D(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('modo') === '2d') return false;
    if (params.get('modo') === '3d') return true;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;

    // Aparelhos muito fracos: CPU com 2 núcleos ou menos, ou pouca memória.
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    if (cores <= 2 || memory <= 2) return false;
    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
