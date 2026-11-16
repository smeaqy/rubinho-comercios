import { put, head } from '@vercel/blob';

const BLOB_PATH = 'data/catalog.json';

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

export async function readCatalog() {
  const fallback = JSON.parse(JSON.stringify(SEED_CATALOG));
  if (!hasBlobCredentials()) return fallback;

  try {
    const info = await head(BLOB_PATH);
    const response = await fetch(`${info.url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return fallback;

    const data = await response.json();
    if (!data || !Array.isArray(data.products)) return fallback;

    return {
      version: Number(data.version) || 1,
      updatedAt: data.updatedAt || null,
      products: data.products,
    };
  } catch {
    return fallback;
  }
}

export async function writeCatalog(catalog) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    products: catalog.products,
  };

  await put(BLOB_PATH, JSON.stringify(payload, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });

  return payload;
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
