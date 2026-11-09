# CLAUDE.md — Trabalho de Português

Projeto: trabalho de português (site/página web). Pasta ainda vazia; a stack será definida ao iniciar.

## Regras gerais

- Responder ao usuário em português.
- Antes de qualquer trabalho criativo (nova página, componente, funcionalidade), usar `superpowers:brainstorming`.
- Antes de escrever HTML/CSS/JS de cliente, consultar `modern-web-guidance:modern-web-guidance`.
- Se uma skill se aplica à tarefa, invocá-la antes de agir.
- Texto do trabalho (conteúdo em português): revisar com `writing-guidelines`.

## Permissão de pesquisa na internet

O usuário autorizou, de forma permanente, pesquisar na internet sempre que for útil, sem pedir confirmação:

- fotos e imagens de referência;
- enciclopédias e fontes de conteúdo (textos, fatos, autores, obras);
- efeitos visuais, animações, paletas de cores, tipografia;
- modelos 3D.

Ao pesquisar, apresentar ao usuário sugestões de como ficará no projeto (descrição, cores, layout) antes de aplicar. Citar a fonte e verificar a licença de uso de imagens, fontes e modelos 3D.

## Superpowers e claude-mem (uso obrigatório)

- **superpowers**: usar em todo o projeto. Começar por `superpowers:using-superpowers`; antes de criar algo, `superpowers:brainstorming`; para planejar, `superpowers:writing-plans`; para implementar, `superpowers:test-driven-development`; antes de concluir, `superpowers:verification-before-completion`.
- **claude-mem**: manter a memória atualizada. Consultar com `claude-mem:mem-search` ao retomar o trabalho e registrar decisões, escolhas de design e preferências do usuário. Para planos de várias etapas: `claude-mem:make-plan` e depois `claude-mem:do`.

## Skills de Web Design

| Skill | Quando usar |
|---|---|
| `design-taste-frontend` | Padrão para landing pages, portfólios e redesigns sem aparência genérica de IA |
| `design-taste-frontend-v1` | Só se precisar do comportamento exato da v1 |
| `high-end-visual-design` | Visual de agência premium: fontes, espaçamento, sombras, animações |
| `minimalist-ui` | Interface editorial limpa, paleta monocromática quente, sem gradientes |
| `industrial-brutalist-ui` | Estética brutalista/terminal, grids rígidos, dashboards densos |
| `stitch-design-taste` | Gerar `DESIGN.md` para o Google Stitch |
| `gpt-taste` | Layouts editoriais com animações GSAP (ScrollTrigger, pinning) |
| `redesign-existing-projects` | Auditar e melhorar um site existente sem quebrar funcionalidade |
| `image-to-code` | Gerar imagens de design primeiro, depois implementar fielmente |
| `imagegen-frontend-web` | Referências visuais por seção (uma imagem por seção) |
| `imagegen-frontend-mobile` | Conceitos de telas mobile (só imagens, sem código) |
| `brandkit` | Identidade visual, logo, brand board |
| `web-design-guidelines` | Revisar UI: acessibilidade, UX, boas práticas |
| `modern-web-guidance:modern-web-guidance` | APIs e padrões web modernos (obrigatório antes de HTML/CSS/JS) |
| `vercel-composition-patterns` | Composição de componentes React |
| `vercel-react-best-practices` | Performance React/Next.js |
| `vercel-react-view-transitions` | Transições de página e animações nativas em React |
| `full-output-enforcement` | Exigir código completo, sem placeholders nem truncamento |
| `dataviz` | Gráficos, tabelas visuais, dashboards |
| `claude-mem:design-is` | Auditoria de design pelos princípios de Dieter Rams |
| `artifact-design` | Antes de publicar qualquer Artifact |

Fluxo sugerido: `brainstorming` → escolher uma skill de estilo → `modern-web-guidance` → implementar → `web-design-guidelines` para revisar.

## Skills de Testes e Qualidade

