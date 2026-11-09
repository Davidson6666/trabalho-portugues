/**
 * Texturas geradas em <canvas> (couro, madeira, papel, bordas das páginas).
 * Nada é baixado da rede: carregam instantaneamente e pesam zero no bundle.
 */
import * as THREE from 'three';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function finish(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Grão aleatório leve sobre toda a área. */
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, alpha: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
    d[i + 3] = 255 * alpha + d[i + 3] * (1 - alpha);
  }
  ctx.putImageData(img, 0, 0);
}

/** Couro da capa, com moldura dourada e título em relevo. */
export function leatherCover(title: string, author: string) {
  const W = 768;
  const H = 1076;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createRadialGradient(W * 0.45, H * 0.4, 50, W / 2, H / 2, W);
  g.addColorStop(0, '#6e3a22');
  g.addColorStop(1, '#3a1d10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 26, 1);

  // Moldura dourada dupla
  ctx.strokeStyle = '#c9a45c';
  ctx.lineWidth = 6;
  ctx.strokeRect(46, 46, W - 92, H - 92);
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, W - 128, H - 128);

  // Ornamentos nos cantos
  ctx.fillStyle = '#c9a45c';
  ctx.font = '48px "IM Fell English", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [x, y] of [
    [100, 100],
    [W - 100, 100],
    [100, H - 100],
    [W - 100, H - 100],
  ])
    ctx.fillText('❦', x, y);

  // Título com sombra (efeito de gravação)
  const drawText = (text: string, y: number, size: number, font: string) => {
    ctx.font = `${size}px ${font}`;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(text, W / 2 + 2, y + 3);
    const tg = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    tg.addColorStop(0, '#f1d89a');
    tg.addColorStop(0.5, '#c9a45c');
    tg.addColorStop(1, '#8f6c2e');
    ctx.fillStyle = tg;
    ctx.fillText(text, W / 2, y);
  };
  const words = title.split(' ');
  const titleSize = Math.min(118, (W - 180) / Math.max(...words.map((w) => w.length)) * 1.75);
  words.forEach((w, i) => drawText(w, H * 0.36 + i * titleSize * 1.05, titleSize, '"IM Fell English SC", "IM Fell English", Georgia, serif'));
  ctx.fillStyle = '#c9a45c';
  ctx.fillRect(W / 2 - 90, H * 0.36 + words.length * titleSize * 1.05 - 10, 180, 2);
  drawText(author, H * 0.36 + words.length * titleSize * 1.05 + 50, 42, '"IM Fell English", Georgia, serif');
  return finish(c);
}

/** Couro liso (contracapa e lombada). */
export function leatherPlain() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#4a2415';
  ctx.fillRect(0, 0, 256, 256);
  grain(ctx, 256, 256, 30, 1);
  return finish(c, true);
}

/** Papel de guarda marmorizado (lado de dentro da capa). */
export function endpaper() {
  const [c, ctx] = canvas(512, 720);
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(0, 0, 512, 720);
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = `rgba(${120 + Math.random() * 60}, ${70 + Math.random() * 40}, 40, 0.18)`;
    ctx.lineWidth = 2 + Math.random() * 6;
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 720;
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (Math.random() - 0.5) * 140;
      y += (Math.random() - 0.5) * 140;
      ctx.quadraticCurveTo(x + 40, y - 40, x, y);
    }
    ctx.stroke();
  }
  grain(ctx, 512, 720, 14, 1);
  return finish(c);
}

/** Bordas das folhas (listras finas creme). */
export function pageEdges() {
  const [c, ctx] = canvas(64, 512);
  ctx.fillStyle = '#efe3c6';
  ctx.fillRect(0, 0, 64, 512);
  for (let x = 0; x < 64; x += 2) {
    ctx.fillStyle = `rgba(120, 95, 60, ${0.06 + Math.random() * 0.12})`;
    ctx.fillRect(x, 0, 1, 512);
  }
  return finish(c);
}

/** Primeira página vista quando a capa abre (combina com a folha de rosto em HTML). */
export function firstPage(title: string) {
  const W = 512;
  const H = 717;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W);
  g.addColorStop(0, '#fbf6ea');
  g.addColorStop(1, '#eadbb8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 10, 1);
  ctx.fillStyle = '#3b2a1a';
  ctx.textAlign = 'center';
  ctx.font = '46px "IM Fell English", Georgia, serif';
  ctx.fillText(title, W / 2, H * 0.36);
  ctx.fillRect(W / 2 - 50, H * 0.36 + 26, 100, 1.5);
  return finish(c);
}

/** Tampo de madeira da mesa: tábuas com veios ondulados, nós e verniz. */
export function wood() {
  const S = 1024;
  const [c, ctx] = canvas(S, S);
  const plankW = 256;
  for (let px = 0; px < S; px += plankW) {
    // Cada tábua com um tom levemente diferente
    const tone = 0.85 + Math.random() * 0.25;
    ctx.fillStyle = `rgb(${Math.round(98 * tone)}, ${Math.round(62 * tone)}, ${Math.round(36 * tone)})`;
    ctx.fillRect(px, 0, plankW, S);
    // Veios: linhas verticais onduladas
    const seed = Math.random() * 10;
    for (let i = 0; i < 70; i++) {
      const x0 = px + Math.random() * plankW;
      ctx.strokeStyle = `rgba(${40 + Math.random() * 30}, ${20 + Math.random() * 15}, 8, ${0.08 + Math.random() * 0.16})`;
      ctx.lineWidth = 0.6 + Math.random() * 2.2;
      ctx.beginPath();
      for (let y = 0; y <= S; y += 16) {
        const x = x0 + Math.sin(y * 0.006 + seed + i * 0.3) * 9 + Math.sin(y * 0.021 + i) * 2.5;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Um nó por tábua
    const kx = px + 40 + Math.random() * (plankW - 80);
    const ky = Math.random() * S;
    for (let r = 26; r > 2; r -= 3) {
      ctx.strokeStyle = `rgba(40, 20, 8, ${0.12 + (26 - r) * 0.012})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(kx, ky, r * 0.6, r * 1.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Junta entre tábuas
    ctx.fillStyle = 'rgba(18, 9, 3, 0.55)';
    ctx.fillRect(px, 0, 2, S);
  }
  grain(ctx, S, S, 14, 1);
  return finish(c, true);
}

/** Folha de carta com linhas de "letra cursiva" (rabiscos ondulados). */
export function letterPaper() {
  const W = 384;
  const H = 512;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.8);
  g.addColorStop(0, '#f3e8cf');
  g.addColorStop(1, '#d9c497');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(40, 30, 60, 0.55)';
  ctx.lineWidth = 1.3;
  for (let y = 70; y < H - 50; y += 22) {
    const end = W - 40 - (Math.random() < 0.15 ? 120 : Math.random() * 30);
    ctx.beginPath();
    ctx.moveTo(40, y);
    for (let x = 40; x < end; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.45 + y) * 2.4 + Math.sin(x * 0.11) * 1.2);
    ctx.stroke();
  }
  grain(ctx, W, H, 10, 1);
  return finish(c);
}
