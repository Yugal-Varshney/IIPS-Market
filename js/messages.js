/**
 * messages.js — powers pages/messages.html.
 * Polls for new messages every few seconds in place of Supabase Realtime.
 */

(function () {
  let currentUser = null;
  let conversations = [];
  let selectedId = null;
  let pollTimer = null;

  const listEl = document.getElementById('conversation-list');
  const countEl = document.getElementById('conversation-count');
  const placeholderEl = document.getElementById('chat-placeholder');
  const panelEl = document.getElementById('chat-panel');
  const threadEl = document.getElementById('chat-thread');
  const titleEl = document.getElementById('chat-item-title');
  const otherPartyEl = document.getElementById('chat-other-party');
  const viewListingLink = document.getElementById('chat-view-listing');
  const chatForm = document.getElementById('chat-form');
  const draftInput = document.getElementById('chat-draft');

  function otherParty(c) {
    if (currentUser && String(c.buyer_id) === String(currentUser.id)) return c.item_seller_name;
    return c.buyer_name || 'Student';
  }

  function setSelected(id, pushState) {
    selectedId = id;
    const url = new URL(window.location.href);
    url.searchParams.set('c', id);
    if (pushState) window.history.pushState({}, '', url);
    renderConversationList();
    loadMessages();
  }

  function renderConversationList() {
    countEl.textContent = `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`;

    if (conversations.length === 0) {
      listEl.innerHTML = `<li><p class="conversation-empty">No chats yet — message a seller from any listing to get started.</p></li>`;
      return;
    }

    listEl.innerHTML = conversations
      .map(
        (c) => `
        <li>
          <button type="button" class="conversation-item${c.id === selectedId ? ' active' : ''}" data-conversation-id="${c.id}">
            <p class="title">${escapeHtml(c.item_title)}</p>
            <p class="subtitle">Chatting with ${escapeHtml(otherParty(c))}</p>
            <p class="time font-mono">${timeAgo(c.created_at)}</p>
          </button>
        </li>
      `
      )
      .join('');

    listEl.querySelectorAll('[data-conversation-id]').forEach((btn) => {
      btn.addEventListener('click', () => setSelected(btn.getAttribute('data-conversation-id'), true));
    });
  }

  function renderMessages(messages) {
    if (messages.length === 0) {
      threadEl.innerHTML = `<p class="chat-empty">Say hi — ask about pickup, condition, or a better price.</p>`;
      return;
    }
    threadEl.innerHTML = messages
      .map((m) => {
        const mine = currentUser && String(m.sender_id) === String(currentUser.id);
        return `
          <div class="chat-row ${mine ? 'mine' : 'theirs'}">
            <div class="chat-bubble">
              <p class="text">${escapeHtml(m.body)}</p>
              <p class="time font-mono">${timeAgo(m.created_at)}</p>
            </div>
          </div>
        `;
      })
      .join('');
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  async function loadMessages() {
    const selected = conversations.find((c) => c.id === selectedId);
    if (!selected) {
      placeholderEl.classList.remove('hidden');
      panelEl.classList.add('hidden');
      return;
    }

    placeholderEl.classList.add('hidden');
    panelEl.classList.remove('hidden');
    titleEl.textContent = selected.item_title;
    otherPartyEl.textContent = `Chatting with ${otherParty(selected)}`;
    viewListingLink.href = `item.html?id=${encodeURIComponent(selected.item_id)}`;

    try {
      const messages = await apiGet(`messages.php?action=messages&conversation_id=${encodeURIComponent(selectedId)}`);
      renderMessages(messages);
    } catch {
      /* keep whatever was shown before */
    }
  }

  async function loadConversations({ preserveSelection = true } = {}) {
    try {
      conversations = await apiGet('messages.php?action=conversations');
    } catch {
      conversations = [];
    }

    const requested = new URLSearchParams(window.location.search).get('c');
    if (preserveSelection && selectedId && conversations.some((c) => c.id === selectedId)) {
      // keep current selection
    } else if (requested && conversations.some((c) => c.id === requested)) {
      selectedId = requested;
    } else {
      selectedId = conversations[0]?.id ?? null;
      if (selectedId) {
        const url = new URL(window.location.href);
        url.searchParams.set('c', selectedId);
        window.history.replaceState({}, '', url);
      }
    }

    renderConversationList();
    await loadMessages();
  }

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedId) return;
    const body = draftInput.value.trim();
    if (!body) return;
    draftInput.value = '';
    try {
      await apiPostJson('messages.php?action=send', { conversation_id: selectedId, body });
      await loadMessages();
      await loadConversations();
    } catch {
      draftInput.value = body;
      toast.error("Message didn't send. Try again.");
    }
  });

  async function init() {
    currentUser = await requireAuthOrRedirect();
    if (!currentUser) return;
    await loadConversations({ preserveSelection: false });
    pollTimer = setInterval(() => {
      loadMessages();
      loadConversations();
    }, 4000);
  }

  window.addEventListener('beforeunload', () => {
    if (pollTimer) clearInterval(pollTimer);
  });

  document.addEventListener('DOMContentLoaded', init);
})();
