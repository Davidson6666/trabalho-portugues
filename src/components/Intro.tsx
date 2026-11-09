/**
 * Abertura cinematográfica (substitui a barra de carregamento).
 *
 * 0. Selo de cera: o visitante toca para "romper o lacre". Esse clique é o
 *    gesto que o navegador exige para entrar em TELA CHEIA. Enquanto isso,
 *    tudo já está carregando por trás.
 * 1. Faixas de cinema entram, um holofote acende sobre a mesa escura e
 *    poeira dourada flutua na luz.
 * 2. As fotos dos integrantes caem uma a uma como polaroides (aceleração,
 *    quique e balanço) e se espalham.
 * 3. Arabescos dourados se desenham, o título surge em folha de ouro, letra
 *    a letra, e um brilho percorre as letras. Depois entra o subtítulo.
 * 4. Saída: clarão dourado, faixas recolhem e a cena 3D aparece.
 *
 * Só termina quando: tempo mínimo passou E todos os recursos estão prontos.
 * "Pular" encurta a animação, mas ainda espera os recursos.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { content } from '../lib/content';
import { useAllReady } from '../lib/readiness';
import { enterFullscreen } from '../lib/fullscreen';
import { onImgError, Flourish } from '../book/PageView';

interface Props {
  reducedMotion: boolean;
  onDone: () => void;
}

const MIN_MS = 6800;
const MIN_MS_REDUCED = 2500;

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Layout final das fotos, simétrico e para qualquer número de integrantes.
 *
 * Mede, na tela, as caixas reais do autor, dos arabescos, do título, do
 * subtítulo e do botão "Pular" (`obstacles`) e coloca as fotos no espaço
 * livre, o mais perto possível do centro e espelhadas:
 *   - grupos de 4 (os quatro cantos, espelhados em x e y);
 *   - o resto: um par espelhado, ou uma foto centralizada em cima/embaixo.
 * Se não couber, diminui as fotos (mínimo 45 %). Preferimos a 5ª foto
 * centralizada (simétrico), mesmo que as fotos fiquem até 42 % menores.
 */
function layoutCards(n: number, w: number, h: number, obstacles: Box[]) {
  const jitter = () => (Math.random() - 0.5) * 16;
  const baseW = Math.min(172, Math.max(84, w * 0.15));
  const baseFont = Math.max(10, Math.min(15.2, w * 0.013));
  const bar = h * 0.085; // faixas de cinema
  const gap = 12;
  const STEP = 8;
  const cx = w / 2;
  const cy = h / 2;

  type Pt = [number, number]; // coordenadas relativas ao centro da tela

  const attempt = (s: number, symmetricOnly: boolean, avoid: boolean): { cardW: number; font: number; positions: { x: number; y: number; r: number }[] } | null => {
    const cw = baseW * s;
    const hw = (cw / 2) * 1.1; // meia largura (com folga para a inclinação)
    const hh = ((cw * 1.45) / 2) * 1.07; // meia altura (foto 3:4 + moldura e legenda)
    const inside = (x: number, y: number) =>
      cx + x - hw >= 14 && cx + x + hw <= w - 14 && cy + y - hh >= bar + 14 && cy + y + hh <= h - bar - 14;
    const clearOfObstacles = (x: number, y: number) =>
      !avoid ||
      obstacles.every((o) => cx + x + hw < o.left - gap || cx + x - hw > o.right + gap || cy + y + hh < o.top - gap || cy + y - hh > o.bottom + gap);
    const placed: Pt[] = [];
    const clash = (x: number, y: number) => placed.some((p) => Math.abs(x - p[0]) < hw * 2 + gap && Math.abs(y - p[1]) < hh * 2 + gap);
    const ok = (pts: Pt[]) => pts.every(([x, y], i) => inside(x, y) && clearOfObstacles(x, y) && !clash(x, y) && pts.every((q, j) => j <= i || Math.abs(x - q[0]) >= hw * 2 + gap || Math.abs(y - q[1]) >= hh * 2 + gap));

    // Posições candidatas, das mais próximas do centro para as mais distantes
    const grid: Pt[] = [];
    for (let dy = 0; dy <= cy; dy += STEP) for (let dx = 0; dx <= cx; dx += STEP) grid.push([dx, dy]);
    grid.sort((a, b) => Math.hypot(a[0] / w, a[1] / h) - Math.hypot(b[0] / w, b[1] / h));

    const find = (mk: (dx: number, dy: number) => Pt[] | null): Pt[] | null => {
      for (const [dx, dy] of grid) {
        const pts = mk(dx, dy);
        if (pts && ok(pts)) return pts;
      }
      return null;
    };

    let left = n;
    if (left % 2 === 1) {
      // foto ímpar primeiro: centralizada, em cima (preferido) ou embaixo; depois as outras se acomodam ao redor
      let single = find((dx, dy) => (dx === 0 ? [[0, -dy]] : null));
      if (!single) single = find((dx, dy) => (dx === 0 ? [[0, dy]] : null));
      if (!single && !symmetricOnly) single = find((dx, dy) => [[-dx, dy]]); // lateral (assimétrico)
      if (!single) return null;
      placed.push(...single);
      left -= 1;
    }
    while (left >= 4) {
      // quatro cantos espelhados (ordem de queda: cima-esq, cima-dir, baixo-dir, baixo-esq)
      const q = find((dx, dy) => (dx > 0 && dy > 0 ? [[-dx, -dy], [dx, -dy], [dx, dy], [-dx, dy]] : null));
      if (!q) return null;
      placed.push(...q);
      left -= 4;
    }
    if (left === 2) {
      const pair = find((dx, dy) => (dx > 0 ? [[-dx, dy === 0 ? 0 : -dy], [dx, dy === 0 ? 0 : -dy]] : null)) ?? find((dx, dy) => (dx > 0 ? [[-dx, dy], [dx, dy]] : null));
      if (!pair) return null;
      placed.push(...pair);
    }
    // Ordem de queda: alterna entre os lados
    return { cardW: cw, font: baseFont * s, positions: placed.slice(0, n).map(([x, y]) => ({ x, y, r: jitter() })) };
  };

  // 1) simétrico, fotos até 25 % menores; 2) qualquer posição livre; 3) sem desviar do título
  for (let s = 1; s >= 0.58; s -= 0.04) {
    const r = attempt(s, true, true);
    if (r) return r;
  }
  for (let s = 1; s >= 0.45; s -= 0.05) {
    const r = attempt(s, false, true);
    if (r) return r;
  }
  return attempt(0.45, false, false) ?? { cardW: baseW * 0.45, font: baseFont * 0.45, positions: [] };
}