| Skill | Quando usar |
|---|---|
| `superpowers:test-driven-development` | Ao implementar qualquer funcionalidade ou correção: teste primeiro |
| `superpowers:systematic-debugging` | Qualquer bug, falha de teste ou comportamento inesperado |
| `superpowers:verification-before-completion` | Antes de dizer que algo está pronto |
| `superpowers:requesting-code-review` | Pedir revisão ao concluir uma etapa |
| `superpowers:receiving-code-review` | Tratar feedback de revisão |
| `code-review` | Revisar o diff atual em busca de bugs |
| `security-review` | Revisão de segurança das mudanças pendentes |
| `simplify` | Limpar e simplificar código alterado |
| `run` | Abrir o app e confirmar que a mudança funciona de verdade |
| `caveman:verify-and-stop` | Verificar e parar quando o trabalho estiver concluído |
| `caveman:investigate-first` | Diagnosticar falhas ambíguas antes de editar |
| `caveman:safe-refactor` | Refatoração segura |
| `caveman:surgical-patch` | Correções pequenas e pontuais |
| `web-design-guidelines` | Auditoria de acessibilidade e UX |

Planejamento e execução: `superpowers:writing-plans` → `superpowers:executing-plans` (ou `superpowers:subagent-driven-development`). Ao terminar: `superpowers:finishing-a-development-branch`.

## Plugins instalados

| Plugin | Para que serve |
|---|---|
| `superpowers` | Fluxo de trabalho: brainstorming, planos, TDD, debugging, revisão |
| `caveman` | Respostas curtas; `cavecrew` com agentes builder, investigator e reviewer |
| `claude-mem` | Memória entre sessões, busca de observações, planos (`make-plan`, `do`) |
| `modern-web-guidance` | Boas práticas web modernas |
| `watch-skill` | Analisar vídeos e capturas de tela como evidência |
| `productivity` | Tarefas e memória |
| `data` | Análise de dados, SQL, visualizações |
| `b12-claude-plugin` | Gerador e editor de sites B12 |
| `claude-code-setup` | Recomendar automações para o Claude Code |
| `anthropic-skills` | Criar `.docx`, `.pdf`, `.pptx`, `.xlsx` |

## Servidores MCP

- `pixellab`: arte pixel art, sprites, tilesets (usar com as skills `pixel-art-sprites`, `game-assets`, se o trabalho precisar).
- `Claude Docs`: criar e editar documentos online.
- Precisam de autorização antes do uso (via `/mcp`): Amplitude, Hex, Atlassian, ClickUp, Linear, Monday, Notion, Slack.
- Falhou ao conectar: `definite` (endpoint não encontrado).

## Agentes disponíveis

- `Explore`: busca ampla somente leitura.
- `Plan`: desenho de plano de implementação.
- `general-purpose`: tarefas de várias etapas.
- `caveman:cavecrew-builder`, `cavecrew-investigator`, `cavecrew-reviewer`: edição pequena, localização de código, revisão de diff.

## Convenções do projeto

- Stack: Vite + React 18 + TypeScript, three.js com @react-three/fiber/drei, GSAP. Sem backend.
- Comandos: `npm run dev`, `npm run build` (inclui `tsc -b`), `npm run preview`.
- Conteúdo 100% orientado a dados: `src/content/*.json` e `public/images/`. Nunca colocar texto de conteúdo em componentes.
- Textos ficam em HTML/CSS. O 3D (`src/scene/`) cuida só da capa, da mesa, da luz e das partículas.
- A paginação mede o DOM (`src/book/paginate.ts`) com a mesma árvore de blocos usada na renderização (`blocks.ts`). Ao mudar o CSS das páginas, rodar o teste de transbordo.
- A versão 2D pode ser forçada com `?modo=2d`.
- Virada de página: StPageFlip (`page-flip`, importado de `page-flip/dist/js/page-flip.module.js`, tipos em `src/types/page-flip.d.ts`, CSS próprio em `global.css`). A biblioteca move os nós das páginas, então cada página é um `<div>` criado fora do React e preenchido com `createPortal`. Não renderizar as páginas como filhos React diretos. O toque é tratado em `Book.tsx`, não pela biblioteca.
- Cores somente via variáveis CSS em `src/styles/global.css` (temas: claro, sépia, noturno).
