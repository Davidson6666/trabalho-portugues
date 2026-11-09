/**
 * Paginação automática.
 *
 * Recebe as seções e um elemento de medição (uma página escondida com o mesmo
 * tamanho e CSS da página real). Vai colocando bloco por bloco; quando
 * transborda, passa para a próxima página. Parágrafos longos são cortados
 * palavra por palavra (busca binária), então nenhum texto é cortado ou perdido.
 */
import { blockNode, buildDom, type Block } from './blocks';
import type { Fixed, Section } from './structure';

export interface Page {
  /** Chave estável: "<secao>:<n-esima pagina da secao>" */
  key: string;
  sectionId: string;
  /** Posição da página dentro da seção (0 = primeira). */
  part: number;
  blocks?: Block[];
  fixed?: Fixed;
}

const PLACEHOLDER_NUM = () => '000';

export function paginate(sections: Section[], inner: HTMLElement): Page[] {
  const pages: Page[] = [];
  const fits = () => inner.scrollHeight <= inner.clientHeight + 1;

  for (const s of sections) {
    if (s.fixed || !s.flow) {
      pages.push({ key: `${s.id}:0`, sectionId: s.id, part: 0, fixed: s.fixed });
      continue;
    }

    let cur: Block[] = [];
    let part = 0;
    inner.innerHTML = '';

    const hasBody = () => cur.some((b) => b.t !== 'running');
    const flush = () => {
      pages.push({ key: `${s.id}:${part}`, sectionId: s.id, part, blocks: cur });
      part++;
      cur = [];
      inner.innerHTML = '';
      // Páginas de continuação ganham um cabeçalho discreto com o título
      if (s.running) tryAdd({ t: 'running', text: `${s.running} (continuação)` });
    };
    const tryAdd = (b: Block): boolean => {
      const el = buildDom(blockNode(b, PLACEHOLDER_NUM));
      inner.appendChild(el);
      if (fits()) {
        cur.push(b);
        return true;
      }
      inner.removeChild(el);
      return false;
    };

    const queue = [...s.flow];
    let guard = 0;
    while (queue.length && guard++ < 5000) {
      const b = queue.shift()!;
      if (tryAdd(b)) continue;

      if (b.t === 'p') {
        // Corta o parágrafo: maior número de palavras que ainda cabe
        const words = b.text.split(/\s+/);
        const el = buildDom(blockNode({ ...b, split: true }, PLACEHOLDER_NUM));
        inner.appendChild(el);
        let lo = 0;
        let hi = words.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          el.textContent = words.slice(0, mid).join(' ');
          if (fits()) lo = mid;
          else hi = mid - 1;
        }
        inner.removeChild(el);
        // Evita deixar só 1–2 palavras soltas no fim da página
        if (lo >= 3) {
          cur.push({ ...b, text: words.slice(0, lo).join(' '), split: true });
          queue.unshift({ t: 'p', text: words.slice(lo).join(' '), cont: true });
          flush();
          continue;
        }
      }

      if (hasBody()) {
        queue.unshift(b);
        flush();
      } else {
        // Página vazia e mesmo assim não cabe (ex.: tela minúscula): força
        cur.push(b);
        flush();
      }
    }
    if (hasBody() || part === 0) pages.push({ key: `${s.id}:${part}`, sectionId: s.id, part, blocks: cur });
  }

  inner.innerHTML = '';
  return pages;
}
