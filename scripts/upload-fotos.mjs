#!/usr/bin/env node
/*
 * Upload em lote das fotos dos produtos para o Vercel Blob.
 *
 * Uso:
 *   node scripts/upload-fotos.mjs                 # usa a pasta ./fotos
 *   node scripts/upload-fotos.mjs C:\fotos        # pasta personalizada
 *
 * Cada arquivo é enviado para `products/<nome>-<aleatorio>.<ext>` e o resultado
 * fica em `fotos/urls.json` (nome do arquivo -> URL pública). Depois é só colar
 * a URL no campo "Imagem do produto" do painel, ou pedir para o agente vincular.
 *
 * Requer BLOB_READ_WRITE_TOKEN (lido de .env.local ou do ambiente).
 */
import { put } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
};
const MAX_BYTES = 3 * 1024 * 1024;

function loadEnvLocal() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return;
  const file = path.resolve('.env.local');
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^"(.*)"$/, '$1');
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

loadEnvLocal();

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Defina BLOB_READ_WRITE_TOKEN em .env.local (npx vercel env pull) antes de rodar.');
  process.exit(1);
}

const folder = path.resolve(process.argv[2] || 'fotos');
if (!fs.existsSync(folder)) {
  console.error(`Pasta não encontrada: ${folder}`);
  process.exit(1);
}

const files = fs
  .readdirSync(folder)
  .filter((name) => EXTENSIONS.has(path.extname(name).toLowerCase()))
  .sort();

if (!files.length) {
  console.error(`Nenhuma imagem encontrada em ${folder} (jpg, png, webp, avif ou gif).`);
  process.exit(1);
}

const results = [];

for (const [index, name] of files.entries()) {
  const filePath = path.join(folder, name);
  const buffer = fs.readFileSync(filePath);
  const extension = path.extname(name).toLowerCase();

  if (buffer.length > MAX_BYTES) {
    console.warn(`[${index + 1}/${files.length}] ${name} ignorado: ${(buffer.length / 1024 / 1024).toFixed(1)} MB (limite 3 MB)`);
    continue;
  }

  const pathname = `products/${slugify(path.basename(name, extension)) || 'produto'}.${extension.slice(1)}`;

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: TYPES[extension],
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 30,
  });

  results.push({ arquivo: name, url: blob.url });
  console.log(`[${index + 1}/${files.length}] ${name} -> ${blob.url}`);
}

const outputFile = path.join('fotos', 'urls.json');
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
console.log(`\n${results.length} foto(s) enviada(s). Mapa salvo em ${outputFile}`);
