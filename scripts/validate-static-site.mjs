import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>https:\/\/crawlwise\.io([^<]*)<\/loc>/g)].map(match => match[1] || '/');
const requiredRoutes = [
  '/',
  '/sagging-floors-crawl-space/',
  '/water-in-crawl-space/',
  '/crawl-space-mold/',
  '/crawl-space-moisture/'
];
const canonicalOverrides = new Map([
  ['/crawl-space-mold/', '/crawl-space-mold-remediation/']
]);
const failures = [];
const titles = new Map();
const descriptions = new Map();
const localReferences = [];

function routeFile(route) {
  return route === '/' ? path.join(root, 'index.html') : path.join(root, route.slice(1), 'index.html');
}

function extractSharedElement(html, element, className) {
  return html.match(new RegExp(`<${element} class="${className}">[\\s\\S]*?<\\/${element}>`))?.[0];
}

function isExternalReference(reference) {
  return reference.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(reference);
}

function resolvedSitePath(route, reference) {
  return decodeURIComponent(new URL(reference, `https://crawlwise.test${route}`).pathname);
}

function fileForSitePath(sitePath) {
  if (sitePath.endsWith('/')) return routeFile(sitePath);
  return path.join(root, sitePath.slice(1));
}

function validateFragment(route, reference) {
  const target = new URL(reference, `https://crawlwise.test${route}`);
  if (!target.hash) return;

  const file = fileForSitePath(decodeURIComponent(target.pathname));
  if (!fs.existsSync(file) || path.extname(file) && path.extname(file) !== '.html') return;

  const fragment = decodeURIComponent(target.hash.slice(1));
  const targetHtml = fs.readFileSync(file, 'utf8');
  const escapedFragment = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`\\b(?:id|name)="${escapedFragment}"`).test(targetHtml)) {
    failures.push(`Missing fragment target on ${route}: ${reference}`);
  }
}

function validateLocalReference(route, attribute, reference) {
  if (!reference || isExternalReference(reference)) return;

  localReferences.push({ route, attribute, reference });
  validateFragment(route, reference);

  const cleanReference = reference.split('#')[0].split('?')[0];
  if (!cleanReference) return;
  if (cleanReference.startsWith('/')) {
    failures.push(`Root-relative reference is not portable on ${route}: ${reference}`);
  }

  const sitePath = resolvedSitePath(route, reference);
  const diskPath = fileForSitePath(sitePath);
  const relativePath = path.relative(root, diskPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    failures.push(`Local reference escapes the site root on ${route}: ${reference}`);
  } else if (!fs.existsSync(diskPath)) {
    failures.push(`Missing local target on ${route}: ${reference}`);
  }
}

function normalizeSharedLinks(html, route) {
  return html?.replace(/\bhref="([^"]+)"/g, (_match, reference) => {
    if (isExternalReference(reference)) return `href="${reference}"`;
    const target = new URL(reference, `https://crawlwise.test${route}`);
    return `href="${target.pathname}${target.search}${target.hash}"`;
  });
}

for (const route of requiredRoutes) {
  if (!fs.existsSync(routeFile(route))) failures.push(`Required static page is missing: ${route}`);
}

for (const [duplicateRoute, canonicalRoute] of canonicalOverrides) {
  if (urls.includes(duplicateRoute)) failures.push(`Duplicate route must not appear in sitemap: ${duplicateRoute}`);
  if (!urls.includes(canonicalRoute)) failures.push(`Canonical route is missing from sitemap: ${canonicalRoute}`);
}

const routesToValidate = [...new Set([...urls, ...requiredRoutes])];
const homepage = fs.existsSync(routeFile('/')) ? fs.readFileSync(routeFile('/'), 'utf8') : '';
const sharedHeader = extractSharedElement(homepage, 'header', 'site-header');
const sharedFooter = extractSharedElement(homepage, 'footer', 'site-footer');
if (!sharedHeader) failures.push('Homepage is missing the shared site header.');
if (!sharedFooter) failures.push('Homepage is missing the shared site footer.');

for (const route of routesToValidate) {
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
  const pageHeader = extractSharedElement(html, 'header', 'site-header');
  const pageFooter = extractSharedElement(html, 'footer', 'site-footer');

  if (!title) failures.push(`Missing title: ${route}`);
  if (!description) failures.push(`Missing meta description: ${route}`);
  const expectedCanonical = `https://crawlwise.io${canonicalOverrides.get(route) ?? route}`;
  if (canonical !== expectedCanonical) failures.push(`Incorrect canonical at ${route}: expected ${expectedCanonical}`);
  if (h1Count !== 1) failures.push(`Expected one H1 at ${route}; found ${h1Count}`);
  const expectedAssetPrefix = route === '/' ? './' : '../';
  if (!html.includes(`<link rel="stylesheet" href="${expectedAssetPrefix}styles.css">`)) failures.push(`Incorrect global stylesheet path at ${route}`);
  if (!html.includes(`<script src="${expectedAssetPrefix}script.js" defer></script>`)) failures.push(`Incorrect global script path at ${route}`);
  if (sharedHeader && normalizeSharedLinks(pageHeader, route) !== normalizeSharedLinks(sharedHeader, '/')) failures.push(`Shared header differs from homepage at ${route}`);
  if (sharedFooter && normalizeSharedLinks(pageFooter, route) !== normalizeSharedLinks(sharedFooter, '/')) failures.push(`Shared footer differs from homepage at ${route}`);
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

  for (const match of html.matchAll(/\b(href|src|poster|action)="([^"]+)"/g)) {
    validateLocalReference(route, match[1], match[2]);
  }

  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(',')) {
      validateLocalReference(route, 'srcset', candidate.trim().split(/\s+/)[0]);
    }
  }
}

async function validateHttpResponses() {
  const mountPath = '/__crawlwise_link_check__/';
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(mountPath)) {
      response.writeHead(404).end('Not found');
      return;
    }

    const sitePath = `/${pathname.slice(mountPath.length)}`;
    const file = fileForSitePath(sitePath);
    const relativePath = path.relative(root, file);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }

    response.writeHead(200).end(fs.readFileSync(file));
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  const checkedUrls = new Map();

  for (const { route, attribute, reference } of localReferences) {
    const pageUrl = `${origin}${mountPath}${route.slice(1)}`;
    const targetUrl = new URL(reference, pageUrl);
    targetUrl.hash = '';
    const key = targetUrl.href;
    if (!checkedUrls.has(key)) checkedUrls.set(key, { route, attribute, reference });
  }

  for (const [url, context] of checkedUrls) {
    const response = await fetch(url, { redirect: 'manual' });
    if (response.status !== 200) {
      failures.push(`Expected HTTP 200 for ${context.attribute} on ${context.route}: ${context.reference} returned ${response.status}`);
    }
  }

  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return checkedUrls.size;
}

const httpTargetCount = await validateHttpResponses();

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Validated ${urls.length} sitemap URLs, ${routesToValidate.length} total routes, ${httpTargetCount} unique local HTTP targets with status 200, fragments, required direct routes, canonical aliases, ${titles.size} unique titles, ${descriptions.size} unique descriptions, shared layouts, portable asset paths, H1s, and internal links.`);
