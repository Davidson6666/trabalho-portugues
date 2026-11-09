/**
 * O livro aberto, em HTML/CSS (texto nítido, selecionável e acessível).
 *
 * A virada de página é feita pelo StPageFlip (biblioteca "page-flip"): o canto
 * da folha dobra na diagonal e acompanha o mouse/dedo, com sombras dinâmicas.
 *
 * Integração com o React: o StPageFlip MOVE os elementos das páginas para
 * dentro da própria estrutura. Por isso cada página é um <div> criado aqui
 * (não pelo React), e o conteúdo é renderizado dentro dele com createPortal.
 * Assim o React nunca perde a referência dos nós que a biblioteca moveu.
 *
 * Páginas para o StPageFlip (modo duplo): [guarda, p1, p2, ..., pN, (guarda)]
 * A guarda inicial faz a folha de rosto abrir à direita, como num livro.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PageFlip } from 'page-flip/dist/js/page-flip.module.js';
import { content } from '../lib/content';
import { buildSections, TOC_ID } from './structure';
import { paginate, type Page } from './paginate';
import { PageView } from './PageView';
import { playPageFlip } from '../lib/sound';
import { save } from '../lib/storage';
import { flipSignal } from '../lib/flipSignal';

export const BOOKMARK_KEY = 'qb:marcador';
export interface Bookmark {
  sectionId: string;
  part: number;
  number: number;
}

interface Layout {
  spread: boolean;
  pageW: number;
  pageH: number;
  fs: number;
}

interface Props {
  visible: boolean;
  startAt: Bookmark | null;
  reducedMotion: boolean;
  /** fromEnd = fechou a partir do fim do livro (fecha pela contracapa e vira). */
  onClose: (fromEnd: boolean) => void;
}

const RATIO = 0.75; // largura / altura da página

