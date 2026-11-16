import crypto from 'node:crypto';

const COOKIE_NAME = 'rc_admin';
const SESSION_SECONDS = 60 * 60 * 12; // 12 horas

function sessionSecret() {
  return process.env.ADMIN_SECRET || `rubinho-comercios::${process.env.ADMIN_PASSWORD || 'dev-only'}`;
}

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function safeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

export function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== 'string') return false;
  return safeEqual(input, expected);
}

export function isAdminRequest(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [version, expiresRaw, signature] = parts;
  const expires = Number(expiresRaw);
  if (version !== 'v1' || !Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = crypto
    .createHmac('sha256', sessionSecret())
    .update(`${version}.${expiresRaw}`)
    .digest('base64url');

  return safeEqual(signature, expected);
}

export function buildSessionCookie() {
  const expires = Date.now() + SESSION_SECONDS * 1000;
  const payload = `v1.${expires}`;
  const signature = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return serializeCookie(`${payload}.${signature}`, SESSION_SECONDS);
}

export function buildExpiredCookie() {
  return serializeCookie('', 0);
}

function serializeCookie(value, maxAge) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) parts.push('Secure');
  return parts.join('; ');
}

/** Bloqueia métodos não permitidos e responde 405. */
export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'Método não permitido.' });
}

/** Lê o corpo JSON aceitando string já parseada (runtime da Vercel pode variar). */
export function readJsonBody(req, limit = 5_000_000) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    if (raw.length > limit) throw new Error('Corpo da requisição muito grande.');
    return JSON.parse(raw);
  }
  return {};
}
