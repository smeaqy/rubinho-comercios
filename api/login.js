import {
  SESSION_OPTIONS,
  buildSessionCookie,
  checkPassword,
  checkUser,
  methodNotAllowed,
  readJsonBody,
} from './_lib/auth.js';

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.startedAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, startedAt: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Painel não configurado. Defina a variável ADMIN_PASSWORD na Vercel.' });
  }

  const ip = (req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
  }

  let body;
  try {
    body = readJsonBody(req, 4096);
  } catch {
    return res.status(400).json({ error: 'Requisição inválida.' });
  }

  // Avalia as duas checagens sempre, para não revelar qual campo está errado.
  const userOk = checkUser(body.user);
  const passwordOk = checkPassword(body.password);
  if (!userOk || !passwordOk) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  attempts.delete(ip);
  const seconds = body.remember === true ? SESSION_OPTIONS.remember : SESSION_OPTIONS.normal;
  res.setHeader('Set-Cookie', buildSessionCookie(seconds));
  return res.status(200).json({ ok: true });
}
