/**
 * wishlist.js — powers pages/wishlist.html.
 */

(function () {
  const loadingEl = document.getElementById('wishlist-loading');
  const emptyEl = document.getElementById('wishlist-empty');
  const gridEl = document.getElementById('wishlist-grid');
  const countBadge = document.getElementById('wishlist-count-badge');

  function render(items) {
    countBadge.textContent = `${items.length} SAVED`;
    loadingEl.classList.add('hidden');

    if (items.length === 0) {
      emptyEl.classList.remove('hidden');
      gridEl.classList.add('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    gridEl.classList.remove('hidden');
    gridEl.innerHTML = items.map((item, index) => renderItemCard(item, true, index)).join('');
  }

  async function removeItem(itemId) {
    try {
      await apiPostJson('wishlist.php?action=remove', { item_id: itemId });
      document.dispatchEvent(new CustomEvent('cm:wishlist-changed'));
      await load();
    } catch {
      toast.error('Could not update your wishlist.');
    }
  }

  gridEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    event.preventDefault();
    removeItem(btn.getAttribute('data-wishlist-toggle'));
  });

  async function load() {
    try {
      const items = await apiGet('wishlist.php?action=items');
      render(items);
    } catch {
      render([]);
    }
  }

  async function init() {
    const user = await requireAuthOrRedirect();
    if (!user) return;
    loadingEl.innerHTML = renderSkeletonCards(4);
    await load();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
