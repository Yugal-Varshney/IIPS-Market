/**
 * item.js — Campus Market listing detail page.
 */

(function () {
  const id = new URLSearchParams(window.location.search).get('id');
  let item = null;
  let currentUser = null;
  let wishlisted = false;
  let starting = false;

  const loadingEl = document.getElementById('detail-loading');
  const notFoundEl = document.getElementById('detail-notfound');
  const contentEl = document.getElementById('detail-content');

  function renderContent() {
    document.title = `${item.title} — Campus Market`;
    document.getElementById('detail-category').textContent = categoryLabel(item.category);

    const mediaEl = document.getElementById('detail-media');
    mediaEl.innerHTML = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />`
      : `<div class="item-media-empty">No photo yet</div>`;

    const st = statusInfo(item);
    mediaEl.classList.toggle('is-done', st.done);
    const badgeEl = document.getElementById('detail-type-badge');
    badgeEl.textContent = st.label;
    badgeEl.className = `item-type-badge ${st.cls}`;

    document.getElementById('detail-meta').textContent = `${categoryLabel(item.category)} · ${conditionLabel(item.condition)}`;
    document.getElementById('detail-title').textContent = item.title;
    document.getElementById('detail-price').textContent = formatPrice(item.price);
    document.getElementById('detail-price-unit').classList.toggle('hidden', item.listing_type !== 'rent');
    document.getElementById('detail-condition').textContent = conditionLabel(item.condition);
    document.getElementById('detail-seller').textContent = item.seller_name;
    document.getElementById('detail-description').textContent = item.description;
    document.getElementById('detail-posted').textContent = `Posted ${timeAgo(item.created_at)} · Meet on campus, verify before you pay`;

    document.getElementById('detail-price').classList.toggle('is-done', st.done);
    renderWishlistButton();
    renderActions();

    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');
  }

  function isOwner() {
    return !!(currentUser && item.seller_id && String(item.seller_id) === String(currentUser.id));
  }

  /** Shows buyer buttons, seller controls, or a "no longer available" banner. */
  function renderActions() {
    const st = statusInfo(item);
    const isRent = item.listing_type === 'rent';
    const banner = document.getElementById('status-banner');
    const ownerPanel = document.getElementById('owner-panel');
    const buyerActions = document.getElementById('buyer-actions');
    const contactCard = document.getElementById('contact-card');
    const contactBtn = document.getElementById('contact-seller-btn');

    // Banner for finished listings
    banner.classList.toggle('hidden', !st.done);
    if (st.done) {
      banner.textContent = item.status === 'sold'
        ? 'This item has been sold and is no longer available.'
        : 'This item is currently rented out and not available right now.';
      contactCard.classList.add('hidden');
    }

    // Seller controls
    ownerPanel.classList.toggle('hidden', !isOwner());
    if (isOwner()) {
      const doneBtn = document.getElementById('mark-done-btn');
      const activeBtn = document.getElementById('mark-active-btn');
      document.getElementById('owner-hint').textContent = st.done
        ? `This listing is marked ${item.status}. The photo is shown in greyscale on the board.`
        : `Once ${isRent ? 'rented out' : 'sold'}, mark it so other students know.`;
      doneBtn.textContent = isRent ? 'MARK AS RENTED' : 'MARK AS SOLD';
      doneBtn.classList.toggle('hidden', st.done);
      activeBtn.textContent = isRent ? 'MARK AVAILABLE FOR RENT AGAIN' : 'MARK FOR SALE AGAIN';
      activeBtn.classList.toggle('hidden', !st.done);
    }

    // Buyer buttons: hidden for the owner and for finished listings
    buyerActions.classList.toggle('hidden', isOwner() || st.done);
    contactBtn.textContent = isRent ? 'CONTACT OWNER TO RENT' : 'CONTACT SELLER TO BUY';
    document.getElementById('message-seller-btn').classList.toggle('hidden', !item.seller_id);
  }

  async function setStatus(status) {
    try {
      await apiPostJson('update_status.php', { item_id: item.id, status });
      item.status = status;
      toast.success(
        status === 'active' ? 'Listing is available again.'
          : status === 'sold' ? 'Marked as sold.' : 'Marked as rented.'
      );
      renderContent();
    } catch (err) {
      toast.error(err.message || 'Could not update the listing.');
    }
  }

  async function showContact() {
    if (!currentUser) {
      toast.info('Sign in with your college email to see seller contact details.');
      window.location.href = 'login.html';
      return;
    }
    const btn = document.getElementById('contact-seller-btn');
    btn.disabled = true;
    try {
      const c = await apiGet(`get_contact.php?id=${encodeURIComponent(item.id)}`);
      document.getElementById('contact-name').textContent = c.name;
      const mail = document.getElementById('contact-email');
      mail.textContent = c.email || 'Not provided';
      mail.href = c.email ? `mailto:${c.email}` : '#';
      const phoneRow = document.getElementById('contact-phone-row');
      const phone = document.getElementById('contact-phone');
      phoneRow.classList.toggle('hidden', !c.phone);
      if (c.phone) {
        phone.textContent = c.phone;
        phone.href = `tel:${c.phone.replace(/[^0-9+]/g, '')}`;
      }
      document.getElementById('contact-card').classList.remove('hidden');
    } catch (err) {
      toast.error(err.message || 'Could not load contact details.');
    } finally {
      btn.disabled = false;
    }
  }

  function renderWishlistButton() {
    const btn = document.getElementById('detail-wishlist-btn');
    btn.classList.toggle('active', wishlisted);
    btn.setAttribute('aria-label', wishlisted ? 'Remove from wishlist' : 'Save to wishlist');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="${wishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>`;
  }

  async function toggleWishlist() {
    if (!currentUser) {
      toast.info('Sign in to save items to your wishlist.');
      return;
    }
    try {
      if (wishlisted) {
        await apiPostJson('wishlist.php?action=remove', { item_id: item.id });
      } else {
        await apiPostJson('wishlist.php?action=add', { item_id: item.id });
      }
      wishlisted = !wishlisted;
      renderWishlistButton();
      document.dispatchEvent(new CustomEvent('cm:wishlist-changed'));
    } catch {
      toast.error('Could not update your wishlist.');
    }
  }

  async function messageSeller() {
    if (starting) return;
    if (!currentUser) {
      toast.info('Sign in with your college email to message the seller.');
      window.location.href = 'login.html';
      return;
    }
    if (!item.seller_id) {
      toast.info('This is a showcase listing. Post your own item to start real chats with students.');
      return;
    }
    if (String(item.seller_id) === String(currentUser.id)) {
      toast.info('This is your own listing.');
      return;
    }
    starting = true;
    const btn = document.getElementById('message-seller-btn');
    btn.disabled = true;
    btn.textContent = '…';
    try {
      const res = await apiPostJson('messages.php?action=start', { item_id: item.id });
      window.location.href = `messages.html?c=${encodeURIComponent(res.id)}`;
    } catch (err) {
      toast.error(err.message || 'Could not start the chat. Try again.');
      btn.disabled = false;
      btn.textContent = 'CHAT';
      starting = false;
    }
  }

  async function init() {
    if (!id) {
      loadingEl.classList.add('hidden');
      notFoundEl.classList.remove('hidden');
      return;
    }

    try {
      const session = await getSession();
      currentUser = session.user;
    } catch {
      currentUser = null;
    }

    try {
      const res = await apiGet(`get_item.php?id=${encodeURIComponent(id)}`);
      item = res.item;
    } catch {
      item = null;
    }

    if (!item) {
      loadingEl.classList.add('hidden');
      notFoundEl.classList.remove('hidden');
      return;
    }

    if (currentUser) {
      try {
        const ids = await apiGet('wishlist.php?action=ids');
        wishlisted = ids.includes(item.id);
      } catch {
        wishlisted = false;
      }
    }

    renderContent();

    document.getElementById('detail-wishlist-btn').addEventListener('click', toggleWishlist);
    document.getElementById('message-seller-btn').addEventListener('click', messageSeller);
    document.getElementById('contact-seller-btn').addEventListener('click', showContact);
    document.getElementById('mark-done-btn').addEventListener('click', () =>
      setStatus(item.listing_type === 'rent' ? 'rented' : 'sold'));
    document.getElementById('mark-active-btn').addEventListener('click', () => setStatus('active'));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
