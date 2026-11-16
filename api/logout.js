import { buildExpiredCookie, methodNotAllowed } from './_lib/auth.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  res.setHeader('Set-Cookie', buildExpiredCookie());
  return res.status(200).json({ ok: true });
}
