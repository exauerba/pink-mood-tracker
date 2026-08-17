/* ============================================================
   bloom — onboarding intro (first-run welcome overlay)
   - Triggers after account creation (see supabase-auth.js hooks)
   - Replayable from the Manage view's "Replay intro" card
   - Slide copy lives ONLY in the SLIDES array below
   ============================================================ */

(() => {
  'use strict';

  const LS_ONBOARDED = 'bloom.onboarded';
  const LS_JUST_SIGNED_UP = 'bloom.justSignedUp';
  const LS_TIP_DISMISSED = 'bloom.tipDismissed';

  /* ---------- Slide copy (single source of truth) ---------- */

  const SLIDES = [
    {
      emoji: '🌸',
      title: 'Welcome to bloom',
      body: 'Your private space to check in with how you feel — a few minutes a day.',
    },
    {
      emoji: '⏰',
      title: 'A check-in takes 30 seconds',
      body: 'Pick a time, rate how you\u2019re doing, add a line if it helps. That\u2019s it.',
    },
    {
      art: 'scale',
      title: 'One tap per thing',
      body: 'Each tracker runs 1 (not at all) to 7 (extremely), with anchor labels to guide you.',
    },
    {
      emoji: '🌱',
      title: 'Start with 10 sensible trackers',
      body: 'Anxiety, sleep, energy, overthinking… grouped by type. Nothing is permanent.',
    },
    {
      emoji: '📝',
      title: 'Add context, not just numbers',
      body: 'A short note about what happened or what helped makes patterns meaningful later.',
    },
    {
      art: 'trend',
      title: 'Watch your patterns bloom',
      body: 'Visualize turns days into trends: your typical range, time of day, and what helps.',
    },
    {
      emoji: '🎨',
      title: 'Shape bloom to your life',
      body: 'Rename or remove trackers, pick a pastel palette, choose light or dark.',
    },
    {
      emoji: '☁️',
      title: 'Yours, and synced',
      body: 'Signed in, your data backs up to the cloud — and you can export a backup any time.',
    },
  ];

  /* ---------- State ---------- */

  let _current = -1;
  let _replay = false;
  let _opener = null;
  let _prevOverflow = '';

  /* ---------- Small art helpers ---------- */

  function scaleArt() {
    const wrap = document.createElement('div');
    wrap.className = 'ob-scale';
    const cls = ['lo', 'lo', '', 'mid', '', 'hi', 'hi'];
    for (let i = 1; i <= 7; i++) {
      const s = document.createElement('span');
      if (cls[i - 1]) s.className = cls[i - 1];
      s.textContent = String(i);
      wrap.appendChild(s);
    }
    return wrap;
  }

  function trendArt() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ob-trend');
    svg.setAttribute('viewBox', '0 0 132 88');
    svg.setAttribute('aria-hidden', 'true');
    const band = document.createElementNS(NS, 'path');
    band.setAttribute('class', 'band');
    band.setAttribute('d', 'M8 62 L32 56 L56 48 L80 40 L104 30 L124 22 L124 88 L8 88 Z');
    const line = document.createElementNS(NS, 'path');
    line.setAttribute('class', 'line');
    line.setAttribute('d', 'M8 62 L32 56 L56 48 L80 40 L104 30 L124 22');
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('class', 'dot');
    dot.setAttribute('cx', '124');
    dot.setAttribute('cy', '22');
    dot.setAttribute('r', '5');
    svg.append(band, line, dot);
    return svg;
  }

  /* ---------- Rendering ---------- */

  function renderSlides(container) {
    container.innerHTML = '';
    SLIDES.forEach((s, i) => {
      const slide = document.createElement('section');
      slide.className = 'ob-slide';
      slide.setAttribute('aria-hidden', 'true');

      const art = document.createElement('div');
      art.className = 'ob-art';
      if (s.art === 'scale') {
        art.appendChild(scaleArt());
      } else if (s.art === 'trend') {
        art.appendChild(trendArt());
      } else {
        const halo = document.createElement('span');
        halo.className = 'ob-halo';
        const emoji = document.createElement('span');
        emoji.className = 'ob-emoji';
        emoji.textContent = s.emoji;
        art.append(halo, emoji);
      }

      const title = document.createElement('h2');
      title.className = 'ob-title';
      title.id = 'ob-title-' + (i + 1);
      title.tabIndex = -1;
      title.textContent = s.title;

      const body = document.createElement('p');
      body.className = 'ob-body';
      body.textContent = s.body;

      slide.append(art, title, body);
      container.appendChild(slide);
    });
  }

  function renderDots(container) {
    container.innerHTML = '';
    SLIDES.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'ob-dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', () => goTo(i));
      container.appendChild(dot);
    });
  }

  /* ---------- Stepper ---------- */

  function goTo(n) {
    if (n === _current || n < 0 || n >= SLIDES.length) return;
    const slides = document.getElementById('ob-slides');
    if (!slides) return;

    slides.classList.toggle('is-back', n < _current);
    _current = n;

    [...slides.children].forEach((el, i) => {
      el.classList.toggle('active', i === n);
      el.setAttribute('aria-hidden', i === n ? 'false' : 'true');
    });

    const dots = document.getElementById('ob-dots');
    if (dots) {
      [...dots.children].forEach((d, i) => {
        d.classList.toggle('active', i === n);
        if (i === n) d.setAttribute('aria-current', 'step');
        else d.removeAttribute('aria-current');
      });
    }

    const back = document.getElementById('ob-back');
    if (back) back.classList.toggle('ob-back-invisible', n === 0);

    const next = document.getElementById('ob-next');
    if (next) next.textContent = n === SLIDES.length - 1 ? "Let's start 🌸" : 'Next';

    const title = document.getElementById('ob-title-' + (n + 1));
    if (title) title.focus();
  }

  function next() {
    if (_current < SLIDES.length - 1) goTo(_current + 1);
    else close();
  }

  function back() {
    if (_current > 0) goTo(_current - 1);
  }

  /* ---------- Open / close ---------- */

  function open(replay) {
    const ov = document.getElementById('onboarding');
    if (!ov) return;

    _replay = !!replay;
    _opener =
      document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : null;

    const slides = document.getElementById('ob-slides');
    const dots = document.getElementById('ob-dots');
    if (slides && !slides.children.length) {
      renderSlides(slides);
      renderDots(dots);
    }

    ov.classList.remove('hidden');
    _current = -1;
    goTo(0); // focuses the slide title — overlay must be visible first

    void ov.offsetWidth; // restart the entry transition
    ov.classList.add('open');

    _prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey, true);
  }

  function close() {
    const ov = document.getElementById('onboarding');
    if (!ov || ov.classList.contains('hidden')) return;

    document.removeEventListener('keydown', onKey, true);
    document.body.style.overflow = _prevOverflow;

    ov.classList.remove('open');

    if (!_replay) {
      try { localStorage.setItem(LS_ONBOARDED, '1'); } catch (e) { /* ignore */ }
    }

    setTimeout(() => {
      ov.classList.add('hidden');
      if (_opener && _opener.isConnected && typeof _opener.focus === 'function') {
        _opener.focus();
      }
      if (!_replay) showFirstCheckinTip();
    }, 300);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      back();
    }
  }

  /* ---------- Public API ---------- */

  function start(opts) {
    open(opts && opts.replay);
  }

  function onSignedIn() {
    try {
      if (localStorage.getItem(LS_JUST_SIGNED_UP)) {
        localStorage.removeItem(LS_JUST_SIGNED_UP);
        if (!localStorage.getItem(LS_ONBOARDED)) start({ replay: false });
      }
    } catch (e) { /* storage unavailable — never block the app */ }
  }

  /* ---------- Progressive-disclosure nudge (Track view) ---------- */

  function showFirstCheckinTip() {
    const wrap = document.getElementById('first-tip');
    if (!wrap || wrap.dataset.rendered) return;
    wrap.dataset.rendered = '1';

    try {
      if (localStorage.getItem(LS_TIP_DISMISSED)) return;
      if (typeof entries !== 'undefined' && entries && Object.keys(entries).length > 0) return;
    } catch (e) { return; }

    const banner = document.createElement('div');
    banner.className = 'first-tip';

    const emoji = document.createElement('span');
    emoji.className = 'tip-emoji';
    emoji.textContent = '🌸';
    emoji.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'tip-text';
    const strong = document.createElement('strong');
    strong.textContent = 'Start with one check-in today';
    const cta = document.createElement('span');
    cta.className = 'tip-cta';
    cta.textContent = 'Rate how you feel and add a note — your patterns bloom from here.';
    text.append(strong, cta);

    const dismiss = document.createElement('button');
    dismiss.className = 'tip-dismiss';
    dismiss.type = 'button';
    dismiss.setAttribute('aria-label', 'Dismiss tip');
    dismiss.textContent = '×';
    dismiss.addEventListener('click', () => {
      try { localStorage.setItem(LS_TIP_DISMISSED, '1'); } catch (e) { /* ignore */ }
      banner.remove();
    });

    banner.append(emoji, text, dismiss);
    wrap.appendChild(banner);
  }

  /* ---------- Wire-up + init ---------- */

  function init() {
    const skip = document.getElementById('ob-skip');
    if (skip) skip.addEventListener('click', close);
    const nextBtn = document.getElementById('ob-next');
    if (nextBtn) nextBtn.addEventListener('click', next);
    const backBtn = document.getElementById('ob-back');
    if (backBtn) backBtn.addEventListener('click', back);

    const help = document.getElementById('help-btn');
    if (help) help.addEventListener('click', () => start({ replay: true }));

    // Returning users (already onboarded) get the gentle nudge instead.
    try {
      if (localStorage.getItem(LS_ONBOARDED)) showFirstCheckinTip();
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.bloomOnboarding = { onSignedIn, start, showFirstCheckinTip };
})();