/** Caixas (na tela) do que não pode ficar coberto: autor, arabescos, título, subtítulo e botão Pular. */
function obstacleBoxes(root: HTMLElement): Box[] {
  const out: Box[] = [];
  root.querySelectorAll('.intro-author, .intro-flourish, .intro-title, .intro-sub, .intro-skip').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width && r.height) out.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  });
  return out;
}

/** Poeirinha que sobe quando a foto toca a mesa. */
function puff(root: HTMLElement, card: HTMLElement) {
  const r = card.getBoundingClientRect();
  for (let k = 0; k < 10; k++) {
    const s = document.createElement('span');
    s.className = 'intro-puff';
    s.style.left = `${r.left + r.width * (0.1 + Math.random() * 0.8)}px`;
    s.style.top = `${r.bottom - 6}px`;
    root.appendChild(s);
    gsap.fromTo(
      s,
      { opacity: 0.8, scale: 0.4 },
      {
        x: (Math.random() - 0.5) * 80,
        y: -10 - Math.random() * 30,
        scale: 1.4 + Math.random(),
        opacity: 0,
        duration: 1 + Math.random() * 0.6,
        ease: 'power2.out',
        onComplete: () => s.remove(),
      },
    );
  }
}

const GLOW = 'drop-shadow(0 0 14px rgba(232, 196, 120, 0.35))';

