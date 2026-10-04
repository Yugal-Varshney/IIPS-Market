/**
 * add-item.js — powers pages/add-item.html.
 * Handles dynamic form submission (multipart/form-data) via the Fetch API,
 * mirroring the original React sell form.
 */

(function () {
  const MAX_IMAGE_MB = 5;
  let pickedFile = null;
  let listingType = 'sell';

  const modeToggle = document.getElementById('listing-mode-toggle');
  const priceLabel = document.getElementById('price-field-label');
  const categorySelect = document.getElementById('sell-category');
  const conditionSelect = document.getElementById('sell-condition');
  const fileInput = document.getElementById('sell-photo-input');
  const dropBtn = document.getElementById('photo-drop-btn');
  const previewWrap = document.getElementById('photo-preview-wrap');
  const previewImg = document.getElementById('photo-preview-img');
  const previewCaption = document.getElementById('photo-preview-caption');
  const removeBtn = document.getElementById('photo-remove-btn');
  const errorEl = document.getElementById('sell-error');
  const form = document.getElementById('sell-form');
  const submitBtn = document.getElementById('sell-submit');

  document.getElementById('photo-drop-icon').innerHTML = ICON_IMAGE_PLUS;

  categorySelect.innerHTML = CATEGORIES.map((c) => `<option value="${c.value}">${c.label}</option>`).join('');
  conditionSelect.innerHTML = CONDITIONS.map((c) => `<option value="${c.value}">${c.label}</option>`).join('');

  modeToggle.addEventListener('click', (event) => {
    const btn = event.target.closest('.mode-btn');
    if (!btn) return;
    listingType = btn.getAttribute('data-mode');
    modeToggle.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
    priceLabel.textContent = listingType === 'rent' ? 'Price (₹ per week)' : 'Price (₹)';
  });

  dropBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Please pick an image file (JPG, PNG, or WebP).');
      fileInput.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      showError(`Image must be under ${MAX_IMAGE_MB}MB.`);
      fileInput.value = '';
      return;
    }
    clearError();
    pickedFile = file;
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewCaption.textContent = `${file.name} · looks good, ready to pin`;
    dropBtn.classList.add('hidden');
    previewWrap.classList.remove('hidden');
  });

  removeBtn.addEventListener('click', () => {
    pickedFile = null;
    fileInput.value = '';
    previewWrap.classList.add('hidden');
    dropBtn.classList.remove('hidden');
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
  function clearError() {
    errorEl.classList.add('hidden');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const title = document.getElementById('sell-title').value.trim();
    const description = document.getElementById('sell-description').value.trim();
    const price = document.getElementById('sell-price').value;
    const numericPrice = Number(price);

    if (title.length < 3) return showError('Give your listing a clear title (at least 3 characters).');
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return showError('Price must be greater than ₹0.');
    if (numericPrice > 100000) return showError('That price looks too high for a campus listing.');

    submitBtn.disabled = true;
    submitBtn.textContent = 'POSTING…';

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', categorySelect.value);
    formData.append('listing_type', listingType);
    formData.append('price', String(numericPrice));
    formData.append('condition', conditionSelect.value);
    formData.append('contact_phone', document.getElementById('sell-phone').value.trim());
    if (pickedFile) formData.append('image', pickedFile);

    try {
      const res = await apiPostForm('add_item.php', formData);
      toast.success('Your listing is live on the board!');
      window.location.href = `item.html?id=${encodeURIComponent(res.id)}`;
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'POST LISTING';
      toast.error(err.message || "Couldn't post your listing. Check your connection and try again.");
    }
  });

  document.addEventListener('DOMContentLoaded', requireAuthOrRedirect);
})();
