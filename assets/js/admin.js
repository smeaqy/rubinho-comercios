/* =============================================================================
   Rubinho Comércios — admin.js
   Login, catálogo (CRUD), upload de imagens e sessão do painel
   ========================================================================== */

const CATEGORY_LABELS = {
  carros: 'Carros',
  rodas: 'Rodas',
  iphones: 'iPhones',
  ouro: 'Ouro',
};

const CONDITION_LABELS = {
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

const state = {
  products: [],
  editingId: null,
  query: '',
};

const el = {
  loginView: document.querySelector('#login-view'),
  loginForm: document.querySelector('#login-form'),
  loginError: document.querySelector('#login-error'),
  loginSubmit: document.querySelector('#login-submit'),
  shell: document.querySelector('#admin-shell'),
  logout: document.querySelector('#logout-btn'),
  list: document.querySelector('#admin-list'),
  search: document.querySelector('#admin-search'),
  refresh: document.querySelector('#refresh-btn'),
  newProduct: document.querySelector('#new-product-btn'),
  drawer: document.querySelector('#product-drawer'),
  drawerTitle: document.querySelector('#drawer-title'),
  form: document.querySelector('#product-form'),
  formError: document.querySelector('#form-error'),
  save: document.querySelector('#save-product-btn'),
  preview: document.querySelector('#image-preview'),
  imageFile: document.querySelector('#f-image-file'),
  clearImage: document.querySelector('#clear-image'),
  toasts: document.querySelector('#toast-stack'),
  stats: {
    total: document.querySelector('#stat-total'),
    published: document.querySelector('#stat-published'),
    drafts: document.querySelector('#stat-drafts'),
    featured: document.querySelector('#stat-featured'),
  },
};

const fields = {
  title: document.querySelector('#f-title'),
  category: document.querySelector('#f-category'),
  condition: document.querySelector('#f-condition'),
  priceType: document.querySelector('#f-price-type'),
  price: document.querySelector('#f-price'),
  year: document.querySelector('#f-year'),
  installments: document.querySelector('#f-installments'),
  installmentValue: document.querySelector('#f-installment-value'),
  description: document.querySelector('#f-description'),
  image: document.querySelector('#f-image'),
  featured: document.querySelector('#f-featured'),
  published: document.querySelector('#f-published'),
};

/* -------------------------------- Helpers -------------------------------- */

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
    Number(value) || 0,
  );
}

function priceLabel(product) {
  if (product.priceType === 'consult' || product.price === null) return 'Sob consulta';
  if (product.priceType === 'from') return `A partir de ${money(product.price)}`;
  return money(product.price);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(message, type = 'ok') {
  const node = document.createElement('div');
  node.className = `toast toast--${type}`;
  node.textContent = message;
  el.toasts.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function showFormError(message) {
  if (!message) {
    el.formError.classList.remove('is-visible');
    el.formError.textContent = '';
    return;
  }
  el.formError.textContent = message;
  el.formError.classList.add('is-visible');
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error((data && data.error) || 'Não foi possível concluir a operação.');
    error.status = response.status;
    throw error;
  }

  return data;
}

/* --------------------------------- Auth ---------------------------------- */

async function checkSession() {
  try {
    const session = await api('/api/session');
    if (session.admin) {
      showShell();
      await loadProducts();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  el.loginView.style.display = 'grid';
  el.shell.classList.remove('is-ready');
}

function showShell() {
  el.loginView.style.display = 'none';
  el.shell.classList.add('is-ready');
}

el.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  el.loginError.classList.remove('is-visible');

  const password = document.querySelector('#password').value;
  el.loginSubmit.disabled = true;
  el.loginSubmit.textContent = 'Entrando…';

  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password }) });
    el.loginForm.reset();
    showShell();
    await loadProducts();
    toast('Bem-vindo de volta!');
  } catch (error) {
    el.loginError.textContent = error.message;
    el.loginError.classList.add('is-visible');
  } finally {
    el.loginSubmit.disabled = false;
    el.loginSubmit.textContent = 'Entrar no painel';
  }
});

el.logout.addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST' });
  } catch {
    /* segue para a tela de login mesmo assim */
  }
  state.products = [];
  el.list.innerHTML = '';
  showLogin();
  toast('Sessão encerrada.');
});

/* -------------------------------- Catalog -------------------------------- */

