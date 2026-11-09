/**
 * Blocos de conteúdo de uma página "corrida" (texto que flui entre páginas).
 *
 * Cada bloco vira uma árvore simples (`Node`). A MESMA árvore é usada para:
 *  - medir no DOM escondido durante a paginação (buildDom), e
 *  - renderizar no React (NodeView, em PageView.tsx).
 * Assim o que foi medido é exatamente o que aparece na tela.
 */
import type { Photo } from '../lib/content';

export type Block =
  | { t: 'heading'; kicker?: string; title: string; byline?: string }
  | { t: 'running'; text: string }
  | { t: 'p'; text: string; cont?: boolean; split?: boolean }
  | { t: 'figs'; items: Photo[] }
  | { t: 'toc'; label: string; target: string; level: 0 | 1 }
  | { t: 'empty' };

export interface Node {
  tag: string;
  cls?: string;
  text?: string;
  attrs?: Record<string, string>;
  children?: Node[];
}

/** `pageOf` devolve o número da página de uma seção (usado só no sumário). */
export function blockNode(b: Block, pageOf: (sectionId: string) => string): Node {
  switch (b.t) {
    case 'heading': {
      const children: Node[] = [];
      if (b.kicker) children.push({ tag: 'p', cls: 'b-kicker', text: b.kicker });
      children.push({ tag: 'h2', cls: 'b-title', text: b.title });
      if (b.byline) children.push({ tag: 'p', cls: 'b-byline', text: b.byline });
      children.push({ tag: 'div', cls: 'b-orn', text: '❦', attrs: { 'aria-hidden': 'true' } });
      return { tag: 'header', cls: 'b-heading', children };
    }
    case 'running':
      return { tag: 'p', cls: 'b-running', text: b.text };
    case 'p':
      return { tag: 'p', cls: `b-p${b.cont ? ' p-cont' : ''}${b.split ? ' p-split' : ''}`, text: b.text };
    case 'figs':
      return {
        tag: 'div',
        cls: `b-figs n${b.items.length}`,
        children: b.items.map((ph) => ({
          tag: 'figure',
          cls: 'b-fig',
          children: [
            { tag: 'div', cls: 'b-fig-frame', children: [{ tag: 'img', attrs: { src: ph.src, alt: ph.caption || 'Foto do autor', loading: 'lazy' } }] },
            ...(ph.caption ? [{ tag: 'figcaption', text: ph.caption }] : []),
          ],
        })),
      };
    case 'toc':
      return {
        tag: 'button',
        cls: `b-toc lvl${b.level}`,
        attrs: { type: 'button', 'data-toc-target': b.target },
        children: [
          { tag: 'span', cls: 'b-toc-label', text: b.label },
          { tag: 'span', cls: 'b-toc-dots', attrs: { 'aria-hidden': 'true' } },
          { tag: 'span', cls: 'b-toc-num', text: pageOf(b.target) },
        ],
      };
    case 'empty':
      return {
        tag: 'div',
        cls: 'b-empty',
        children: [
          { tag: 'span', cls: 'b-empty-orn', text: '✒', attrs: { 'aria-hidden': 'true' } },
          { tag: 'p', text: 'Conteúdo em breve.' },
        ],
      };
  }
}

/** Constrói o DOM real de um nó (usado só na medição). */
export function buildDom(n: Node): HTMLElement {
  const el = document.createElement(n.tag);
  if (n.cls) el.className = n.cls;
  if (n.attrs) for (const [k, v] of Object.entries(n.attrs)) el.setAttribute(k, v);
  if (n.text != null) el.textContent = n.text;
  n.children?.forEach((c) => el.appendChild(buildDom(c)));
  return el;
}
