import { isAdminRequest, methodNotAllowed, readJsonBody } from './_lib/auth.js';
import { CATEGORIES, newId, readCatalog, writeCatalog } from './_lib/catalog.js';

const PRICE_TYPES = ['fixed', 'from', 'consult'];
const CONDITIONS = ['novo', 'seminovo', 'usado', ''];

function text(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function toPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = typeof value === 'string' ? value.replace(/\./g, '').replace(',', '.') : value;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100) / 100;
}

function sanitize(input, base = {}) {
  const errors = [];

  const title = text(input.title ?? base.title, 90);
  if (title.length < 3) errors.push('Informe um título com pelo menos 3 caracteres.');

  const category = CATEGORIES[input.category] ? input.category : base.category;
  if (!CATEGORIES[category]) errors.push('Categoria inválida.');

  const priceType = PRICE_TYPES.includes(input.priceType) ? input.priceType : base.priceType || 'fixed';
  const price = priceType === 'consult' ? null : toPrice(input.price ?? base.price);
  if (priceType !== 'consult' && price === null) errors.push('Informe um preço válido ou escolha "Sob consulta".');

  const condition = CONDITIONS.includes(input.condition) ? input.condition : base.condition || '';
  const image = text(input.image ?? base.image, 500);
  if (image && !/^https:\/\//i.test(image)) errors.push('A imagem precisa ser um link https:// válido.');

  if (errors.length) return { errors };

  return {
    product: {
      ...base,
      title,
      category,
      price,
      priceType,
      condition,
      year: text(input.year ?? base.year, 9),
      description: text(input.description ?? base.description, 700),
      image,
      featured: Boolean(input.featured ?? base.featured),
      published: Boolean(input.published ?? base.published ?? true),
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const admin = isAdminRequest(req);

  try {
    if (req.method === 'GET') {
      const catalog = await readCatalog();
      const products = catalog.products
        .filter((product) => admin || product.published)
        .sort((a, b) => Number(b.featured) - Number(a.featured) || String(b.createdAt).localeCompare(String(a.createdAt)));

      return res.status(200).json({ admin, updatedAt: catalog.updatedAt, products });
    }

    if (!admin) return res.status(401).json({ error: 'Faça login no painel para editar o catálogo.' });
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    }

    let body;
    try {
      body = readJsonBody(req);
    } catch {
      return res.status(400).json({ error: 'Requisição inválida.' });
    }

    const catalog = await readCatalog();
    const now = new Date().toISOString();

    if (req.method === 'POST') {
      const { product, errors } = sanitize(body);
      if (errors) return res.status(422).json({ error: errors[0], errors });

      const created = { ...product, id: newId(), createdAt: now, updatedAt: now };
      catalog.products.unshift(created);
      const saved = await writeCatalog(catalog);
      return res.status(201).json({ product: created, updatedAt: saved.updatedAt });
    }

    const id = text(body.id, 60);
    const index = catalog.products.findIndex((product) => product.id === id);
    if (index === -1) return res.status(404).json({ error: 'Produto não encontrado.' });

    if (req.method === 'DELETE') {
      const [removed] = catalog.products.splice(index, 1);
      const saved = await writeCatalog(catalog);
      return res.status(200).json({ removed: removed.id, updatedAt: saved.updatedAt });
    }

    const { product, errors } = sanitize(body, catalog.products[index]);
    if (errors) return res.status(422).json({ error: errors[0], errors });

    catalog.products[index] = { ...product, id, updatedAt: now };
    const saved = await writeCatalog(catalog);
    return res.status(200).json({ product: catalog.products[index], updatedAt: saved.updatedAt });
  } catch (error) {
    console.error('[products]', error);
    return res.status(500).json({ error: 'Não foi possível salvar o catálogo agora. Tente novamente.' });
  }
}