async function loadProducts() {
  el.list.innerHTML = '<div class="skeleton-card" style="height: 84px"></div><div class="skeleton-card" style="height: 84px"></div>';

  try {
    const data = await api('/api/products');
    state.products = data.products || [];
    render();
  } catch (error) {
    if (error.status === 401) return showLogin();
    el.list.innerHTML = `<div class="empty-state"><strong>Erro ao carregar</strong>${escapeHtml(error.message)}</div>`;
  }
}

function visibleProducts() {
  const term = state.query.trim().toLowerCase();
  if (!term) return state.products;
  return state.products.filter((product) =>
    `${product.title} ${product.description} ${product.year}`.toLowerCase().includes(term),
  );
}

function render() {
  const products = visibleProducts();

  el.stats.total.textContent = String(state.products.length);
  el.stats.published.textContent = String(state.products.filter((product) => product.published).length);
  el.stats.drafts.textContent = String(state.products.filter((product) => !product.published).length);
  el.stats.featured.textContent = String(state.products.filter((product) => product.featured).length);

  if (!products.length) {
    el.list.innerHTML = `
      <div class="empty-state">
        <strong>${state.products.length ? 'Nenhum item com essa busca' : 'Catálogo vazio'}</strong>
        ${
          state.products.length
            ? 'Tente outro termo ou limpe a busca.'
            : 'Clique em “Novo produto” para cadastrar o primeiro item do catálogo.'
        }
      </div>`;
    return;
  }

  el.list.innerHTML = products
    .map((product) => {
      const image = product.image || PLACEHOLDERS[product.category] || PLACEHOLDERS.carros;
      const meta = [
        CATEGORY_LABELS[product.category] || '—',
        priceLabel(product),
        product.year,
        CONDITION_LABELS[product.condition],
      ]
        .filter(Boolean)
        .join(' · ');

      return `
        <article class="admin-item" data-id="${escapeHtml(product.id)}">
          <img src="${escapeHtml(image)}" alt="" loading="lazy">
          <div>
            <h3>
              ${escapeHtml(product.title)}
              <span class="pill ${product.published ? 'pill--ok' : 'pill--off'}">${product.published ? 'Publicado' : 'Rascunho'}</span>
              ${product.featured ? '<span class="pill pill--gold">Destaque</span>' : ''}
            </h3>
            <p>${escapeHtml(meta)}</p>
          </div>
          <div class="admin-item-actions">
            <button class="icon-btn" type="button" data-action="edit" data-id="${escapeHtml(product.id)}" title="Editar" aria-label="Editar ${escapeHtml(product.title)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4l10-10-4-4L4 16v4Z" stroke-linejoin="round"/><path d="M13.5 6.5l4 4" stroke-linecap="round"/></svg>
            </button>
            <button class="icon-btn" type="button" data-action="toggle" data-id="${escapeHtml(product.id)}" title="${product.published ? 'Despublicar' : 'Publicar'}" aria-label="${product.published ? 'Despublicar' : 'Publicar'} ${escapeHtml(product.title)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke-linejoin="round"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="icon-btn icon-btn--danger" type="button" data-action="delete" data-id="${escapeHtml(product.id)}" title="Excluir" aria-label="Excluir ${escapeHtml(product.title)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 12.5h9.4L17.5 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

el.search.addEventListener('input', () => {
  state.query = el.search.value;
  render();
});

el.refresh.addEventListener('click', () => {
  loadProducts().then(() => toast('Catálogo atualizado.'));
});

el.list.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const product = state.products.find((item) => item.id === button.dataset.id);
  if (!product) return;

  if (button.dataset.action === 'edit') return openDrawer(product);
  if (button.dataset.action === 'toggle') return togglePublished(product);
  if (button.dataset.action === 'delete') return removeProduct(product);
});

/* -------------------------------- Drawer --------------------------------- */

function setPreview(src) {
  el.preview.src = src || PLACEHOLDERS[fields.category.value] || PLACEHOLDERS.carros;
}

function openDrawer(product = null) {
  state.editingId = product ? product.id : null;
  showFormError('');
  el.drawerTitle.textContent = product ? 'Editar produto' : 'Novo produto';

  fields.title.value = product?.title || '';
  fields.category.value = product?.category || 'carros';
  fields.condition.value = product?.condition || '';
  fields.priceType.value = product?.priceType || 'fixed';
  fields.price.value = product && product.price !== null && product.price !== undefined ? String(product.price) : '';
  fields.year.value = product?.year || '';
  fields.installments.value = product?.installments ? String(product.installments) : '';
  fields.installmentValue.value = product?.installmentValue ? String(product.installmentValue).replace('.', ',') : '';
  fields.description.value = product?.description || '';
  fields.image.value = product?.image || '';
  fields.featured.checked = Boolean(product?.featured);
  fields.published.checked = product ? Boolean(product.published) : true;

  setPreview(fields.image.value);
  el.drawer.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  fields.title.focus();
}

function closeDrawer() {
  el.drawer.classList.remove('is-open');
  document.body.style.overflow = '';
  state.editingId = null;
}

el.drawer.querySelectorAll('[data-close-drawer]').forEach((node) => node.addEventListener('click', closeDrawer));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && el.drawer.classList.contains('is-open')) closeDrawer();
});

el.newProduct.addEventListener('click', () => openDrawer());

fields.category.addEventListener('change', () => {
  if (!fields.image.value) setPreview('');
});

fields.image.addEventListener('input', () => setPreview(fields.image.value.trim()));

el.clearImage.addEventListener('click', () => {
  fields.image.value = '';
  setPreview('');
});

el.imageFile.addEventListener('change', async () => {
  const file = el.imageFile.files?.[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    toast('Imagem muito grande. O limite é 3 MB.', 'err');
    el.imageFile.value = '';
    return;
  }

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
      reader.readAsDataURL(file);
    });

    const base64 = dataUrl.split(',')[1] || '';
    toast('Enviando imagem…');
    const result = await api('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType: file.type, data: base64 }),
    });

    fields.image.value = result.url;
    setPreview(result.url);
    toast('Imagem enviada.');
  } catch (error) {
    toast(error.message || 'Não foi possível enviar a imagem.', 'err');
  } finally {
    el.imageFile.value = '';
  }
});

el.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showFormError('');

  const payload = {
    title: fields.title.value.trim(),
    category: fields.category.value,
    condition: fields.condition.value,
    priceType: fields.priceType.value,
    price: fields.priceType.value === 'consult' ? null : fields.price.value.trim(),
    year: fields.year.value.trim(),
    installments: fields.installments.value.trim(),
    installmentValue: fields.installmentValue.value.trim(),
    description: fields.description.value.trim(),
    image: fields.image.value.trim(),
    featured: fields.featured.checked,
    published: fields.published.checked,
  };

  if (payload.title.length < 3) return showFormError('Informe um título com pelo menos 3 caracteres.');
  if (payload.priceType !== 'consult' && !payload.price) return showFormError('Informe o preço ou escolha "Sob consulta".');

  el.save.disabled = true;
  el.save.textContent = 'Salvando…';

  try {
    if (state.editingId) {
      await api('/api/products', { method: 'PUT', body: JSON.stringify({ ...payload, id: state.editingId }) });
      toast('Produto atualizado.');
    } else {
      await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      toast('Produto cadastrado.');
    }

    closeDrawer();
    await loadProducts();
  } catch (error) {
    if (error.status === 401) {
      closeDrawer();
      showLogin();
      return toast('Sessão expirada. Entre novamente.', 'err');
    }
    showFormError(error.message);
  } finally {
    el.save.disabled = false;
    el.save.textContent = 'Salvar produto';
  }
});

/* ------------------------------- Actions --------------------------------- */

async function togglePublished(product) {
  try {
    await api('/api/products', {
      method: 'PUT',
      body: JSON.stringify({ id: product.id, published: !product.published }),
    });
    await loadProducts();
    toast(product.published ? 'Item movido para rascunho.' : 'Item publicado no catálogo.');
  } catch (error) {
    toast(error.message, 'err');
  }
}

async function removeProduct(product) {
  const confirmed = window.confirm(`Excluir "${product.title}"? Essa ação não pode ser desfeita.`);
  if (!confirmed) return;

  try {
    await api('/api/products', { method: 'DELETE', body: JSON.stringify({ id: product.id }) });
    await loadProducts();
    toast('Produto excluído.');
  } catch (error) {
    toast(error.message, 'err');
  }
}

/* --------------------------------- Boot ---------------------------------- */

checkSession();
