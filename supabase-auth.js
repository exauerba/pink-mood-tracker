/* bloom — Supabase auth layer.
 * Wraps supabase-js (loaded from CDN as window.supabase) into small
 * window helpers used by the rest of the app. Data sync to Supabase
 * tables is a later task; this file only handles authentication.
 */

const PLACEHOLDER_URL = 'YOUR_SUPABASE_URL';
const PLACEHOLDER_KEY = 'YOUR_SUPABASE_ANON_KEY';

const isConfigured = () =>
  SUPABASE_URL && SUPABASE_URL !== PLACEHOLDER_URL &&
  SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== PLACEHOLDER_KEY;

const configured = () => isConfigured() && window.supabase;

let supabase = null;

if (configured()) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function notConfiguredError() {
  return { error: 'Supabase is not configured yet.' };
}

function friendlyError(message) {
  if (!message) return 'Something went wrong. Please try again.';
  const lower = String(message).toLowerCase();
  if (lower.includes('already registered')) return 'That username is already taken.';
  if (lower.includes('invalid login credentials')) return 'Incorrect username or password.';
  if (lower.includes('password should be')) return 'Password must be at least 6 characters.';
  if (lower.includes('no user found') || lower.includes('not found')) return 'No account found for that username.';
  return 'Something went wrong. Please try again.';
}

// Usernames allow letters, numbers, dots, and dashes only.
const USERNAME_RE = /^[a-zA-Z0-9.-]+$/;

function usernameError() {
  return { error: 'Usernames can only use letters, numbers, dots, and dashes. No spaces.' };
}

// Turn a username into the hidden email Supabase uses internally.
function usernameToEmail(username) {
  return username.toLowerCase() + '@bloom.local';
}

const auth = {
  async signUp(username, password) {
    if (!configured()) return notConfiguredError();
    if (!USERNAME_RE.test(username)) return usernameError();
    try {
      const { data, error } = await supabase.auth.signUp({ email: usernameToEmail(username), password });
      if (error) return { error: friendlyError(error.message) };
      return { user: data.user };
    } catch (e) {
      return { error: 'Something went wrong. Please try again.' };
    }
  },

  async signIn(username, password) {
    if (!configured()) return notConfiguredError();
    if (!USERNAME_RE.test(username)) return usernameError();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
      if (error) return { error: friendlyError(error.message) };
      return { user: data.user };
    } catch (e) {
      return { error: 'Something went wrong. Please try again.' };
    }
  },

  async signOut() {
    if (!configured()) return notConfiguredError();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: friendlyError(error.message) };
      return { user: null };
    } catch (e) {
      return { error: 'Something went wrong. Please try again.' };
    }
  },

  async getSession() {
    if (!configured()) return { error: 'Supabase is not configured yet.' };
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return { error: friendlyError(error.message) };
      return { session: data.session };
    } catch (e) {
      return { error: 'Something went wrong. Please try again.' };
    }
  },

  onAuthChange(callback) {
    if (!configured()) {
      callback({ event: 'SIGNED_OUT', session: null });
      return () => {};
    }
    return supabase.auth.onAuthStateChange((event, session) => callback({ event, session }));
  },
};

window.bloomAuth = auth;

/* ---------- UI wiring ---------- */

const showAuth = () => {
  const screen = document.getElementById('auth-screen');
  const status = document.getElementById('auth-status');
  if (screen) screen.classList.remove('hidden');
  if (status) status.textContent = '';
};

const hideAuth = () => {
  const screen = document.getElementById('auth-screen');
  if (screen) screen.classList.add('hidden');
};

function setStatus(text, isError) {
  const status = document.getElementById('auth-status');
  if (!status) return;
  status.textContent = text;
  status.style.color = isError ? '#c0392b' : 'var(--text-soft)';
}

document.addEventListener('DOMContentLoaded', async () => {
const signinBtn = document.getElementById('auth-signin-btn');
  const signupBtn = document.getElementById('auth-signup-btn');
  const signoutBtn = document.getElementById('signout-btn');
  const username = document.getElementById('auth-username');
  const password = document.getElementById('auth-password');

  const applyAuthState = (loggedIn) => {
    if (loggedIn) {
      hideAuth();
      if (typeof renderTrack === 'function') renderTrack();
      if (typeof renderManage === 'function') renderManage();
    } else {
      showAuth();
    }
  };

  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      await window.bloomAuth.signOut();
      applyAuthState(false);
    });
  }

  if (signinBtn) {
    signinBtn.addEventListener('click', async () => {
      if (!username.value || !password.value) {
        setStatus('Please enter your username and password.', true);
        return;
      }
      signinBtn.disabled = true;
      setStatus('Signing in…', false);
      const res = await window.bloomAuth.signIn(username.value, password.value);
      signinBtn.disabled = false;
      if (res.error) {
        setStatus(res.error, true);
      } else {
        username.value = '';
        password.value = '';
      }
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      if (!username.value || !password.value) {
        setStatus('Please enter your username and password.', true);
        return;
      }
      signupBtn.disabled = true;
      setStatus('Creating account…', false);
      const res = await window.bloomAuth.signUp(username.value, password.value);
      signupBtn.disabled = false;
      if (res.error) {
        setStatus(res.error, true);
      } else if (!res.user) {
        setStatus('Account created. You can sign in now.', false);
      } else {
        username.value = '';
        password.value = '';
        setStatus('Account created. Welcome!', false);
      }
    });
  }

  window.bloomAuth.onAuthChange(({ event, session }) => {
    applyAuthState(!!session);
  });

  const session = await window.bloomAuth.getSession();
  applyAuthState(!!session);
});
