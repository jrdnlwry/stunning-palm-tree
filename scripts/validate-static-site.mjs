import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>https:\/\/crawlwise\.io([^<]*)<\/loc>/g)].map(match => match[1] || '/');
const failures = [];
const titles = new Map();
const descriptions = new Map();

function routeFile(route) {
  return route === '/' ? path.join(root, 'index.html') : path.join(root, route.slice(1), 'index.html');
}

for (const route of urls) {
  const file = routeFile(route);
  if (!fs.existsSync(file)) {
    failures.push(`Missing sitemap page: ${route} -> ${path.relative(root, file)}`);
    continue;
  }

  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  const h1Count = (html.match(/<h1(?:\s|>)/g) ?? []).length;

  if (!title) failures.push(`Missing title: ${route}`);
  if (!description) failures.push(`Missing meta description: ${route}`);
  if (canonical !== `https://crawlwise.io${route}`) failures.push(`Incorrect canonical: ${route}`);
  if (h1Count !== 1) failures.push(`Expected one H1 at ${route}; found ${h1Count}`);
  if (!html.includes('href="/styles.css"')) failures.push(`Non-root-relative stylesheet at ${route}`);
  if (!html.includes('src="/script.js"')) failures.push(`Non-root-relative script at ${route}`);
  if (html.includes('${')) failures.push(`Unrendered template expression at ${route}`);
  if (html.match(/<button[^>]+data-page=/)) failures.push(`JavaScript-only page navigation button at ${route}`);

  if (title) {
    if (titles.has(title)) failures.push(`Duplicate title at ${route} and ${titles.get(title)}`);
    titles.set(title, route);
  }
  if (description) {
    if (descriptions.has(description)) failures.push(`Duplicate description at ${route} and ${descriptions.get(description)}`);
    descriptions.set(description, route);
  }

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const cleanPath = href.split('#')[0].split('?')[0];
    if (!cleanPath || /\.[a-z0-9]+$/i.test(cleanPath)) continue;
    const normalized = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
    if (!fs.existsSync(routeFile(normalized))) failures.push(`Broken internal clean URL on ${route}: ${href}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Validated ${urls.length} sitemap URLs, ${titles.size} unique titles, ${descriptions.size} unique descriptions, canonicals, H1s, assets, and internal clean links.`);
