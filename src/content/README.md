# Como editar o conteúdo do livro

Todo o conteúdo do site fica nesta pasta (`src/content/`) e as imagens ficam em `public/images/`.
Não é preciso mexer em nenhum componente: basta editar os arquivos abaixo e salvar.
Com `npm run dev` rodando, o site recarrega sozinho.

> Dica: os arquivos `.json` exigem aspas duplas e vírgula entre os itens (mas **sem** vírgula depois do último).
> Se o site parar de abrir depois de uma edição, confira as vírgulas e as aspas.

## Tema, título e nome do grupo (`site.json`)

| Campo | O que é |
|---|---|
| `bookTitle` | Nome do livro (capa, abertura, folha de rosto) |
| `bookAuthor` | Autor da obra (aparece na capa) |
| `theme` | Tema do trabalho |
| `subtitle` | Subtítulo da abertura. `{tema}` é trocado automaticamente pelo valor de `theme` |
| `groupName` | Nome do grupo (folha de rosto e créditos) |
| `school` | Escola / turma (folha de rosto e créditos) |
| `year` | Ano |

## Páginas introdutórias (`front.json`)

- `about_book`: página "Sobre o livro". Tem `title` e `paragraphs` (lista de parágrafos).
- `about_author`: página "Sobre o autor". Mesmo formato.
- `author_photos`: fotos do autor. Cada item tem `src` (caminho da imagem) e `caption` (legenda com a fonte).
  - Pode ter de 0 a 3 fotos. Para remover, apague o item da lista.

O campo `todo` é só um lembrete; pode apagar quando revisar o texto.
Se `paragraphs` ficar vazio, a página mostra "Conteúdo em breve" em vez de quebrar.

## Integrantes (`members.json`)

Cada integrante é um objeto:

```json
{
  "id": "maria",
  "name": "Maria Silva",
  "role": "Revisão e pesquisa",
  "bio": "Duas ou três frases sobre a Maria.",
  "photo": "/images/membros/maria.webp"
}
```

- **Adicionar:** copie um bloco `{ ... }` inteiro, cole na lista e troque os dados. O `id` deve ser único, sem espaços nem acentos.
- **Remover:** apague o bloco.
- **Reordenar:** mude a posição do bloco na lista. A ordem da lista é a ordem no livro e na abertura.

## Textos (`texts.json`)

```json
{
  "id": "carta",
  "order": 1,
  "title": "Carta a Rubião",
  "genre": "Carta",
  "author": "maria",
  "paragraphs": ["Primeiro parágrafo...", "Segundo parágrafo..."]
}
```

- `order`: posição do texto no livro (1, 2, 3...). Para **reordenar**, troque os números.
- `author`: o `id` de um integrante de `members.json`, ou `"grupo"` para o texto coletivo.
- `paragraphs`: cada parágrafo é um texto entre aspas. Não há limite de tamanho: textos longos continuam automaticamente nas páginas seguintes.
- Aspas dentro do texto precisam de barra: `\"assim\"`. Ou use aspas curvas “assim”, que não precisam.
- **Adicionar/remover** funciona como nos integrantes.

O sumário e os números de página são gerados sozinhos. Nunca é preciso escrever números de página à mão.

## Imagens (`public/images/`)

- Fotos dos integrantes: coloque em `public/images/membros/` e aponte no campo `photo` (ex.: `/images/membros/maria.webp`).
- Fotos do autor: coloque em `public/images/machado/` e aponte em `author_photos[].src`.
- Formato recomendado: **WebP** (ou JPG), até ~400 KB cada, em pé (proporção 3:4).
- Se uma imagem não existir, o site mostra a imagem genérica `placeholder-member.svg` no lugar.

Fotos de Machado de Assis em domínio público podem ser encontradas no Wikimedia Commons. Cite a fonte na legenda.
