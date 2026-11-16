import { put } from '@vercel/blob';
import { isAdminRequest, methodNotAllowed, readJsonBody } from './_lib/auth.js';
import { slugify } from './_lib/catalog.js';

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Faça login no painel para enviar imagens.' });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Upload indisponível: storage não conectado à Vercel.' });
  }

  let body;
  try {
    body = readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Requisição inválida.' });
  }

  const contentType = String(body.contentType || '');
  const extension = ALLOWED[contentType];
  if (!extension) {
    return res.status(415).json({ error: 'Formato não suportado. Envie JPG, PNG, WEBP, AVIF ou GIF.' });
  }

  const base64 = String(body.data || '').replace(/^data:[^;]+;base64,/, '');
  if (!base64) return res.status(400).json({ error: 'Arquivo vazio.' });

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) return res.status(400).json({ error: 'Arquivo inválido.' });
  if (buffer.length > MAX_BYTES) {
    return res.status(413).json({ error: 'Imagem muito grande. O limite é 3 MB.' });
  }

  try {
    const baseName = slugify(body.filename || 'produto') || 'produto';
    const blob = await put(`products/${Date.now()}-${baseName}.${extension}`, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });

    return res.status(201).json({ url: blob.url });
  } catch (error) {
    console.error('[upload]', error);
    return res.status(500).json({ error: 'Falha ao enviar a imagem. Tente novamente.' });
  }
}
