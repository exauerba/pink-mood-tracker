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

let client = null;

if (configured()) {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Expose the client for the sync layer (null when not configured).
window.bloomClient = client;

function notConfiguredError() {
  return { error: 'Supabase is not configured yet.' };
}

// Keep messages generic so a stranger cannot tell which usernames exist.
// Sign-in and sign-up always say the same thing regardless of the real cause.
function friendlyError(message) {
  if (!message) return 'Something went wrong. Please try again.';
  const lower = String(message).toLowerCase();
  if (lower.includes('password should be')) return 'Password must be at least 6 characters.';
  return 'Something went wrong. Please try again.';
}

// Usernames allow letters, numbers, dots, and dashes only.
const USERNAME_RE = /^[a-zA-Z0-9.-]+$/;

function usernameError() {
  return { error: 'Usernames can only use letters, numbers, dots, and dashes. No spaces.' };
}

// Turn a username into the hidden email Supabase uses internally.
// Uses a real TLD (.app) so Supabase accepts it. Emails are never sent.
function usernameToEmail(username) {
  return username.toLowerCase() + '@bloom.app';
}

const SIGN_IN_FAILED = 'Incorrect username or password.';
const SIGN_UP_FAILED = 'Could not create account. Please try again.';

const auth = {
  async signUp(username, password) {
    if (!configured()) return notConfiguredError();
    if (!USERNAME_RE.test(username)) return usernameError();
    try {
      const { data, error } = await client.auth.signUp({ email: usernameToEmail(username), password });
      if (error) return { error: SIGN_UP_FAILED };
      return { user: data.user };
    } catch (e) {
      return { error: SIGN_UP_FAILED };
    }
  },

  async signIn(username, password) {
    if (!configured()) return notConfiguredError();
    if (!USERNAME_RE.test(username)) return usernameError();
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: usernameToEmail(username), password });
      if (error) return { error: SIGN_IN_FAILED };
      return { user: data.user };
    } catch (e) {
      return { error: SIGN_IN_FAILED };
    }
  },

  async signOut() {
    if (!configured()) return notConfiguredError();
    try {
      const { error } = await client.auth.signOut();
      if (error) return { error: friendlyError(error.message) };
      return { user: null };
    } catch (e) {
      return { error: 'Something went wrong. Please try again.' };
    }
  },

  async getSession() {
    if (!configured()) return { error: 'Supabase is not configured yet.' };
    try {
      const { data, error } = await client.auth.getSession();
      if (error) return { error: friendlyError(error.message) };
      return { session: data.session };
    } catch (e) {
      return { error: 'Something went wrong. Please try again.' };
    }
  },

  async deleteAccount() {
    if (!configured()) return notConfiguredError();
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) return { error: 'You need to be signed in to delete your account.' };

      const res = await fetch(
        SUPABASE_URL + '/functions/v1/delete-account',
        { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error || 'Could not delete your account.' };
      }

      localStorage.removeItem('bloom.trackers');
      localStorage.removeItem('bloom.entries');
      localStorage.removeItem('bloom.deletedTrackers');
      if (data.session && data.session.user) localStorage.removeItem('bloom.deletedTrackers.' + data.session.user.id);
      await client.auth.signOut();
      return { ok: true };
    } catch (e) {
      return { error: 'Could not delete your account.' };
    }
  },

  onAuthChange(callback) {
    if (!configured()) {
      callback({ event: 'SIGNED_OUT', session: null });
      return () => {};
    }
    return client.auth.onAuthStateChange((event, session) => callback({ event, session }));
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

// Show a red warning under the username field and restate the rules.
function setUsernameError(show) {
  const input = document.getElementById('auth-username');
  const error = document.getElementById('auth-username-error');
  if (!input || !error) return;
  input.classList.toggle('invalid', show);
  error.classList.toggle('hidden', !show);
  if (show) {
    error.textContent = 'Usernames can only use letters, numbers, dots, and dashes. No spaces.';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
const signinBtn = document.getElementById('auth-signin-btn');
  const signupBtn = document.getElementById('auth-signup-btn');
  const signoutBtn = document.getElementById('signout-btn');
  const username = document.getElementById('auth-username');
  const password = document.getElementById('auth-password');

  // Simple client-side lockout: after too many failed sign-ins, pause for a
  // while. This slows down password guessing. (Cloud CAPTCHA is the real fix.)
  const MAX_FAILED = 5;
  const LOCKOUT_MS = 60 * 1000;
  let failedAttempts = 0;
  let lockedUntil = 0;

  const isLocked = () => Date.now() < lockedUntil;
  const lockRemaining = () => Math.ceil((lockedUntil - Date.now()) / 1000);

  const applyAuthState = async (loggedIn) => {
    if (loggedIn) {
      if (window.bloomSync) await window.bloomSync.pull();
      hideAuth();
      if (typeof renderTrack === 'function') renderTrack();
      if (typeof renderManage === 'function') renderManage();
    } else {
      showAuth();
    }
  };

  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      if (window.bloomSync && window.bloomSync.flushPending) await window.bloomSync.flushPending();
      await window.bloomAuth.signOut();
      if (window.bloomApp && window.bloomApp.clearLocal) window.bloomApp.clearLocal();
      location.reload();
    });
  }

  const deleteBtn = document.getElementById('delete-account-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = window.confirm(
        'This permanently deletes your bloom account and all of your cloud data. ' +
        'This cannot be undone. Are you sure you want to continue?'
      );
      if (!confirmed) return;

      deleteBtn.disabled = true;
      const status = document.getElementById('delete-status');
      if (status) status.textContent = 'Deleting account…';
      const res = await window.bloomAuth.deleteAccount();
      if (status) {
        status.textContent = res.ok ? 'Account deleted.' : (res.error || 'Could not delete your account.');
        status.style.color = res.ok ? 'var(--text-soft)' : '#c0392b';
      }
      deleteBtn.disabled = false;
    });
  }

  if (signinBtn) {
    signinBtn.addEventListener('click', async () => {
      if (isLocked()) {
        setStatus(`Too many attempts. Try again in ${lockRemaining()}s.`, true);
        return;
      }
      if (!username.value || !password.value) {
        setStatus('Please enter your username and password.', true);
        return;
      }
      if (!USERNAME_RE.test(username.value)) {
        setUsernameError(true);
        setStatus('', false);
        return;
      }
      setUsernameError(false);
      signinBtn.disabled = true;
      setStatus('Signing in…', false);
      const res = await window.bloomAuth.signIn(username.value, password.value);
      signinBtn.disabled = false;
      if (res.error) {
        failedAttempts += 1;
        if (failedAttempts >= MAX_FAILED) {
          lockedUntil = Date.now() + LOCKOUT_MS;
          failedAttempts = 0;
          setStatus(`Too many attempts. Try again in ${lockRemaining()}s.`, true);
        } else {
          setStatus(res.error, true);
        }
      } else {
        failedAttempts = 0;
        lockedUntil = 0;
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
      if (!USERNAME_RE.test(username.value)) {
        setUsernameError(true);
        setStatus('', false);
        return;
      }
      setUsernameError(false);
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

  // Live feedback: show the red warning as soon as the username is invalid.
  if (username) {
    username.addEventListener('input', () => {
      const value = username.value.trim();
      if (value && !USERNAME_RE.test(value)) {
        setUsernameError(true);
      } else {
        setUsernameError(false);
      }
    });
  }

  // Always start at the login screen. Do not auto-login from a saved session.
  showAuth();

  // Only react to real sign-in / sign-out events, not the initial session.
  window.bloomAuth.onAuthChange(async ({ event, session }) => {
    if (window.bloomApp && window.bloomApp.setUser) window.bloomApp.setUser(session ? session.user.id : null);
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      await applyAuthState(!!session);
    }
  });
});
