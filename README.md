# Rubinho Comércios

Landing page + catálogo profissional com **painel administrativo** para a Rubinho Comércios
(carros, rodas, iPhones e ouro).

- Site público: `/` (landing) e `/catalogo` (catálogo com filtros e busca)
- Painel do lojista: `/admin`
- API serverless (Vercel Functions) + catálogo persistido no **Vercel Blob**
- Nenhum build: HTML, CSS e ES Modules puros

## Como funciona

| Rota | Descrição |
| --- | --- |
| `/` | Landing page com categorias, destaques, como funciona, FAQ e contato |
| `/catalogo` | Catálogo com filtro por categoria, busca, ordenação e modal de detalhes |
| `/admin` | Login por senha + CRUD de produtos (publicar, destacar, excluir) |
| `/api/products` | `GET` público (somente publicados) · `POST/PUT/DELETE` autenticado |
| `/api/login` | Cria a sessão (cookie `HttpOnly` assinado com HMAC) |
| `/api/logout` | Encerra a sessão |
| `/api/session` | Diz se a sessão atual é de administrador |
| `/api/upload` | Upload de imagens de produto (até 3 MB) para o Blob |

### Persistência

O catálogo é um JSON (`data/catalog.json`) salvo no **Vercel Blob**. Sem credencial de Blob
a API devolve o catálogo de exemplo (`SEED_CATALOG` em `api/_lib/catalog.js`) — útil para
pré-visualizar o layout, mas as alterações não são salvas nesse modo.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `ADMIN_PASSWORD` | sim | Senha do painel `/admin` |
| `ADMIN_SECRET` | recomendada | Chave para assinar o cookie de sessão (32+ caracteres) |
| `BLOB_READ_WRITE_TOKEN` | sim (produção) | Gerada automaticamente ao conectar um Blob Store ao projeto |

Gere um segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Desenvolvimento local

```bash
npm install
npx vercel link        # vincula ao projeto na Vercel
npx vercel env pull    # baixa BLOB_READ_WRITE_TOKEN
echo "ADMIN_PASSWORD=suasenha" >> .env.local
npx vercel dev
```

Abra `http://localhost:3000` (o Blob remoto é usado também em desenvolvimento).

## Deploy

```bash
npx vercel --prod
```

O projeto já está publicado em `https://rubinho-comercios-gamma.vercel.app`.

## Uso do painel

1. Acesse `/admin` e entre com a senha (`ADMIN_PASSWORD`).
2. **Novo produto** → preencha título, categoria, preço e descrição.
3. Envie a foto (upload direto) ou cole um link `https://`.
4. Marque **Destaque** para aparecer primeiro na home e **Publicado** para exibir no catálogo.
5. Produtos desmarcados como publicados ficam como rascunho e não aparecem para os clientes.

### Dicas de foto

- Use fotos na horizontal (proporção 4:3) com fundo limpo.
- Tamanho recomendado: 1200 × 900 px, até 3 MB (JPG ou WEBP).
- Para carros, fotografe frente 3/4, traseira, interior e painel.

### Upload de várias fotos de uma vez

1. Salve as imagens em `fotos/` (JPG, PNG ou WEBP, até 3 MB cada).
2. Rode:
   ```bash
   node scripts/upload-fotos.mjs
   ```
3. As URLs públicas saem no terminal e em `fotos/urls.json`.
4. Cole a URL no campo **Imagem do produto** de cada item do painel.

### Parcelamento

O campo **Parcelas** é opcional: preencha com o número máximo (ex.: `12`) e o site
mostra “ou 12x de R$ 441” no card e no detalhe do produto. Deixe vazio para não exibir.

### Depoimentos

Os depoimentos ficam em `index.html`, na seção `#depoimentos` (quatro blocos `<article class="testimonial">`).
São exemplos de layout — troque os textos, nomes e iniciais pelos relatos reais dos clientes.


## Estrutura

```
api/                 funções serverless (auth, produtos, upload)
assets/css/          design system (tema graphite + dourado)
assets/img/          favicon, placeholders e og-image (compartilhamento)
assets/js/           site.js (público) e admin.js (painel)
fotos/               pasta local para fotos antes do upload em lote
scripts/             upload-fotos.mjs (upload em lote para o Blob)
index.html           landing page
catalogo.html        catálogo
admin.html           painel do lojista
vercel.json          headers de segurança, CSP e cache
```

## Contato da loja

- WhatsApp: [(83) 98661-6556](https://wa.me/5583986616556)
- Instagram: [@rubinhocomercios](https://www.instagram.com/rubinhocomercios/)
