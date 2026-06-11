import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'crawl_space_vanilla_website.html');
const source = fs.readFileSync(sourcePath, 'utf8');

const routes = [
  { path: '/', page: 'home', title: 'CrawlWise | Crawl Space Education & Homeowner Guides', description: 'Clear homeowner-friendly guides to crawl space moisture, mold, water intrusion, vapor barriers, encapsulation, repair costs, and structural warning signs.' },
  { path: '/water-in-crawl-space/', page: 'article', title: 'Water in Crawl Space After Rain: Causes and Fixes | CrawlWise', description: 'Learn what water in a crawl space after rain means, what to inspect first, which repairs address the source, and when to call a professional.' },
  { path: '/crawl-space-repair-near-me/', page: 'crawl-space-repair-near-me', title: 'Crawl Space Repair Near Me: Signs, Costs, and Hiring Tips | CrawlWise', description: 'Compare crawl space repair warning signs, common project costs, inspection scopes, and practical steps for hiring a local contractor.' },
  { path: '/crawl-space-encapsulation/', page: 'crawl-space-encapsulation', title: 'Crawl Space Encapsulation: Costs, Benefits, and Alternatives | CrawlWise', description: 'Understand what crawl space encapsulation includes, what it costs, when it may be worthwhile, and which moisture-control alternatives to consider.' },
  { path: '/best-crawl-space-dehumidifier/', page: 'best-crawl-space-dehumidifier', title: 'Best Crawl Space Dehumidifier: Sizing, Cost, and Features | CrawlWise', description: 'Learn how to size a crawl space dehumidifier, compare drainage and efficiency features, estimate costs, and decide when one is appropriate.' },
  { path: '/crawl-space-vapor-barrier-cost/', page: 'crawl-space-vapor-barrier-cost', title: 'Crawl Space Vapor Barrier Cost: DIY vs Professional | CrawlWise', description: 'Estimate crawl space vapor barrier costs and compare materials, installation factors, DIY limitations, and professional encapsulation options.' },
  { path: '/crawl-space-mold-remediation/', page: 'crawl-space-mold-remediation', title: 'Crawl Space Mold Remediation: Process, Cost, and Hiring | CrawlWise', description: 'Learn what crawl space mold remediation involves, why moisture correction matters, what affects cost, and how to compare contractor scopes.' },
  { path: '/crawl-space-moisture/', page: 'crawl-space-moisture', title: 'Crawl Space Moisture: Causes, Warning Signs, and Fixes | CrawlWise', description: 'Identify crawl space moisture sources, recognize warning signs, and compare vapor barriers, drainage, dehumidification, and encapsulation.' },
  { path: '/sagging-floors-crawl-space/', page: 'sagging-floors-crawl-space', title: 'Sagging Floors and Crawl Space Problems Explained | CrawlWise', description: 'Learn how joist damage, moisture, support issues, and foundation movement can cause sagging floors and which professional should inspect them.' },
  { path: '/water-problems/', page: 'water-problems', title: 'Crawl Space Water Problems: Causes and Repair Guides | CrawlWise', description: 'Explore homeowner guides to standing water, rain intrusion, drainage problems, sump pumps, and crawl space waterproofing decisions.' },
  { path: '/moisture-problems/', page: 'moisture-problems', title: 'Crawl Space Moisture Problems and Humidity Guides | CrawlWise', description: 'Explore guides to crawl space humidity, condensation, damp insulation, vapor barriers, dehumidifiers, and moisture-control systems.' },
  { path: '/mold-problems/', page: 'mold-problems', title: 'Crawl Space Mold Problems: Causes and Remediation Guides | CrawlWise', description: 'Understand crawl space mold warning signs, moisture sources, remediation planning, inspection questions, and prevention strategies.' },
  { path: '/structural-problems/', page: 'structural-problems', title: 'Crawl Space Structural Problems and Sagging Floor Guides | CrawlWise', description: 'Explore crawl space structural warning signs involving joists, beams, supports, wood damage, soft floors, and uneven floors.' },
  { path: '/vapor-barrier-problems/', page: 'vapor-barrier-problems', title: 'Crawl Space Vapor Barrier Problems and Repair Guides | CrawlWise', description: 'Learn how missing, torn, or poorly sealed crawl space vapor barriers affect moisture and when replacement or encapsulation may help.' },
  { path: '/pest-problems/', page: 'pest-problems', title: 'Crawl Space Pest Problems and Moisture Conditions | CrawlWise', description: 'Understand how crawl space moisture, damaged insulation, openings, and wood deterioration can overlap with pest activity.' },
  { path: '/crawl-space-problems/', page: 'hub', title: 'Crawl Space Problems, Repair Guides, and Costs | CrawlWise', description: 'Browse crawl space problem guides covering water, moisture, mold, vapor barriers, pests, structural warning signs, repairs, and costs.' },
  { path: '/find-help/', page: 'find-help', title: 'Find Crawl Space Help and Prepare for an Inspection | CrawlWise', description: 'Describe your crawl space symptoms, learn which professional may be appropriate, and prepare questions for repair estimates and inspections.' },
  { path: '/about/', page: 'about', title: 'About CrawlWise | Homeowner Crawl Space Education', description: 'Learn how CrawlWise helps homeowners understand crawl space symptoms, repair options, costs, and questions to ask qualified professionals.' },
  { path: '/editorial-policy/', page: 'editorial-policy', title: 'Editorial Policy | CrawlWise', description: 'Read the CrawlWise editorial mission, content process, review standards, cost methodology, disclosures, and correction practices.' },
  { path: '/privacy-policy/', page: 'privacy-policy', title: 'Privacy Policy | CrawlWise', description: 'Read how CrawlWise describes information collection, use, sharing, cookies, analytics, choices, and privacy contact options.' }
];