/** Ícone de traço fino (estilo gravura). */
function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Book({ visible, startAt, reducedMotion, onClose }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const pfRef = useRef<PageFlip | null>(null);

  const sections = useMemo(() => buildSections(content), []);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [items, setItems] = useState<HTMLDivElement[]>([]);
  const [cur, setCur] = useState(0); // índice atual no StPageFlip

  const anchorRef = useRef<string | null>(startAt ? `${startAt.sectionId}:${startAt.part}` : null);
  const anchorSectionRef = useRef<string | null>(startAt?.sectionId ?? null);
  const stateRef = useRef('read');

  /* ---------- 1. Tamanho da página a partir do espaço disponível ---------- */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let timer = 0;
    const compute = () => {
      const r = stage.getBoundingClientRect();
      const availW = Math.max(240, r.width - 40);
      const availH = Math.max(320, r.height - 22); // espaço para a ponta da fita
      const spread = r.width >= 860 && r.width / Math.max(1, r.height) > 1.05;
      const pageW = Math.floor(spread ? Math.min(availW / 2, availH * RATIO) : Math.min(availW, availH * RATIO));
      const pageH = Math.floor(pageW / RATIO);
      const fs = Math.round(Math.max(13, Math.min(21, pageW / 27)) * 2) / 2;
      setLayout((prev) =>
        prev && prev.spread === spread && prev.pageW === pageW && prev.pageH === pageH && prev.fs === fs
          ? prev
          : { spread, pageW, pageH, fs },
      );
    };
    compute();
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(compute, 150);
    });
    ro.observe(stage);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  /* ---------- 2. Paginação (refeita quando o tamanho muda) ---------- */
  useLayoutEffect(() => {
    if (!layout || !measureRef.current) return;
    setPages(paginate(sections, measureRef.current));
  }, [layout, sections]);

  const spread = layout?.spread ?? false;
  const N = pages.length;
  const offset = spread ? 1 : 0; // guarda inicial no modo duplo

  /** Lista entregue ao StPageFlip: null = papel de guarda. */
  const pfPages = useMemo<(Page | null)[]>(() => {
    if (!N) return [];
    if (!spread) return pages;
    const list: (Page | null)[] = [null, ...pages];
    if (list.length % 2) list.push(null);
    return list;
  }, [pages, spread, N]);
  const T = pfPages.length;
  const lastIdx = spread ? T - 2 : T - 1;

  const toPf = useCallback((idx: number) => idx + offset, [offset]);
  const visibleIdx = useMemo(
    () => (spread ? [cur - 1, cur] : [cur]).filter((i) => i >= 0 && i < N),
    [spread, cur, N],
  );

  /* Número da página de cada seção (usado pelo sumário) */
  const sectionPage = useMemo(() => {
    const m = new Map<string, number>();
    pages.forEach((p, i) => {
      if (!m.has(p.sectionId)) m.set(p.sectionId, i + 1);
    });
    return m;
  }, [pages]);
  const pageOf = useCallback((id: string) => String(sectionPage.get(id) ?? ''), [sectionPage]);

  /* ---------- 3. Cria / atualiza o StPageFlip ---------- */
  // Destruição separada (roda só ao desmontar o livro)
  useEffect(
    () => () => {
      const pf = pfRef.current as unknown as { render?: { render: () => void }; getUI?: () => { destroy: () => void } } | null;
      if (!pf) return;
      // A biblioteca não tem como parar o loop de desenho: neutraliza o trabalho dele
      if (pf.render) pf.render.render = () => undefined;
      try {
        pf.getUI?.().destroy();
      } catch {
        /* já removido */
      }
      pfRef.current = null;
    },
    [],
  );

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !layout || !T) return;

    // Página onde abrir: âncora (marcador / página atual antes do redimensionamento)
    let idx = anchorRef.current ? pages.findIndex((p) => p.key === anchorRef.current) : -1;
    if (idx < 0 && anchorSectionRef.current) idx = pages.findIndex((p) => p.sectionId === anchorSectionRef.current);
    const start = Math.max(0, idx < 0 ? 0 : toPf(idx));

    // Um <div> por página, criado fora do React (o StPageFlip vai movê-los)
    const els = pfPages.map(() => {
      const d = document.createElement('div');
      d.className = 'pf-page';
      return d;
    });

    let pf = pfRef.current;
    if (!pf) {
      pf = new PageFlip(host, {
        width: layout.pageW,
        height: layout.pageH,
        size: 'fixed',
        startPage: start,
        autoSize: false,
        usePortrait: true,
        showCover: false,
        drawShadow: true,
        maxShadowOpacity: 0.6,
        flippingTime: reducedMotion ? 200 : 950,
        mobileScrollSupport: true,
        clickEventForward: true,
        useMouseEvents: true,
        swipeDistance: 30,
        showPageCorners: !reducedMotion,
        disableFlipByClick: false,
        startZIndex: 2,
      });
      pf.loadFromHTML(els);
      pf.on('flip', () => setCur(pfRef.current?.getCurrentPageIndex() ?? 0));
      pf.on('changeState', (e) => {
        const st = e.data as string;
        // Som uma vez por virada; a luz 3D reage enquanto a folha está levantada
        if (st === 'flipping' && stateRef.current !== 'flipping') playPageFlip();
        stateRef.current = st;
        flipSignal.lift = st === 'read' ? 0 : 0.7;
      });
      pfRef.current = pf;
      if (import.meta.env.DEV) (window as unknown as { __pf: PageFlip }).__pf = pf; // depuração
    } else {
      // Novo tamanho de página: atualiza as configurações e recarrega as páginas
      const s = pf.getSettings();
      s.width = layout.pageW;
      s.height = layout.pageH;
      pf.updateFromHtml(els);
      pf.turnToPage(start);
    }
    // O construtor fixa min-width/min-height no host; o tamanho é controlado aqui
    host.style.minWidth = '';
    host.style.minHeight = '';
    pf.update();
    setItems(els);
    setCur(pf.getCurrentPageIndex());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pfPages, layout]);

  /* ---------- 4. Navegação ---------- */
  const busy = () => pfRef.current?.getState() !== 'read';
  /** Botão "Fechar o livro" dos créditos: fecha pelo fim (contracapa) */
  const closeFromEnd = useCallback(() => onClose(true), [onClose]);

  const next = useCallback(() => {
    const pf = pfRef.current;
    if (!pf || busy()) return;
    if (pf.getCurrentPageIndex() >= lastIdx) return onClose(true); // depois dos créditos: fecha o livro
    pf.flipNext('bottom');
  }, [lastIdx, onClose]);

  const prev = useCallback(() => {
    const pf = pfRef.current;
    if (!pf || busy() || pf.getCurrentPageIndex() <= 0) return;
    pf.flipPrev('bottom');
  }, []);

  const goToPf = useCallback(
    (target: number) => {
      const pf = pfRef.current;
      if (!pf || busy()) return;
      target = Math.max(0, Math.min(T - 1, target));
      if (reducedMotion) pf.turnToPage(target);
      else pf.flip(target, 'bottom');
      setCur(pf.getCurrentPageIndex());
    },
    [T, reducedMotion],
  );

  const goToSection = useCallback(
    (id: string) => {
      const idx = pages.findIndex((p) => p.sectionId === id);
      if (idx >= 0) goToPf(toPf(idx));
    },
    [pages, goToPf, toPf],
  );

  /* Teclado: setas, Home e End */
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Home') goToPf(0);
      else if (e.key === 'End') goToPf(T - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, next, prev, goToPf, T]);

  /* Marcador: salva a primeira página visível */
  useEffect(() => {
    if (!N || !visibleIdx.length) return;
    const idx = visibleIdx[0];
    const p = pages[idx];
    if (!p) return;
    anchorRef.current = p.key;
    anchorSectionRef.current = p.sectionId;
    save(BOOKMARK_KEY, { sectionId: p.sectionId, part: p.part, number: idx + 1 } satisfies Bookmark);
  }, [visibleIdx, pages, N]);

  /*
   * Filtro de eventos antes do StPageFlip (fase de captura):
   *  - botões/links (sumário, "Fechar o livro") funcionam normalmente;
   *  - com mouse, só a borda externa inicia a virada: o meio da página fica
   *    livre para selecionar texto;
   *  - toque é tratado aqui: a dobra começa exatamente onde o dedo encostou
   *    (a biblioteca esperava 250 ms e às vezes virava para o lado errado),
   *    um "peteleco" rápido completa a virada e um toque simples vira pelo lado.
   */
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !layout) return;
    const local = (cx: number, cy: number) => {
      const r = host.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    };
    let touch: { x: number; y: number; time: number; folding: boolean; onButton: boolean } | null = null;

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as Element).closest('button, a, input, select')) return e.stopPropagation();
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left;
      const edge = layout.pageW * 0.2;
      if (x > edge && x < r.width - edge) e.stopPropagation();
    };
    const onTouchStart = (e: TouchEvent) => {
      e.stopPropagation(); // a biblioteca não recebe: tratamos abaixo
      const t = e.changedTouches[0];
      // Em botões (sumário etc.) o toque simples vira clique; arrastar continua virando a página
      const onButton = !!(e.target as Element).closest('button, a, input, select');
      touch = { x: t.clientX, y: t.clientY, time: Date.now(), folding: false, onButton };
    };
    const onTouchMove = (e: TouchEvent) => {
      const pf = pfRef.current;
      if (!touch || !pf) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      if (!touch.folding) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) || pf.getState() !== 'read') return;
        touch.folding = true;
        const s = local(touch.x, touch.y);
        pf.startUserTouch(s);
        pf.userMove({ x: s.x + Math.sign(dx) * 8, y: s.y }, true);
      }
      e.preventDefault();
      pf.userMove(local(t.clientX, t.clientY), true);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const pf = pfRef.current;
      if (!touch || !pf) return;
      const t = e.changedTouches[0];
      const p = local(t.clientX, t.clientY);
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      if (touch.folding) {
        // Peteleco (dedo rápido): leva a dobra além da lombada para completar a virada
        const speed = Math.abs(dx) / Math.max(1, Date.now() - touch.time); // px/ms
        const flick = Math.abs(dx) > 40 && speed > 0.3;
        const W = layout.pageW;
        if (flick) pf.userMove({ x: dx < 0 ? -W * 2 : W * 3, y: p.y }, true);
        pf.userStop(p);
      } else if (!touch.onButton && Math.abs(dx) < 10 && Math.abs(dy) < 10 && pf.getState() === 'read') {
        e.preventDefault(); // evita o "clique de mouse" que o navegador gera depois do toque (viraria 2x)
        pf.startUserTouch(p); // toque simples: vira para o lado tocado
        pf.userStop(p);
      }
      touch = null;
    };

    host.addEventListener('mousedown', onMouseDown, true);
    host.addEventListener('touchstart', onTouchStart, true);
    host.addEventListener('touchmove', onTouchMove, { passive: false });
    host.addEventListener('touchend', onTouchEnd);
    host.addEventListener('touchcancel', onTouchEnd);
    return () => {
      host.removeEventListener('mousedown', onMouseDown, true);
      host.removeEventListener('touchstart', onTouchStart, true);
      host.removeEventListener('touchmove', onTouchMove);
      host.removeEventListener('touchend', onTouchEnd);
      host.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [layout]);

  const onBookClick = (e: React.MouseEvent) => {
    const t = (e.target as Element).closest('[data-toc-target]');
    if (t) goToSection(t.getAttribute('data-toc-target')!);
  };

  /* ---------- 5. Indicador e estilos ---------- */
  const indicator = visibleIdx.length ? visibleIdx.map((i) => i + 1).join('–') : '–';
  const tocPage = sectionPage.get(TOC_ID) ?? 2;
  const atEnd = cur >= lastIdx;
  const progress = T > 1 ? cur / (T - 1) : 0;
  const maxStack = Math.min(12, 3 + T * 0.25);

  const bookStyle = layout
    ? ({
        '--page-w': `${layout.pageW}px`,
        '--page-h': `${layout.pageH}px`,
        '--fs': `${layout.fs}px`,
        '--stackL': `${(maxStack * progress).toFixed(1)}px`,
        '--stackR': `${(maxStack * (1 - progress)).toFixed(1)}px`,
        width: spread ? layout.pageW * 2 : layout.pageW,
        height: layout.pageH,
      } as React.CSSProperties)
    : undefined;

  return (
    <section className={`reader${visible ? ' is-visible' : ''}`} aria-label="Livro aberto" aria-hidden={!visible}>
      <div className="stage" ref={stageRef}>
        <div className={`book ${spread ? 'is-spread' : 'is-single'}`} style={bookStyle}>
          {/* Capa dura e espessura das folhas nas laterais */}
          <div className="board" aria-hidden="true" />
          <div className="stack stack-left" aria-hidden="true" />
          <div className="stack stack-right" aria-hidden="true" />

          {/* Área controlada pelo StPageFlip; o conteúdo entra por portal */}
          <div className="pf-host" ref={hostRef} onClick={onBookClick}>
            {items.map((el, i) => {
              const page = pfPages[i];
              const ourIdx = i - offset;
              // Lado no livro: no modo duplo, índice par = esquerda (verso)
              const side = spread && i % 2 === 0 ? 'verso' : 'recto';
              return createPortal(
                page === null || page === undefined ? (
                  <div className={`page ${side} page-endpaper`} aria-hidden="true" />
                ) : (
                  <PageView page={page} number={ourIdx + 1} side={side} pageOf={pageOf} onCloseBook={closeFromEnd} />
                ),
                el,
                `p${i}`,
              );
            })}
          </div>

          {/* Fita marcadora de cetim */}
          <div className="ribbon" aria-hidden="true" title={`Marcador: página ${indicator}`} />

          {/* Página escondida usada só para medir a paginação */}
          <div className="page recto measure" aria-hidden="true">
            <div className="page-inner" ref={measureRef} />
            <div className="page-foot">0</div>
          </div>
        </div>
      </div>

      <nav className="book-nav" aria-label="Navegação do livro">
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => onClose(cur >= lastIdx)} data-tip="Fechar o livro e voltar à capa">
          <Icon d="M4 4.5h6.5a2 2 0 0 1 1.5.7 2 2 0 0 1 1.5-.7H20v14h-6.5a2 2 0 0 0-1.5.7 2 2 0 0 0-1.5-.7H4z M12 5.2v14.2" />
          <span>Capa</span>
        </button>
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => goToSection(TOC_ID)} data-tip={`Ir para o sumário (p. ${tocPage})`}>
          <Icon d="M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01" />
          <span>Sumário</span>
        </button>
        <span className="nav-sep" aria-hidden="true" />
        <button type="button" className="btn btn-round" onClick={prev} disabled={cur <= 0} aria-label="Página anterior" data-tip="Anterior (←)">
          <Icon d="M15 5l-7 7 7 7" />
        </button>
        <span className="page-indicator" aria-live="polite">
          <span className="sr-only">Página </span>
          {indicator} <span aria-hidden="true">/</span>
          <span className="sr-only"> de </span> {N}
        </span>
        <button
          type="button"
          className="btn btn-round"
          onClick={next}
          aria-label={atEnd ? 'Fechar o livro' : 'Próxima página'}
          data-tip={atEnd ? 'Fechar o livro' : 'Próxima (→)'}
        >
          <Icon d="M9 5l7 7-7 7" />
        </button>
      </nav>
    </section>
  );
}
