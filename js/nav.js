/**
 * nav.js — wires up the static navbar markup that's duplicated on every
 * page (search form, sign-in vs avatar state, wishlist badge, sign out,
 * floating chat dock).
 */

(function () {
  async function initNav() {
    const searchForm = document.querySelector('.search-form');
    const searchInput = document.querySelector('.search-input');
    const params = new URLSearchParams(window.location.search);
    if (searchInput && params.get('q')) {
      searchInput.value = params.get('q');
    }
    if (searchForm) {
      searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const q = searchInput.value.trim();
        const url = new URL('index.html', window.location.href);
        if (q) url.searchParams.set('q', q);
        window.location.href = url.pathname + url.search;
      });
    }

    let session;
    try {
      session = await getSession();
    } catch {
      session = { user: null };
    }
    const user = session.user;
    if (!user && !document.body.hasAttribute('data-public')) {
      window.location.replace(getRelativePath('pages/login.html'));
      return;
    }

    const signinLink = document.querySelector('.signin-link');
    const userMenu = document.querySelector('.user-menu');
    const chatDock = document.querySelector('.chat-dock');

    if (user) {
      if (signinLink) signinLink.classList.add('hidden');
      if (userMenu) {
        userMenu.classList.remove('hidden');
        const avatar = userMenu.querySelector('.user-avatar');
        const emailEl = userMenu.querySelector('.user-dropdown-email');
        if (avatar) avatar.textContent = (user.email || 'S')[0].toUpperCase();
        if (emailEl) emailEl.textContent = user.email || '';

        avatar?.addEventListener('click', (event) => {
          event.stopPropagation();
          userMenu.classList.toggle('open');
        });
        document.addEventListener('click', () => userMenu.classList.remove('open'));

        const signOutBtn = userMenu.querySelector('.sign-out-btn');
        signOutBtn?.addEventListener('click', async () => {
          try {
            await apiPostJson('auth.php?action=logout', {});
          } catch {
            /* ignore */
          }
          invalidateSession();
          window.location.href = getRelativePath('pages/login.html');
        });
      }
      if (chatDock) chatDock.classList.add('visible');

      try {
        const ids = await apiGet('wishlist.php?action=ids');
        updateWishlistBadge(ids.length);
      } catch {
        updateWishlistBadge(0);
      }
    } else {
      if (signinLink) signinLink.classList.remove('hidden');
      if (userMenu) userMenu.classList.add('hidden');
      if (chatDock) chatDock.classList.remove('visible');
      updateWishlistBadge(0);
    }

    document.dispatchEvent(new CustomEvent('cm:session-ready', { detail: { user } }));
  }

  function updateWishlistBadge(count) {
    const badge = document.querySelector('.wishlist-badge-count');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function getRelativePath(fromRoot) {
    // Pages live in /pages/, so a root-relative link like "pages/login.html"
    // becomes "login.html" when we're already inside /pages/.
    if (window.location.pathname.includes('/pages/')) {
      return fromRoot.replace(/^pages\//, '');
    }
    return fromRoot;
  }

  document.addEventListener('DOMContentLoaded', initNav);
})();