export function Intro({ reducedMotion, onDone }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLButtonElement>(null);
  const ready = useAllReady();
  const [opened, setOpened] = useState(false);
  const [minPassed, setMinPassed] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const exiting = useRef(false);
  const { members, site } = content;
  const letters = Array.from(site.bookTitle);

  // Poeira dourada: posições fixas por montagem
  const motes = useMemo(
    () =>
      Array.from({ length: 34 }, () => ({
        left: `${15 + Math.random() * 70}%`,
        top: `${10 + Math.random() * 85}%`,
        size: 1.5 + Math.random() * 3,
        dur: 9 + Math.random() * 12,
        delay: -Math.random() * 20,
      })),
    [],
  );

  /* Romper o lacre: tela cheia + início da abertura */
  const openSeal = () => {
    if (opened) return;
    enterFullscreen();
    const seal = sealRef.current;
    if (!seal || reducedMotion) return setOpened(true);
    gsap
      .timeline({ onComplete: () => setOpened(true) })
      .to(seal, { scale: 0.9, duration: 0.12, ease: 'power2.in' })
      .to(seal, { scale: 1.5, opacity: 0, filter: 'blur(6px)', duration: 0.55, ease: 'power3.out' })
      .to('.intro-gate-text', { opacity: 0, y: 10, duration: 0.4 }, '<')
      .fromTo('.intro-flash', { opacity: 0 }, { opacity: 0.85, duration: 0.18, yoyo: true, repeat: 1 }, '<0.05');
  };

  /* Selo pulsando enquanto espera o toque */
  useEffect(() => {
    if (opened || reducedMotion) return;
    const tw = gsap.to('.seal-ring', { scale: 1.35, opacity: 0, duration: 1.8, repeat: -1, ease: 'power1.out', stagger: 0.9 });
    return () => void tw.kill();
  }, [opened, reducedMotion]);

  /* Timeline da abertura (depois do lacre) */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !opened) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.intro-card');
      const lets = gsap.utils.toArray<HTMLElement>('.intro-letter');
      const w = window.innerWidth;
      const h = window.innerHeight;
      const lay = layoutCards(cards.length, w, h, obstacleBoxes(root));
      const ring = lay.positions;
      const tl = gsap.timeline({ onComplete: () => setAnimDone(true) });
      tlRef.current = tl;
      // Tamanho das fotos (encolhem com mais de 4) e centralização no ponto (0,0)
      cards.forEach((c) => {
        c.style.setProperty('--card-w', `${lay.cardW}px`);
        c.style.fontSize = `${lay.font}px`;
      });
      gsap.set(cards, { xPercent: -50, yPercent: -50 });

      if (reducedMotion) {
        // Movimento reduzido: só fade, sem queda
        cards.forEach((c, i) => gsap.set(c, { x: ring[i].x, y: ring[i].y, rotation: ring[i].r, opacity: 0 }));
        tl.to('.intro-light', { opacity: 1, duration: 0.5 })
          .to(cards, { opacity: 1, duration: 0.6, stagger: 0.1 })
          .to(['.intro-title', '.intro-author', '.intro-flourish', '.intro-sub'], { opacity: 1, duration: 0.6 })
          .set(lets, { opacity: 1 }, '<');
        return;
      }

      // 1. Faixas de cinema + holofote acendendo
      tl.fromTo('.intro-bar', { scaleY: 0 }, { scaleY: 1, duration: 0.9, ease: 'power3.out' }, 0)
        .fromTo('.intro-light', { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 1.6, ease: 'power2.out' }, 0.1)
        .fromTo('.intro-dust', { opacity: 0 }, { opacity: 1, duration: 2 }, 0.4);

      // 2. Fotos caindo: cada uma ~0,4 s depois da anterior
      cards.forEach((card, i) => {
        const startRot = (Math.random() - 0.5) * 50;
        const landRot = (Math.random() - 0.5) * 14;
        const landX = (Math.random() - 0.5) * 60;
        const landY = (Math.random() - 0.5) * 30;
        const t = 0.7 + i * 0.4;
        gsap.set(card, { x: landX, y: -h * 0.75 - 260, rotation: startRot, opacity: 1 });
        tl.to(card, { y: landY, duration: 1.15, ease: 'bounce.out' }, t) // aceleração + quique
          .to(card, { rotation: landRot, duration: 1.9, ease: 'elastic.out(1, 0.35)' }, t + 0.15) // balanço
          .call(() => puff(root, card), undefined, t + 0.42); // 1º toque na mesa (bounce.out ≈ 36%)
      });
      const landed = 0.7 + Math.max(0, cards.length - 1) * 0.4 + 1.15;

      // Espalham-se levemente sobre a mesa
      cards.forEach((card, i) => {
        tl.to(card, { x: ring[i].x, y: ring[i].y, rotation: ring[i].r, duration: 1.1, ease: 'power3.out' }, landed + 0.1 + i * 0.05);
      });

      // 3. Autor, arabescos se desenhando, título em folha de ouro
      const tT = landed + 0.7;
      tl.fromTo('.intro-author', { opacity: 0, letterSpacing: '0.1em' }, { opacity: 1, letterSpacing: '0.42em', duration: 1.4, ease: 'power2.out' }, tT - 0.3)
        .set('.intro-flourish', { opacity: 1 }, tT)
        .fromTo('.intro-flourish path', { strokeDashoffset: 420 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, tT)
        .set('.intro-title', { opacity: 1 }, tT)
        .fromTo(
          lets,
          { opacity: 0, scale: 1.7, y: -14, filter: `blur(8px) brightness(1.6) ${GLOW}` },
          { opacity: 1, scale: 1, y: 0, filter: `blur(0px) brightness(1) ${GLOW}`, duration: 0.75, ease: 'back.out(1.8)', stagger: 0.065 },
          tT + 0.1,
        )
        // Brilho percorrendo as letras (efeito folha de ouro)
        .to(lets, { filter: `blur(0px) brightness(1.9) ${GLOW}`, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.045 }, tT + 1.3)
        .fromTo('.intro-sub', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, tT + 1.1);
    }, root);
    return () => ctx.revert();
  }, [opened, reducedMotion]);

  /* Tempo mínimo (conta a partir do lacre) */
  useEffect(() => {
    if (!opened) return;
    const id = window.setTimeout(() => setMinPassed(true), reducedMotion ? MIN_MS_REDUCED : MIN_MS);
    return () => window.clearTimeout(id);
  }, [opened, reducedMotion]);

  const skip = () => {
    tlRef.current?.progress(1);
    setAnimDone(true);
    setMinPassed(true);
  };

  /* 4. Saída: clarão dourado, faixas recolhem, tudo some suavemente */
  useEffect(() => {
    if (!ready || !minPassed || !animDone || exiting.current) return;
    exiting.current = true;
    const root = rootRef.current;
    if (reducedMotion) {
      gsap.to(root, { opacity: 0, duration: 0.4, onComplete: onDone });
      return;
    }
    gsap
      .timeline({ onComplete: onDone })
      .to('.intro-center', { scale: 1.06, duration: 1.2, ease: 'power1.in' }, 0)
      .to('.intro-flash', { opacity: 0.55, duration: 0.5, ease: 'power2.in' }, 0.5)
      .to('.intro-bar', { scaleY: 0, duration: 0.8, ease: 'power3.in' }, 0.6)
      .to(root, { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, 0.9);
  }, [ready, minPassed, animDone, reducedMotion, onDone]);

  const waiting = opened && animDone && minPassed && !ready;

  return (
    <div className={`intro${opened ? ' is-open' : ''}`} ref={rootRef} role="dialog" aria-label={`Abertura: ${site.bookTitle}`}>
      {/* Mesa escura + holofote */}
      <div className="intro-light" aria-hidden="true" />
      <div className="intro-dust" aria-hidden="true">
        {motes.map((m, i) => (
          <span
            key={i}
            style={{ left: m.left, top: m.top, width: m.size, height: m.size, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }}
          />
        ))}
      </div>

      <div className="intro-cards" aria-hidden="true">
        {members.map((m) => (
          <figure className="intro-card polaroid" key={m.id}>
            <img src={m.photo} alt="" onError={onImgError} />
            <figcaption>{m.name}</figcaption>
          </figure>
        ))}
      </div>

      <div className="intro-center">
        <p className="intro-author">{site.bookAuthor}</p>
        <Flourish className="intro-flourish" />
        <h1 className="intro-title" aria-label={site.bookTitle}>
          {letters.map((ch, i) => (
            <span
              className="intro-letter"
              aria-hidden="true"
              key={i}
              style={{ '--i': i, '--n': Math.max(2, letters.length) } as React.CSSProperties}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h1>
        <Flourish className="intro-flourish flip" />
        <p className="intro-sub">{site.subtitle}</p>
      </div>

      {/* Selo de cera: o toque que abre (e entra em tela cheia) */}
      {!opened && (
        <div className="intro-gate">
          <p className="intro-gate-text intro-gate-top">{site.bookAuthor}</p>
          <button type="button" className="seal" ref={sealRef} onClick={openSeal} aria-label="Romper o lacre e abrir o livro em tela cheia">
            <span className="seal-ring" aria-hidden="true" />
            <span className="seal-ring" aria-hidden="true" />
            <span className="seal-mono" aria-hidden="true">QB</span>
          </button>
          <p className="intro-gate-text">Toque no selo para abrir o livro</p>
          <p className="intro-gate-text intro-gate-hint">a experiência abre em tela cheia</p>
        </div>
      )}

      {/* Faixas de cinema e clarão */}
      <div className="intro-bar top" aria-hidden="true" />
      <div className="intro-bar bottom" aria-hidden="true" />
      <div className="intro-flash" aria-hidden="true" />

      <p className={`intro-wait${waiting ? ' is-on' : ''}`} aria-live="polite">
        {waiting ? 'Preparando o livro…' : ''}
      </p>

      {opened && (
        <button type="button" className="intro-skip" onClick={skip}>
          Pular
        </button>
      )}
    </div>
  );
}
