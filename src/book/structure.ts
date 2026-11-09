/**
 * Ordem das seções do livro, montada a partir do conteúdo.
 *
 * Folha de rosto → Sumário → Sobre o livro → Sobre o autor →
 * Integrantes (abertura + 1 página por membro) → Textos (abertura + textos) → Créditos
 *
 * Seções com `toc` aparecem no sumário. Seções com `flow` são paginadas
 * automaticamente; seções com `fixed` ocupam exatamente uma página.
 */
import type { Content, Member } from '../lib/content';
import type { Block } from './blocks';

export type Fixed =
  | { kind: 'titlepage' }
  | { kind: 'divider'; title: string; subtitle: string }
  | { kind: 'member'; member: Member; index: number }
  | { kind: 'credits' };

export interface Section {
  id: string;
  toc?: { label: string; level: 0 | 1 };
  /** Título curto repetido no topo das páginas de continuação. */
  running?: string;
  flow?: Block[];
  fixed?: Fixed;
}

export const TOC_ID = 'sumario';

function flowOf(paragraphs: string[]): Block[] {
  return paragraphs.length ? paragraphs.map((text) => ({ t: 'p', text }) as Block) : [{ t: 'empty' }];
}

export function buildSections(c: Content): Section[] {
  const body: Section[] = [];

  body.push({
    id: 'sobre-o-livro',
    toc: { label: c.aboutBook.title, level: 0 },
    running: c.aboutBook.title,
    flow: [{ t: 'heading', kicker: 'A obra', title: c.aboutBook.title }, ...flowOf(c.aboutBook.paragraphs)],
  });

  body.push({
    id: 'sobre-o-autor',
    toc: { label: c.aboutAuthor.title, level: 0 },
    running: c.aboutAuthor.title,
    flow: [
      { t: 'heading', kicker: 'O autor', title: c.aboutAuthor.title },
      ...(c.authorPhotos.length ? [{ t: 'figs', items: c.authorPhotos } as Block] : []),
      ...flowOf(c.aboutAuthor.paragraphs),
    ],
  });

  body.push({
    id: 'integrantes',
    toc: { label: 'Integrantes', level: 0 },
    fixed: {
      kind: 'divider',
      title: 'Integrantes',
      subtitle: c.members.length ? `${c.members.length} autores, um livro` : 'Integrantes a definir',
    },
  });
  c.members.forEach((m, i) =>
    body.push({ id: `membro:${m.id}`, toc: { label: m.name, level: 1 }, fixed: { kind: 'member', member: m, index: i } }),
  );

  body.push({
    id: 'textos',
    toc: { label: 'Textos', level: 0 },
    fixed: { kind: 'divider', title: 'Textos', subtitle: 'Produções do grupo' },
  });
  c.texts.forEach((t) =>
    body.push({
      id: `texto:${t.id}`,
      toc: { label: t.genre ? `${t.title} — ${t.genre}` : t.title, level: 1 },
      running: t.title,
      flow: [{ t: 'heading', kicker: t.genre, title: t.title, byline: t.authorName }, ...flowOf(t.paragraphs)],
    }),
  );

  body.push({ id: 'creditos', toc: { label: 'Créditos', level: 0 }, fixed: { kind: 'credits' } });

  // O sumário é gerado a partir das próprias seções: nada de número à mão.
  const toc: Section = {
    id: TOC_ID,
    running: 'Sumário',
    flow: [
      { t: 'heading', kicker: 'Índice das matérias', title: 'Sumário' },
      ...body.filter((s) => s.toc).map((s) => ({ t: 'toc', label: s.toc!.label, target: s.id, level: s.toc!.level }) as Block),
    ],
  };

  return [{ id: 'folha-de-rosto', fixed: { kind: 'titlepage' } }, toc, ...body];
}
