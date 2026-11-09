# Quincas Borba — livro interativo

Site do trabalho de Língua Portuguesa: um livro 3D que se abre e se folheia com o mouse, o dedo ou o teclado.
Reúne os textos do grupo (carta, romance, resenha, etc.), páginas sobre a obra e o autor, e os integrantes.

## Como rodar

Requisito: [Node.js](https://nodejs.org) 18 ou mais recente.

```bash
npm install      # instala as dependências (só na primeira vez)
npm run dev      # abre em http://localhost:5173
npm run build    # gera a versão final em dist/
npm run preview  # testa a versão final localmente
```

Para testar a versão 2D (sem WebGL), abra o site com `?modo=2d` no fim do endereço.

## Como trocar o conteúdo

Tudo é orientado a dados: **não é preciso mexer nos componentes**.

| O que trocar | Onde |
|---|---|
| Tema do trabalho, nome do grupo, escola | `src/content/site.json` |
| "Sobre o livro", "Sobre o autor", fotos do autor | `src/content/front.json` |
| Integrantes (nome, função, bio, foto) | `src/content/members.json` |
| Textos (título, gênero, autor, parágrafos, ordem) | `src/content/texts.json` |
| Imagens | `public/images/` |

O passo a passo detalhado, com exemplos, está em [`src/content/README.md`](src/content/README.md).

O sumário e os números de página são gerados automaticamente. Textos longos continuam sozinhos nas páginas seguintes.

## Estrutura de pastas

```
public/images/            imagens (placeholders .svg; troque por .webp/.jpg)
  machado/                fotos do autor
  placeholder-member.svg  imagem usada quando uma foto falta
src/
  content/                CONTEÚDO DO SITE (JSON) + guia de edição
  App.tsx                 fluxo: abertura → capa → livro → capa
  components/
    Intro.tsx             abertura com polaroides, título e espera de carregamento
    Cover2D.tsx           capa da versão 2D
    Settings.tsx          tema (claro/sépia/noturno), som, poeira
    Dust2D.tsx            partículas da versão 2D
    SceneBoundary.tsx     se o 3D falhar, cai para o 2D
  scene/
    Scene3D.tsx           mesa, luz, poeira e livro 3D (carregado sob demanda)
    textures.ts           texturas geradas em canvas (couro, madeira, papel)
  book/
    structure.ts          ordem das seções e geração do sumário
    paginate.ts           paginação automática (mede e quebra os textos)
    blocks.ts             blocos de texto (mesma estrutura para medir e exibir)
    Book.tsx              livro HTML: virada (StPageFlip), toque, teclado, marcador
    PageView.tsx          visual de cada tipo de página
  lib/                    conteúdo, carregamento, som, armazenamento, WebGL
  styles/global.css       paleta e estilos (cores em variáveis CSS)
```

## Como funciona

- **Abertura:** começa com um selo de cera. Tocar nele coloca o site em tela cheia (os navegadores só permitem tela cheia depois de um clique) e inicia a abertura: holofote, poeira dourada, polaroides caindo, arabescos e título em folha de ouro. Ela só termina quando fontes, imagens e a cena 3D estiverem prontas **e** o tempo mínimo tiver passado. Tem botão "Pular". A tela cheia também pode ser ligada e desligada pelo botão na barra superior.
- **Capa:** livro 3D fechado sobre a mesa. Clique ou arraste a capa para abrir.
- **Livro:** as páginas são HTML (texto nítido, selecionável e acessível). O 3D cuida da capa, da luz, da mesa e da poeira.
- **Navegação:**
  - arrastar a borda da página (mouse) ou deslizar (toque);
  - clicar nas bordas;
  - setas ← → do teclado (Home e End vão ao início e ao fim);
  - botões na barra inferior.
- **Sumário:** clicar em um item vira o livro até a página escolhida.
- **Marcador:** a última página lida fica salva; na capa aparece "Continuar da página X".
- **Acessibilidade:** respeita `prefers-reduced-motion`, funciona só com teclado e tem contraste adequado nos três temas.
- **Sem WebGL ou em aparelho fraco:** abre automaticamente uma versão 2D com a mesma navegação.

## Tecnologias

Vite, React, TypeScript, Three.js (@react-three/fiber e drei), GSAP e StPageFlip (`page-flip`, virada de página com dobra pelo canto). Fontes: EB Garamond e IM Fell English (Google Fonts).
