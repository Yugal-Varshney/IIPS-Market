/**
 * auth.js — powers both login.html and register.html.
 * Both pages contain the same two forms; only the default active tab
 * differs, matching the original single-page tabbed auth UI.
 */

(function () {
  const heading = document.getElementById('auth-heading');
  const tabButtons = document.querySelectorAll('.auth-tab-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const registeredNotice = document.getElementById('registered-notice');
  const loginError = document.getElementById('login-error');
  const registerError = document.getElementById('register-error');

  function setTab(tab) {
    tabButtons.forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-tab') === tab));
    loginForm.classList.toggle('hidden', tab !== 'login');
    registerForm.classList.toggle('hidden', tab !== 'register');
    registeredNotice.classList.add('hidden');
    loginError.classList.add('hidden');
    registerError.classList.add('hidden');
    heading.textContent = tab === 'register' ? 'JOIN THE BOARD' : 'WELCOME BACK';
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.getAttribute('data-tab')));
  });

  function showError(el, message) {
    el.textContent = message;
    el.classList.remove('hidden');
  }

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    registerError.classList.add('hidden');

    const displayName = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim().toLowerCase();
    const password = document.getElementById('register-password').value;

    if (!displayName) return showError(registerError, 'Tell us your name so buyers and sellers know who you are.');
    if (!isCollegeEmail(email))
      return showError(registerError, 'Use your college email — it must include .edu or .ac. (e.g. alex@college.edu or alex@iitb.ac.in).');
    if (password.length < 6) return showError(registerError, 'Password must be at least 6 characters.');

    const submitBtn = document.getElementById('register-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'CREATING ACCOUNT…';
    try {
      const res = await apiPostJson('auth.php?action=register', { display_name: displayName, email, password });
      invalidateSession();
      if (res.needs_confirmation) {
        registerForm.classList.add('hidden');
        registeredNotice.classList.remove('hidden');
        return;
      }
      toast.success('Welcome to Campus Market!');
      window.location.href = 'index.html';
    } catch (err) {
      showError(registerError, err.message || 'Could not create your account.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'CREATE ACCOUNT';
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.classList.add('hidden');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const submitBtn = document.getElementById('login-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'SIGNING IN…';
    try {
      await apiPostJson('auth.php?action=login', { email, password });
      invalidateSession();
      toast.success('Welcome back!');
      window.location.href = 'index.html';
    } catch (err) {
      showError(loginError, err.message || 'Invalid email or password.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'SIGN IN';
    }
  });

  document.getElementById('forgot-password-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      showError(loginError, 'Enter your email first, then click "Forgot password".');
      return;
    }
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('reset-password.html', window.location.href).href,
    });
    if (error) return showError(loginError, error.message);
    toast.success('If that email has an account, a reset link is on its way.');
  });

  const defaultTab = document.body.getAttribute('data-default-tab') || 'login';
  setTab(defaultTab);
})();
