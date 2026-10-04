/**
 * main.js — Campus Market homepage (browse/filter grid).
 * Fetches all active items once, then filters/sorts entirely client-side,
 * mirroring the original React app's useMemo-based filtering.
 */

(function () {
  let allItems = [];
  let wishlistIds = new Set();
  let currentUser = null;

  const state = {
    q: new URLSearchParams(window.location.search).get('q') || '',
    categories: [],
    maxPrice: 5000,
    sort: 'newest',
  };

  const loadingEl = document.getElementById('listings-loading');
  const errorEl = document.getElementById('listings-error');
  const emptyEl = document.getElementById('listings-empty');
  const gridEl = document.getElementById('listings-grid');
  const countBadge = document.getElementById('item-count-badge');
  const categoryFiltersEl = document.getElementById('category-filters');
  const priceRangeInput = document.getElementById('price-range');
  const priceRangeLabel = document.getElementById('price-range-label');
  const sortSelect = document.getElementById('sort-select');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');

  function renderCategoryFilters() {
    categoryFiltersEl.innerHTML = CATEGORIES.map(
      (c) => `
        <label class="checkbox-row">
          <input type="checkbox" value="${c.value}" />
          <span>${c.label}</span>
        </label>
      `
    ).join('');
    categoryFiltersEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) state.categories.push(input.value);
        else state.categories = state.categories.filter((v) => v !== input.value);
        applyFilters();
      });
    });
  }

  function getFiltered() {
    const needle = state.q.trim().toLowerCase();
    let list = allItems.filter((item) => {
      if (state.categories.length > 0 && !state.categories.includes(item.category)) return false;
      if (Number(item.price) > state.maxPrice) return false;
      if (
        needle &&
        !`${item.title} ${item.description} ${item.seller_name}`.toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
    if (state.sort === 'price-asc') list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    else if (state.sort === 'price-desc') list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
    return list;
  }

  function applyFilters() {
    const filtered = getFiltered();
    countBadge.textContent = `${filtered.length} ITEMS FOUND`;

    if (filtered.length === 0) {
      emptyEl.classList.remove('hidden');
      gridEl.classList.add('hidden');
      gridEl.innerHTML = '';
      return;
    }

    emptyEl.classList.add('hidden');
    gridEl.classList.remove('hidden');
    gridEl.innerHTML = filtered
      .map((item, index) => renderItemCard(item, wishlistIds.has(item.id), index))
      .join('');
  }

  async function toggleWishlist(itemId) {
    if (!currentUser) {
      toast.info('Sign in with your college email to save items to your wishlist.');
      return;
    }
    const isSaved = wishlistIds.has(itemId);
    try {
      if (isSaved) {
        await apiPostJson('wishlist.php?action=remove', { item_id: itemId });
        wishlistIds.delete(itemId);
      } else {
        await apiPostJson('wishlist.php?action=add', { item_id: itemId });
        wishlistIds.add(itemId);
      }
      applyFilters();
      document.dispatchEvent(new CustomEvent('cm:wishlist-changed'));
    } catch {
      toast.error('Could not update your wishlist. Try again.');
    }
  }

  gridEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    event.preventDefault();
    toggleWishlist(btn.getAttribute('data-wishlist-toggle'));
  });

  priceRangeInput.addEventListener('input', () => {
    state.maxPrice = Number(priceRangeInput.value);
    priceRangeLabel.textContent = `up to ₹${state.maxPrice.toLocaleString('en-IN')}`;
    applyFilters();
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    applyFilters();
  });

  clearFiltersBtn.addEventListener('click', () => {
    state.categories = [];
    state.maxPrice = 5000;
    categoryFiltersEl.querySelectorAll('input[type="checkbox"]').forEach((i) => (i.checked = false));
    priceRangeInput.value = 5000;
    priceRangeLabel.textContent = 'up to ₹5,000';
    applyFilters();
  });

  async function init() {
    renderCategoryFilters();

    try {
      const session = await getSession();
      currentUser = session.user;
    } catch {
      currentUser = null;
    }

    try {
      allItems = await apiGet('get_items.php');
    } catch {
      loadingEl.classList.add('hidden');
      errorEl.classList.remove('hidden');
      return;
    }

    if (currentUser) {
      try {
        const ids = await apiGet('wishlist.php?action=ids');
        wishlistIds = new Set(ids);
      } catch {
        wishlistIds = new Set();
      }
    }

    loadingEl.classList.add('hidden');
    applyFilters();
  }

  loadingEl.innerHTML = renderSkeletonCards(6);
  document.addEventListener('DOMContentLoaded', init);
})();
