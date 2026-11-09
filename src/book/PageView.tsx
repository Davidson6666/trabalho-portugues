import { createContext, createElement, memo, useContext, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { blockNode, type Node } from './blocks';
import type { Page } from './paginate';
import type { Fixed } from './structure';
import { content, PLACEHOLDER_IMG } from '../lib/content';

/**
 * Medidas da página atual, fornecidas pelo Book: `budget` = altura útil da
 * página em "em" (unidades da fonte do texto). Páginas fixas (créditos) usam
 * isso para se ajustar sem rolagem.
 */
export const PageMetrics = createContext({ budget: 99 });

/** Imagem que falhou vira o placeholder (sem quebrar o layout). */
export function onImgError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.src.endsWith(PLACEHOLDER_IMG)) img.src = PLACEHOLDER_IMG;
}

/** Renderiza a mesma árvore usada na medição (ver blocks.ts). */
function NodeView({ n }: { n: Node }): ReactNode {
  const props: Record<string, unknown> = { className: n.cls, ...n.attrs };
  if (n.tag === 'img') props.onError = onImgError;
  const children = n.text != null ? n.text : n.children?.map((c, i) => <NodeView key={i} n={c} />);
  return createElement(n.tag, props, children);
}

function TitlePage() {
  const { site, members } = content;
  return (
    <div className="fx-title">
      <p className="fx-title-author">{site.bookAuthor}</p>
      <h1 className="fx-title-name">{site.bookTitle}</h1>
      <Flourish />
      <p className="fx-title-theme">{site.subtitle}</p>
      <div className="fx-title-group">
        <p className="fx-small-caps">{site.groupName}</p>
        <ul>
          {members.map((m) => (
            <li key={m.id}>{m.name}</li>
          ))}
        </ul>
      </div>
      <p className="fx-title-foot">
        {[site.school, site.year].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

/** Vinheta de época (arabesco simétrico) desenhada em SVG. */
export function Flourish({ className = '' }: { className?: string }) {
  return (
    <svg className={`flourish ${className}`} viewBox="0 0 240 40" aria-hidden="true">
      <path
        d="M120 20c-10-14-26-14-30-4-3 8 6 13 12 9 5-3 2-9-3-8M120 20c10-14 26-14 30-4 3 8-6 13-12 9-5-3-2-9 3-8M120 20c-10 14-26 14-30 4M120 20c10 14 26 14 30 4M88 20H14M152 20h74M14 20c-6 0-8-5-4-7M226 20c6 0 8-5 4-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="120" cy="20" r="2.6" fill="currentColor" />
    </svg>
  );
}

function Divider({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="fx-divider">
      <span className="fx-divider-orn" aria-hidden="true">❧</span>
      <h2>{title}</h2>
      <Flourish />
      <p>{subtitle}</p>
    </div>
  );
}

/**
 * Moldura do sumário: filete duplo dourado com cantoneiras ornamentais.
 * Fica na margem da página (posição absoluta), então não altera a paginação.
 */
function TocFrame() {
  const corner = (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M2 38V8a6 6 0 0 1 6-6h30M8 38V14a6 6 0 0 1 6-6h24M14 20c0-4 3-6 6-6M20 14c-5 0-6-6-1-7 3 0 4 3 2 5M14 20c0 5-6 6-7 1 0-3 3-4 5-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="14" cy="14" r="1.6" fill="currentColor" />
    </svg>
  );
  return (
    <div className="toc-frame" aria-hidden="true">
      <span className="toc-corner tl">{corner}</span>
      <span className="toc-corner tr">{corner}</span>
      <span className="toc-corner bl">{corner}</span>
      <span className="toc-corner br">{corner}</span>
    </div>
  );
}

/** Número pseudoaleatório estável a partir de um texto (mesma página = mesmas manchas). */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/** Manchas leves de envelhecimento (foxing), diferentes em cada página. */
function agingStyle(key: string): CSSProperties {
  const r = (n: number) => hash(key + n);
  return {
    '--fx1': `${10 + r(1) * 80}%`,
    '--fy1': `${10 + r(2) * 80}%`,
    '--fx2': `${10 + r(3) * 80}%`,
    '--fy2': `${10 + r(4) * 80}%`,
    '--fsz': `${30 + r(5) * 60}px`,
  } as CSSProperties;
}

function MemberPage({ fixed }: { fixed: Extract<Fixed, { kind: 'member' }> }) {
  const m = fixed.member;
  const tilt = fixed.index % 2 === 0 ? -2 : 2;
  return (
    <article className="fx-member">
      <figure className="polaroid" style={{ transform: `rotate(${tilt}deg)` }}>
        <img src={m.photo} alt={`Foto de ${m.name}`} onError={onImgError} />
        <figcaption>{m.name}</figcaption>
      </figure>
      <h2 className="fx-member-name">{m.name}</h2>
      {m.role && <p className="fx-member-role">{m.role}</p>}
      <div className="fx-rule" aria-hidden="true" />
      <p className="fx-member-bio">{m.bio || 'Bio em breve.'}</p>
    </article>
  );
}

function Credits({ onCloseBook }: { onCloseBook: () => void }) {
  const { site, members } = content;
  const { budget } = useContext(PageMetrics);
  const cols2 = members.length >= 5;
  const rows = cols2 ? Math.ceil(members.length / 2) : members.length;
  // Altura que o conteúdo ocupa (em "em"): cabeçalho/rodapé fixos + ~2,6 por linha de nomes.
  // Se a página tiver menos espaço que isso, a fonte diminui na proporção (mínimo 50 %).
  const need = 21 + 2.6 * rows;
  const scale = Math.max(0.5, Math.min(1, budget / need));
  return (
    <div className="fx-credits" style={{ '--cs': scale } as CSSProperties}>
      <p className="fx-small-caps">Fim</p>
      <h2>Créditos</h2>
      <Flourish />
      <p className="fx-credits-group">{site.groupName}</p>
      <ul className={cols2 ? 'cols2' : undefined}>
        {members.map((m) => (
          <li key={m.id}>
            <span>{m.name}</span>
            {m.role && <em>{m.role}</em>}
          </li>
        ))}
      </ul>
      <p className="fx-credits-ref">
        Obra de referência: <cite>{site.bookTitle}</cite>, de {site.bookAuthor} (1891).
      </p>
      <p className="fx-credits-ref">{[site.school, site.year].filter(Boolean).join(' · ')}</p>
      <button type="button" className="btn btn-ink" onClick={onCloseBook}>
        Fechar o livro
      </button>
    </div>
  );
}

interface Props {
  page: Page | null;
  number: number;
  side: 'recto' | 'verso';
  pageOf: (sectionId: string) => string;
  onCloseBook: () => void;
}

/** Uma página do livro. `page = null` mostra o verso da guarda (papel liso). */
export const PageView = memo(function PageView({ page, number, side, pageOf, onCloseBook }: Props) {
  if (!page) return <div className={`page ${side} page-blank`} style={agingStyle(`blank${number}`)} />;
  const f = page.fixed;
  const isToc = page.sectionId === 'sumario';
  return (
    <div className={`page ${side}${f ? ` page-${f.kind}` : ''}${isToc ? ' page-toc' : ''}`} data-key={page.key} style={agingStyle(page.key)}>
      {isToc && <TocFrame />}
      <div className="page-inner">
        {page.blocks?.map((b, i) => <NodeView key={i} n={blockNode(b, pageOf)} />)}
        {f?.kind === 'titlepage' && <TitlePage />}
        {f?.kind === 'divider' && <Divider title={f.title} subtitle={f.subtitle} />}
        {f?.kind === 'member' && <MemberPage fixed={f} />}
        {f?.kind === 'credits' && <Credits onCloseBook={onCloseBook} />}
      </div>
      {f?.kind !== 'titlepage' && <div className="page-foot">{number}</div>}
    </div>
  );
});
