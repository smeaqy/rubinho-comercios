/* =============================================================================
   Rubinho Comércios — site.js
   Comportamentos compartilhados: navegação, catálogo, filtros e modal de produto
   ========================================================================== */

export const CONFIG = {
  whatsapp: '5583986616556',
  whatsappLabel: '(83) 98661-6556',
  instagram: 'https://www.instagram.com/rubinhocomercios/',
  instagramLabel: '@rubinhocomercios',
  storeName: 'Rubinho Comércios',
};

export const CATEGORIES = {
  carros: { label: 'Carros', plural: 'carros', description: 'Seminovos revisados, procedência e financiamento na hora.' },
  rodas: { label: 'Rodas', plural: 'jogos de rodas', description: 'Aros originais e esportivos, com instalação e troca.' },
  iphones: { label: 'iPhones', plural: 'iPhones', description: 'Aparelhos testados, com garantia e aceito o seu na troca.' },
  ouro: { label: 'Ouro', plural: 'peças em ouro', description: 'Joias 18k com laudo. Compramos ouro e joias usadas.' },
};

export const CONDITION_LABELS = {
  novo: 'Novo',
  seminovo: 'Seminovo',
  usado: 'Usado',
};

const PLACEHOLDERS = {
  carros: '/assets/img/placeholder-carros.svg',
  rodas: '/assets/img/placeholder-rodas.svg',
  iphones: '/assets/img/placeholder-iphones.svg',
  ouro: '/assets/img/placeholder-ouro.svg',
};

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function money(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function priceLabel(product) {
  if (product.priceType === 'consult' || product.price === null) return 'Sob consulta';
  if (product.priceType === 'from') return `A partir de ${money(product.price)}`;
  return money(product.price);
}

export function installmentLabel(product) {
  const count = Number(product.installments);
  if (!count || count < 2) return '';
  if (product.priceType === 'consult') return '';
  const custom = Number(product.installmentValue);
  if (Number.isFinite(custom) && custom > 0) return `${count}x de ${money(custom)}`;
  if (!product.price) return '';
  const each = product.price / count;
  if (!Number.isFinite(each) || each <= 0) return '';
  return `${count}x de ${money(each)}`;
}

export function productImage(product) {
  return product.image || PLACEHOLDERS[product.category] || PLACEHOLDERS.carros;
}

export function whatsappLink(product) {
  const category = CATEGORIES[product.category]?.label || 'produto';
  const message = product
    ? `Olá, Rubinho! Vi o ${product.title} (${category}) no site e quero saber mais.`
    : 'Olá, Rubinho! Quero falar sobre um produto do site.';
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function sellWhatsappLink() {
  const message = 'Olá, Rubinho! Quero vender meu produto. Podem avaliar para mim?';
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function contactWhatsappLink() {
  const message = 'Olá, Rubinho! Vim pelo site e quero falar com você.';
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

export async function fetchProducts() {
  const response = await fetch('/api/products', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Não foi possível carregar o catálogo.');
  const data = await response.json();
  return Array.isArray(data.products) ? data.products : [];
}

/* ------------------------------- Header ---------------------------------- */

function initHeader() {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');

  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('[data-whatsapp-link]').forEach((link) => {
    link.href = contactWhatsappLink();
  });

  document.querySelectorAll('[data-sell-link]').forEach((link) => {
    link.href = sellWhatsappLink();
  });

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

/* ------------------------------ Product card ------------------------------ */

const WA_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.94.54 3.75 1.48 5.3L2 22l4.98-1.62a9.8 9.8 0 0 0 5.06 1.4c5.44 0 9.84-4.4 9.84-9.84S17.48 2 12.04 2Zm5.72 13.9c-.24.68-1.4 1.3-1.94 1.36-.54.06-1.04.24-3.5-.72-2.96-1.16-4.82-4.2-4.96-4.4-.14-.2-1.16-1.56-1.16-2.98 0-1.42.74-2.12 1-2.42.26-.3.56-.38.74-.38h.54c.18 0 .42-.06.66.5.24.58.82 2 .9 2.14.08.14.12.3.02.5-.1.2-.16.32-.32.5-.16.18-.34.4-.48.54-.16.16-.32.34-.14.66.18.32.8 1.32 1.72 2.14 1.18 1.04 2.16 1.38 2.46 1.54.3.16.48.14.66-.06.18-.2.76-.88.96-1.18.2-.3.4-.24.68-.14.28.1 1.74.82 2.04.96.3.14.5.22.58.34.08.12.08.7-.16 1.38Z"/></svg>';

export function productCard(product) {
  const category = CATEGORIES[product.category]?.label || 'Produto';
  const condition = CONDITION_LABELS[product.condition] || '';
  const meta = [category, condition].filter(Boolean).join(' · ');

  return `
    <article class="product-card">
      <a class="product-media" href="#" data-open-product="${escapeHtml(product.id)}" aria-label="Ver detalhes de ${escapeHtml(product.title)}">
        <img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(product.title)}" loading="lazy" width="800" height="600">
        <span class="product-badges">
          ${product.featured ? '<span class="product-badge">Destaque</span>' : ''}
          ${condition ? `<span class="product-badge product-badge--muted">${escapeHtml(condition)}</span>` : ''}
        </span>
      </a>
      <div class="product-body">
        <span class="product-cat">${escapeHtml(meta)}</span>
        <h3>${escapeHtml(product.title)}</h3>
        <div class="product-price">
          ${escapeHtml(priceLabel(product))}
          ${installmentLabel(product) ? `<small class="product-installment">ou ${escapeHtml(installmentLabel(product))}</small>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn--ghost btn--sm" type="button" data-open-product="${escapeHtml(product.id)}">Ver detalhes</button>
          <a class="btn btn--wa btn--sm btn-icon-wa" href="${whatsappLink(product)}" target="_blank" rel="noopener" aria-label="Chamar no WhatsApp sobre ${escapeHtml(product.title)}">${WA_ICON}</a>
        </div>
      </div>
    </article>
  `;
}

/* -------------------------------- Modal ---------------------------------- */

function buildModal() {
  const wrapper = document.createElement('div');
  wrapper.className = 'modal';
  wrapper.id = 'product-modal';
  wrapper.setAttribute('role', 'dialog');
  wrapper.setAttribute('aria-modal', 'true');
  wrapper.setAttribute('aria-label', 'Detalhes do produto');
  wrapper.innerHTML = `
    <div class="modal-backdrop" data-close-modal></div>
    <div class="modal-card">
      <button class="modal-close" type="button" data-close-modal aria-label="Fechar">✕</button>
      <div class="modal-media"><img alt="" id="modal-image"></div>
      <div class="modal-body">
        <span class="product-cat" id="modal-category"></span>
        <h2 id="modal-title"></h2>
        <div class="product-price">
          <span id="modal-price"></span>
          <small class="product-installment" id="modal-installment" hidden></small>
        </div>
        <p id="modal-description"></p>
        <div class="modal-specs" id="modal-specs"></div>
        <div class="modal-actions">
          <a class="btn btn--wa" id="modal-wa" target="_blank" rel="noopener">Falar no WhatsApp</a>
          <button class="btn btn--ghost" type="button" data-close-modal>Fechar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);
  return wrapper;
}

function initModal(products) {
  const modal = document.querySelector('#product-modal') || buildModal();
  const image = modal.querySelector('#modal-image');
  const category = modal.querySelector('#modal-category');
  const title = modal.querySelector('#modal-title');
  const price = modal.querySelector('#modal-price');
  const installment = modal.querySelector('#modal-installment');
  const description = modal.querySelector('#modal-description');
  const specs = modal.querySelector('#modal-specs');
  const wa = modal.querySelector('#modal-wa');

  let lastFocus = null;

  const close = () => {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };

  modal.querySelectorAll('[data-close-modal]').forEach((node) => node.addEventListener('click', close));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-product]');
    if (!trigger) return;
    event.preventDefault();

    const product = products.find((item) => item.id === trigger.dataset.openProduct);
    if (!product) return;

    lastFocus = trigger;
    image.src = productImage(product);
    image.alt = product.title;
    category.textContent = [CATEGORIES[product.category]?.label, CONDITION_LABELS[product.condition]]
      .filter(Boolean)
      .join(' · ');
    title.textContent = product.title;
    price.textContent = priceLabel(product);
    const installmentText = installmentLabel(product);
    installment.textContent = installmentText ? `ou ${installmentText}` : '';
    installment.hidden = !installmentText;
    description.textContent = product.description || 'Fale com a gente no WhatsApp para mais informações.';
    wa.href = whatsappLink(product);

    const details = [];
    if (product.year) details.push(['Ano/Modelo', product.year]);
    if (product.condition && CONDITION_LABELS[product.condition]) details.push(['Estado', CONDITION_LABELS[product.condition]]);
    details.push(['Categoria', CATEGORIES[product.category]?.label || '—']);
    if (installmentText) details.push(['Parcelamento', `até ${product.installments}x`]);
    details.push(['Atendimento', 'WhatsApp e loja']);

    specs.innerHTML = details
      .map(([label, value]) => `<div><strong>${escapeHtml(value)}</strong>${escapeHtml(label)}</div>`)
      .join('');

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close')?.focus();
  });
}

/* -------------------------------- Home ----------------------------------- */

async function initHome() {
  const grid = document.querySelector('[data-featured-grid]');
  const categoryCounts = document.querySelectorAll('[data-category-count]');
  const totalNode = document.querySelector('[data-total-count]');

  grid.innerHTML = Array.from({ length: 4 }, () => '<div class="skeleton-card"></div>').join('');
  if (totalNode) totalNode.textContent = '…';

  let products = [];
  try {
    products = await fetchProducts();
  } catch {
    grid.innerHTML = `
      <div class="empty-state">
        <strong>Catálogo temporariamente indisponível</strong>
        Fale com a gente no WhatsApp que enviamos as opções atualizadas.
      </div>`;
    return;
  }

  const featured = products.filter((product) => product.featured);
  const list = (featured.length ? featured : products).slice(0, 8);

  grid.innerHTML = list.length
    ? list.map(productCard).join('')
    : `<div class="empty-state"><strong>Novidades chegando</strong>Estamos atualizando o catálogo. Chame no WhatsApp para ver as peças disponíveis hoje.</div>`;

  categoryCounts.forEach((node) => {
    const key = node.dataset.categoryCount;
    const count = products.filter((product) => product.category === key).length;
    node.textContent = count === 1 ? '1 item disponível' : `${count} itens disponíveis`;
  });

  if (totalNode) totalNode.textContent = String(products.length);

  initModal(products);
}

/* ------------------------------- Catalog --------------------------------- */

function initCatalog(products) {
  const grid = document.querySelector('[data-catalog-grid]');
  const chips = document.querySelectorAll('[data-filter-category]');
  const search = document.querySelector('[data-filter-search]');
  const sort = document.querySelector('[data-filter-sort]');
  const countNode = document.querySelector('[data-results-count]');

  const params = new URLSearchParams(window.location.search);
  let activeCategory = params.get('categoria') || 'todos';

  const applyChipState = () => {
    chips.forEach((chip) => {
      const isActive = chip.dataset.filterCategory === activeCategory;
      chip.classList.toggle('is-active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
    });
  };

  const render = () => {
    const term = (search?.value || '').toLowerCase().trim();

    let list = products.filter((product) => {
      const matchCategory = activeCategory === 'todos' || product.category === activeCategory;
      if (!matchCategory) return false;
      if (!term) return true;
      return `${product.title} ${product.description} ${product.year}`.toLowerCase().includes(term);
    });

    if (sort?.value === 'menor-preco') {
      list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    } else if (sort?.value === 'maior-preco') {
      list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    }

    grid.innerHTML = list.length
      ? list.map(productCard).join('')
      : `<div class="empty-state"><strong>Nada por aqui ainda</strong>Não encontramos produtos com esse filtro. Fale no WhatsApp que buscamos para você.</div>`;

    if (countNode) {
      countNode.textContent = list.length === 1 ? '1 produto encontrado' : `${list.length} produtos encontrados`;
    }

    const url = new URL(window.location.href);
    if (activeCategory === 'todos') url.searchParams.delete('categoria');
    else url.searchParams.set('categoria', activeCategory);
    window.history.replaceState({}, '', url);
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.filterCategory;
      applyChipState();
      render();
    });
  });

  search?.addEventListener('input', render);
  sort?.addEventListener('change', render);

  applyChipState();
  render();
  initModal(products);
}

/* -------------------------------- Boot ----------------------------------- */

async function boot() {
  initHeader();
  const page = document.body.dataset.page;

  if (page === 'home') {
    await initHome();
    return;
  }

  if (page === 'catalog') {
    const grid = document.querySelector('[data-catalog-grid]');
    grid.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton-card"></div>').join('');

    try {
      const products = await fetchProducts();
      initCatalog(products);
    } catch {
      grid.innerHTML = `
        <div class="empty-state">
          <strong>Não conseguimos carregar o catálogo</strong>
          Recarregue a página ou chame no WhatsApp para receber as opções do dia.
        </div>`;
    }
  }
}

boot();
