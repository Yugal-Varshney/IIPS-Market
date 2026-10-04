(function () {
  const form = document.getElementById('reset-form');
  const err = document.getElementById('reset-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.add('hidden');
    const password = document.getElementById('reset-password').value;
    if (password.length < 6) {
      err.textContent = 'Password must be at least 6 characters.';
      return err.classList.remove('hidden');
    }
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      err.textContent = error.message.includes('session') ? 'This link has expired. Request a new reset email from the login page.' : error.message;
      return err.classList.remove('hidden');
    }
    toast.success('Password updated!');
    setTimeout(() => (window.location.href = 'index.html'), 800);
  });
})();
