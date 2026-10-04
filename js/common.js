/**
 * common.js — shared helpers loaded on every page.
 * Talks to the PHP API under ../api/.
 */

const CATEGORIES = [
  { value: 'books', label: 'Books' },
  { value: 'notes', label: 'Notes' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'stationary', label: 'Stationary' },
];

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function conditionLabel(value) {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

function isCollegeEmail(email) {
  return /@[^@\s]+\.(edu(\.[a-z]{2})?|ac\.[a-z]{2})$/i.test(email.trim());
}

function formatPrice(price) {
  const n = Number(price);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Label + CSS class for a listing's current state. */
function statusInfo(item) {
  if (item.status === 'sold') return { label: 'SOLD', cls: 'sold', done: true };
  if (item.status === 'rented') return { label: 'RENTED', cls: 'rented-out', done: true };
  if (item.listing_type === 'rent') return { label: 'FOR RENT', cls: 'rent', done: false };
  return { label: 'FOR SALE', cls: 'sell', done: false };
}

function timeAgo(iso) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---------------------------------- Toasts ---------------------------------- */

function ensureToastContainer() {
  let el = document.querySelector('.toast-container');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

function toast(message, type = 'info') {
  const container = ensureToastContainer();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}
toast.success = (m) => toast(m, 'success');
toast.error = (m) => toast(m, 'error');
toast.info = (m) => toast(m, 'info');

/* ---------------------------------- Icons (inline SVG, lucide-style) ---------------------------------- */

const ICON_HEART = (filled) => `<svg viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>`;

const ICON_IMAGE_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9.5"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;

const ICON_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

/* ---------------------------------- Item card rendering (shared) ---------------------------------- */

function renderItemCard(item, wishlisted, index) {
  const delay = Math.min(index, 8) * 50;
  const media = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" width="600" height="750" />`
    : `<div class="item-media-empty">No photo yet</div>`;
  const st = statusInfo(item);
  const badgeClass = st.cls;
  const badgeLabel = st.label;
  const priceUnit = item.listing_type === 'rent' ? '<span class="item-price-unit">per week</span>' : '';

  return `
    <article class="item-card${st.done ? ' is-done' : ''}" style="animation-delay:${delay}ms" data-item-id="${item.id}">
      <div class="item-media-wrap">
        <a href="item.html?id=${encodeURIComponent(item.id)}" aria-label="${escapeHtml(item.title)}">
          <div class="item-media">${media}</div>
        </a>
        <span class="item-type-badge ${badgeClass}">${badgeLabel}</span>
        <button type="button" class="wishlist-btn${wishlisted ? ' active' : ''}" data-wishlist-toggle="${item.id}"
          aria-label="${wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}">
          ${ICON_HEART(wishlisted)}
        </button>
      </div>
      <div class="item-info">
        <div class="item-info-main">
          <p class="item-category-label">${escapeHtml(categoryLabel(item.category))}</p>
          <h3><a href="item.html?id=${encodeURIComponent(item.id)}" class="item-title-link">${escapeHtml(item.title)}</a></h3>
          <p class="item-seller-line">Listed by: <span>${escapeHtml(item.seller_name)}</span></p>
        </div>
        <div class="item-price-block">
          <span class="item-price">${formatPrice(item.price)}</span>
          ${priceUnit}
        </div>
      </div>
    </article>
  `;
}

function renderSkeletonCards(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-pulse">
        <div class="item-media skeleton"></div>
        <div class="skeleton" style="margin-top:1rem;height:1rem;width:66%;"></div>
        <div class="skeleton" style="margin-top:0.5rem;height:0.75rem;width:33%;"></div>
      </div>
    `;
  }
  return html;
}

/* ---------------------------------- Auth guard for protected pages ---------------------------------- */

async function requireAuthOrRedirect() {
  try {
    const { user } = await getSession();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  } catch {
    window.location.href = 'login.html';
    return null;
  }
}