const pageToPath = Object.fromEntries(routes.map(route => [route.page, route.path]));
const pageIds = routes.map(route => route.page);

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  toggle(value, force) {
    if (force === true) this.values.add(value);
    else if (force === false) this.values.delete(value);
    else if (this.values.has(value)) this.values.delete(value);
    else this.values.add(value);
    return this.values.has(value);
  }
  contains(value) { return this.values.has(value); }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.innerHTML = '';
    this.textContent = '';
    this.classList = new FakeClassList();
    this.dataset = {};
  }
  addEventListener() {}
}

const elements = new Map(pageIds.map(id => [id, new FakeElement(id)]));
elements.set('mobileMenu', new FakeElement('mobileMenu'));
elements.set('mobileToggle', new FakeElement('mobileToggle'));

const document = {
  title: '',
  querySelector(selector) {
    return selector.startsWith('#') ? elements.get(selector.slice(1)) ?? null : null;
  },
  getElementById(id) {
    return elements.get(id) ?? null;
  },
  querySelectorAll(selector) {
    if (selector === '.page') return pageIds.map(id => elements.get(id));
    return [];
  },
  addEventListener() {}
};

const context = {
  document,
  history: { pushState() {} },
  window: {
    location: { pathname: '/' },
    addEventListener() {},
    scrollTo() {}
  },
  console
};
context.window.document = document;

const inlineScript = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!inlineScript) throw new Error('Could not locate the source rendering script.');
vm.runInNewContext(inlineScript, context, { filename: sourcePath });

const style = source.match(/<style>([\s\S]*?)<\/style>/)?.[1]?.trim();
const header = source.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[0];
const footer = source.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/)?.[0];
if (!style || !header || !footer) throw new Error('Could not extract shared page assets.');

function convertPageButtons(html) {
  return html.replace(/<button([^>]*\sdata-page="([^"]+)"[^>]*)>([\s\S]*?)<\/button>/g, (_match, attrs, page, content) => {
    const cleanAttrs = attrs.replace(/\s+type="button"/g, '');
    const href = pageToPath[page] ?? '/';
    return `<a${cleanAttrs} href="${href}">${content}</a>`;
  });
}

const sharedHeader = convertPageButtons(header);
const sharedFooter = convertPageButtons(footer);
fs.writeFileSync(path.join(root, 'styles.css'), `${style}\n`);
fs.writeFileSync(path.join(root, 'script.js'), `const toggle = document.querySelector('#mobileToggle');\nconst menu = document.querySelector('#mobileMenu');\nif (toggle && menu) {\n  toggle.addEventListener('click', () => {\n    menu.classList.toggle('open');\n    toggle.textContent = menu.classList.contains('open') ? '×' : '☰';\n  });\n}\nconst form = document.querySelector('#leadForm');\nif (form) {\n  form.addEventListener('submit', event => {\n    event.preventDefault();\n    const message = document.querySelector('#formMessage');\n    if (message) message.textContent = 'Form submitted in demo mode. Connect this form to your CRM, email service, or lead-routing backend when ready.';\n  });\n}\n`);

for (const route of routes) {
  const content = convertPageButtons(elements.get(route.page).innerHTML);
  if (!content.includes('<h1')) throw new Error(`Route ${route.path} does not contain an H1.`);

  const canonical = `https://crawlwise.io${route.path}`;
  const assetPrefix = route.path === '/' ? './' : '../';
  const html = `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${route.title}</title>\n  <meta name="description" content="${route.description}">\n  <link rel="canonical" href="${canonical}">\n  <link rel="stylesheet" href="${assetPrefix}styles.css">\n</head>\n<body>\n${sharedHeader}\n  <main>\n    <div id="${route.page}" class="page active">${content}</div>\n  </main>\n${sharedFooter}\n  <script src="${assetPrefix}script.js" defer></script>\n</body>\n</html>\n`;

  const outputPath = route.path === '/'
    ? path.join(root, 'index.html')
    : path.join(root, route.path.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
}

console.log(`Generated ${routes.length} static pages.`);
