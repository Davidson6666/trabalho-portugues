/**
 * Carregamento e normalização do conteúdo (src/content/*.json).
 *
 * Os JSON são importados de forma estática (ficam no bundle), então estão
 * prontos assim que o app sobe. Aqui cada campo recebe um valor padrão, para
 * que um campo faltando ou vazio vire um placeholder em vez de quebrar o site.
 */
import siteRaw from '../content/site.json';
import frontRaw from '../content/front.json';
import membersRaw from '../content/members.json';
import textsRaw from '../content/texts.json';

export const PLACEHOLDER_IMG = '/images/placeholder-member.svg';

export interface SiteInfo {
  bookTitle: string;
  bookAuthor: string;
  theme: string;
  subtitle: string;
  groupName: string;
  school: string;
  year: string;
}

export interface FrontPage {
  title: string;
  paragraphs: string[];
}

export interface Photo {
  src: string;
  caption: string;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
}

export interface Text {
  id: string;
  order: number;
  title: string;
  genre: string;
  author: string;
  authorName: string;
  paragraphs: string[];
}

export interface Content {
  site: SiteInfo;
  aboutBook: FrontPage;
  aboutAuthor: FrontPage;
  authorPhotos: Photo[];
  members: Member[];
  texts: Text[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : fallback;

const paragraphs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((p): p is string => typeof p === 'string' && p.trim() !== '').map((p) => p.trim()) : [];

function normalizeFront(raw: Loose, fallbackTitle: string): FrontPage {
  return { title: str(raw?.title, fallbackTitle), paragraphs: paragraphs(raw?.paragraphs) };
}

function loadContent(): Content {
  const s = siteRaw as Loose;
  const theme = str(s.theme, 'Tema a definir');
  const site: SiteInfo = {
    bookTitle: str(s.bookTitle, 'Quincas Borba'),
    bookAuthor: str(s.bookAuthor, 'Machado de Assis'),
    theme,
    subtitle: str(s.subtitle, 'Trabalho de Língua Portuguesa · {tema}').replace('{tema}', theme),
    groupName: str(s.groupName, 'Nosso grupo'),
    school: str(s.school),
    year: str(s.year),
  };

  const f = frontRaw as Loose;
  const authorPhotos: Photo[] = (Array.isArray(f.author_photos) ? f.author_photos : [])
    .slice(0, 3)
    .map((p: Loose) => ({ src: str(p?.src, PLACEHOLDER_IMG), caption: str(p?.caption) }));

  const members: Member[] = (Array.isArray(membersRaw) ? (membersRaw as Loose[]) : []).map((m, i) => ({
    id: str(m?.id, `membro-${i + 1}`),
    name: str(m?.name, `Integrante ${i + 1}`),
    role: str(m?.role),
    bio: str(m?.bio),
    photo: str(m?.photo, PLACEHOLDER_IMG),
  }));

  const nameOf = (id: string) => {
    if (id === 'grupo') return `Texto coletivo · ${site.groupName}`;
    return members.find((m) => m.id === id)?.name ?? 'Autor a definir';
  };

  const texts: Text[] = (Array.isArray(textsRaw) ? (textsRaw as Loose[]) : [])
    .map((t, i) => ({
      id: str(t?.id, `texto-${i + 1}`),
      order: typeof t?.order === 'number' ? t.order : i + 1,
      title: str(t?.title, 'Texto sem título'),
      genre: str(t?.genre),
      author: str(t?.author),
      authorName: nameOf(str(t?.author)),
      paragraphs: paragraphs(t?.paragraphs),
    }))
    .sort((a, b) => a.order - b.order);

  return {
    site,
    aboutBook: normalizeFront(f.about_book, 'Sobre o livro'),
    aboutAuthor: normalizeFront(f.about_author, 'Sobre o autor'),
    authorPhotos,
    members,
    texts,
  };
}

export const content: Content = loadContent();

/** Todas as imagens que devem estar carregadas antes de a abertura terminar. */
export function allImageUrls(c: Content): string[] {
  return Array.from(new Set([PLACEHOLDER_IMG, ...c.members.map((m) => m.photo), ...c.authorPhotos.map((p) => p.src)]));
}
