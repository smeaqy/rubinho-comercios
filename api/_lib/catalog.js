import { put, get, list, del } from '@vercel/blob';

/*
 * O catálogo é gravado em snapshots imutáveis (`data/catalog-<timestamp>.json`).
 * Isso evita o cache de 60s que a Vercel aplica ao sobrescrever o mesmo caminho
 * de Blob: um arquivo novo é lido na hora, então o painel e o site enxergam a
 * alteração imediatamente. A leitura pega sempre o snapshot mais recente.
 */
const PREFIX = 'data/catalog-';
const KEEP_SNAPSHOTS = 20;

export const CATEGORIES = {
  carros: 'Carros',
  rodas: 'Rodas',
  iphones: 'iPhones',
  ouro: 'Ouro',
};

export const SEED_CATALOG = {
  version: 1,
  updatedAt: null,
  products: [
    {
      id: 'seed-civic',
      title: 'Honda Civic Touring 2.0',
      category: 'carros',
      price: 139900,
      priceType: 'fixed',
      installments: 48,
      installmentValue: 3690,
      condition: 'seminovo',
      year: '2021',
      description:
        'Único dono, revisões em dia, teto solar e bancos em couro. Financiamento aprovado na hora e troca com volta.',
      image: '',
      featured: true,
      published: true,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
    {
      id: 'seed-corolla',
      title: 'Toyota Corolla XEi 2.0',
      category: 'carros',
      price: 129900,
      priceType: 'from',
      installments: 48,
      installmentValue: 3420,
      condition: 'seminovo',
      year: '2022',
      description: 'Completo, câmbio automático, IPVA pago e documentação pronta para transferência.',
      image: '',
      featured: false,
      published: true,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
    {
      id: 'seed-rodas-20',
      title: 'Jogo de rodas aro 20 esportivas',
      category: 'rodas',
      price: 6500,
      priceType: 'fixed',
      installments: 10,
      condition: 'novo',
      year: '',
      description: 'Modelo diamantado, 5 furos, acompanha bicos e centralizadores. Instalação disponível.',
      image: '',
      featured: true,
      published: true,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
    {
      id: 'seed-rodas-17',
      title: 'Rodas aro 17 originais',
      category: 'rodas',
      price: 3200,
      priceType: 'fixed',
      installments: 10,
      condition: 'usado',
      year: '',
      description: 'Jogo original revisado, sem empenos. Aceito troca por aro menor + volta.',
      image: '',
      featured: false,
      published: true,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
    {
      id: 'seed-iphone-15',
      title: 'iPhone 15 Pro Max 256GB',
      category: 'iphones',
      price: 7499,
      priceType: 'from',
      installments: 12,
      condition: 'seminovo',
      year: '2024',
      description: 'Bateria 92%, lacrado na caixa com garantia da loja. Aceito seu usado na troca.',
      image: '',
      featured: true,
      published: true,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
    {
      id: 'seed-iphone-13',
      title: 'iPhone 13 128GB',
      category: 'iphones',
      price: 3199,
      priceType: 'from',
      installments: 12,
      condition: 'seminovo',
      year: '2022',
      description: 'Aparelho impecável, sem detalhes, com película e capinha. Parcelamos no cartão.',
      image: '',
      featured: false,
      published: true,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
    {
      id: 'seed-corrente',
      title: 'Corrente de ouro 18k — 60cm',
      category: 'ouro',
      price: 8900,
      priceType: 'consult',
      installments: 6,
      condition: 'novo',
      year: '',
      description: 'Ouro 18k maciço, fecho reforçado e laudo de autenticidade. Valor acompanha a cotação do dia.',
      image: '',
      featured: true,
      published: true,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
    {
      id: 'seed-alianca',
      title: 'Aliança de ouro 18k',
      category: 'ouro',
      price: 2450,
      priceType: 'consult',
      installments: 6,
      condition: 'novo',
      year: '',
      description: 'Par de alianças em ouro 18k, diversas numerações. Compramos ouro e joias usadas.',
      image: '',
      featured: false,
      published: true,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
  ],
};

function hasBlobCredentials() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function snapshotPath() {
  return `${PREFIX}${String(Date.now()).padStart(14, '0')}.json`;
}

function normalize(data) {
  if (!data || !Array.isArray(data.products)) return null;
  return {
    version: Number(data.version) || 1,
    updatedAt: data.updatedAt || null,
    products: data.products,
  };
}

export async function readCatalog() {
  const fallback = JSON.parse(JSON.stringify(SEED_CATALOG));
  if (!hasBlobCredentials()) return fallback;

  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 200 });
    if (!blobs.length) return fallback;

    const latest = blobs.reduce((current, item) => (item.pathname > current.pathname ? item : current));
    const result = await get(latest.pathname, { access: 'public', useCache: true });
    if (!result || !result.stream) return fallback;

    const parsed = normalize(JSON.parse(await new Response(result.stream).text()));
    return parsed || fallback;
  } catch (error) {
    console.error('[catalog] leitura falhou, usando seed:', error?.message || error);
    return fallback;
  }
}

export async function writeCatalog(catalog) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    products: catalog.products,
  };

  await put(snapshotPath(), JSON.stringify(payload, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });

  await pruneSnapshots();
  return payload;
}

async function pruneSnapshots() {
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 200 });
    if (blobs.length <= KEEP_SNAPSHOTS) return;

    const oldest = blobs
      .sort((a, b) => a.pathname.localeCompare(b.pathname))
      .slice(0, blobs.length - KEEP_SNAPSHOTS)
      .map((blob) => blob.url);

    await del(oldest);
  } catch (error) {
    console.error('[catalog] limpeza de snapshots falhou:', error?.message || error);
  }
}

export function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function newId() {
  return `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
