/* ─────────────────────────────────────────────
   茶処 Matcha Journal — Client Script
   Wired to: /api/auth  and  /api/matcha
   ───────────────────────────────────────────── */

const API_AUTH   = '/api/auth';
const API_MATCHA = '/api/matcha';

/* ── Token helpers ───────────────────────────── */
const getToken    = ()         => localStorage.getItem('matcha_token');
const getUsername = ()         => localStorage.getItem('matcha_user');
const saveAuth    = (t, u)     => { localStorage.setItem('matcha_token', t); localStorage.setItem('matcha_user', u); };
const clearAuth   = ()         => { localStorage.removeItem('matcha_token'); localStorage.removeItem('matcha_user'); };
const isLoggedIn  = ()         => !!getToken();

/* ── Fetch wrapper ───────────────────────────── */
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Something went wrong.');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ─────────────────────────────────────────────
   VIEWS
   ───────────────────────────────────────────── */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + name);
  if (target) target.classList.add('active');
  updateNav();
  if (name === 'feed') loadFeed();
}

/* ── Nav state ───────────────────────────────── */
function updateNav() {
  const loggedIn = isLoggedIn();
  const username = getUsername();

  document.getElementById('nav-login-btn').style.display  = loggedIn ? 'none' : '';
  document.getElementById('nav-add-btn').style.display    = loggedIn ? ''     : 'none';
  document.getElementById('nav-logout-btn').style.display = loggedIn ? ''     : 'none';

  const userEl = document.getElementById('nav-user');
  userEl.textContent = loggedIn ? username : '';
}

/* ─────────────────────────────────────────────
   MESSAGES
   ───────────────────────────────────────────── */
function showMsg(elementId, text, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.className = `msg show msg-${type}`;
}

function clearMsg(elementId) {
  const el = document.getElementById(elementId);
  if (el) { el.textContent = ''; el.className = 'msg'; }
}

/* ─────────────────────────────────────────────
   FEED
   ───────────────────────────────────────────── */
async function loadFeed() {
  const grid   = document.getElementById('feed-grid');
  const sort   = document.getElementById('sort-select').value;
  const filter = document.getElementById('filter-type').value;

  grid.innerHTML = '<div class="spinner-row"><div class="spinner" role="status" aria-label="Loading entries"></div></div>';

  const params = new URLSearchParams({ sort });
  if (filter) params.set('drinkType', filter);

  try {
    const entries = await apiFetch(`${API_MATCHA}?${params}`);
    renderFeed(entries);
  } catch (err) {
    grid.innerHTML = `<p class="card-empty"><span class="card-empty-icon">⚠</span><br>${err.message}</p>`;
  }
}

function renderFeed(entries) {
  const grid = document.getElementById('feed-grid');
  const me   = getUsername();

  if (!entries || entries.length === 0) {
    grid.innerHTML = `
      <div class="card-empty">
        <div class="card-empty-icon">茶</div>
        <p>No entries yet. Be the first to add one!</p>
      </div>`;
    return;
  }

  grid.innerHTML = entries.map(entry => buildCard(entry, me)).join('');
}

function buildCard(entry, currentUser) {
  const isOwner = isLoggedIn() && currentUser === entry.username;
  const stars   = buildStarsHtml(entry.rating);
  const price   = entry.price ? ` · $${Number(entry.price).toFixed(2)}` : '';
  const date    = new Date(entry.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const actions = isOwner ? `
    <div class="card-actions">
      <button class="btn btn-ghost btn-sm" onclick="openEditForm('${entry._id}')" aria-label="Edit ${entry.placeName}">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteEntry('${entry._id}', '${entry.placeName}')" aria-label="Delete ${entry.placeName}">Delete</button>
    </div>` : '';

  return `
    <article class="entry-card" aria-label="${entry.placeName}, rated ${entry.rating} out of 5">
      <div class="card-place">${entry.placeName}</div>
      <div class="card-location">${entry.location || ''}</div>
      <div class="card-stars" aria-label="${entry.rating} out of 5 stars">${stars}</div>
      <span class="card-type">${entry.drinkType || 'matcha'}</span>
      ${entry.notes ? `<p class="card-notes">${entry.notes}</p>` : ''}
      <div class="card-meta">
        <span>by ${entry.username}</span>
        <span>${price ? price.slice(3) + ' · ' : ''}${date}</span>
      </div>
      ${actions}
    </article>`;
}

function buildStarsHtml(n) {
  const filled = '★'.repeat(Math.max(0, Math.min(5, n)));
  const empty  = '☆'.repeat(5 - Math.max(0, Math.min(5, n)));
  return `<span aria-hidden="true">${filled}<span class="card-stars-empty">${empty}</span></span>`;
}

/* ─────────────────────────────────────────────
   AUTH
   ───────────────────────────────────────────── */
let authMode = 'login';

function switchAuthTab(mode) {
  authMode = mode;
  clearMsg('auth-msg');

  document.getElementById('auth-submit-btn').textContent = mode === 'login' ? 'Login' : 'Sign up';
  document.getElementById('tab-login').classList.toggle('active',  mode === 'login');
  document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
  document.getElementById('tab-login').setAttribute('aria-selected',  mode === 'login');
  document.getElementById('tab-signup').setAttribute('aria-selected', mode === 'signup');

  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg('auth-msg');

  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!username || !password) {
    showMsg('auth-msg', 'Please fill in both fields.');
    return;
  }

  const btn = document.getElementById('auth-submit-btn');
  btn.disabled = true;
  btn.textContent = authMode === 'login' ? 'Logging in...' : 'Creating account...';

  try {
    if (authMode === 'signup') {
      await apiFetch(`${API_AUTH}/signup`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      showMsg('auth-msg', 'Account created! Logging you in...', 'success');
    }

    const { token, username: user } = await apiFetch(`${API_AUTH}/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    saveAuth(token, user);
    showView('feed');

  } catch (err) {
    showMsg('auth-msg', err.message || 'Authentication failed.');
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Login' : 'Sign up';
  }
});

async function handleLogout() {
  try {
    await apiFetch(`${API_AUTH}/logout`, { method: 'POST' });
  } catch { /* ignore logout errors */ }
  clearAuth();
  updateNav();
  showView('feed');
}

/* ─────────────────────────────────────────────
   ADD / EDIT ENTRY
   ───────────────────────────────────────────── */
let currentStarRating = 3;

/* Open add form (blank) */
function openAddForm() {
  document.getElementById('edit-id').value         = '';
  document.getElementById('add-form-title').textContent = 'New Matcha Entry';
  document.getElementById('add-form-sub').textContent   = 'Share a place you\'ve visited.';
  document.getElementById('add-submit-btn').textContent = 'Add Entry';
  document.getElementById('add-form').reset();
  setStarRating(3);
  clearMsg('add-msg');
  showView('add');
}

/* Open edit form (pre-filled) */
async function openEditForm(id) {
  clearMsg('add-msg');

  try {
    const entry = await apiFetch(`${API_MATCHA}/${id}`);

    document.getElementById('edit-id').value              = id;
    document.getElementById('add-form-title').textContent = 'Edit Entry';
    document.getElementById('add-form-sub').textContent   = 'Update your review.';
    document.getElementById('add-submit-btn').textContent = 'Save Changes';

    document.getElementById('f-place').value    = entry.placeName    || '';
    document.getElementById('f-location').value = entry.location     || '';
    document.getElementById('f-type').value     = entry.drinkType    || 'other';
    document.getElementById('f-price').value    = entry.price        || '';
    document.getElementById('f-notes').value    = entry.notes        || '';
    setStarRating(entry.rating || 3);

    showView('add');
  } catch (err) {
    showMsg('global-msg', 'Could not load entry: ' + err.message, 'error');
    document.getElementById('global-msg').classList.add('show');
    setTimeout(() => clearMsg('global-msg'), 4000);
  }
}

function cancelEdit() {
  showView('feed');
}

/* Star picker */
function setStarRating(n) {
  currentStarRating = n;
  document.getElementById('f-rating').value = n;
  document.querySelectorAll('#star-picker .star').forEach(s => {
    const v = parseInt(s.dataset.v);
    s.classList.toggle('lit', v <= n);
    s.setAttribute('aria-checked', v === n ? 'true' : 'false');
  });
}

document.getElementById('star-picker').addEventListener('click', e => {
  const star = e.target.closest('.star');
  if (!star) return;
  setStarRating(parseInt(star.dataset.v));
});

/* Submit (add or edit) */
document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg('add-msg');

  if (!isLoggedIn()) {
    showMsg('add-msg', 'You must be logged in to add an entry.');
    return;
  }

  const id       = document.getElementById('edit-id').value;
  const placeName = document.getElementById('f-place').value.trim();
  const location  = document.getElementById('f-location').value.trim();
  const drinkType = document.getElementById('f-type').value;
  const rating    = currentStarRating;
  const price     = document.getElementById('f-price').value || undefined;
  const notes     = document.getElementById('f-notes').value.trim();

  if (!placeName) { showMsg('add-msg', 'Place name is required.'); return; }
  if (!location)  { showMsg('add-msg', 'Location is required.'); return; }

  const body = { placeName, location, drinkType, rating, notes };
  if (price) body.price = parseFloat(price);

  const btn = document.getElementById('add-submit-btn');
  btn.disabled = true;
  btn.textContent = id ? 'Saving...' : 'Adding...';

  try {
    if (id) {
      await apiFetch(`${API_MATCHA}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showMsg('add-msg', 'Entry updated!', 'success');
    } else {
      await apiFetch(API_MATCHA, { method: 'POST', body: JSON.stringify(body) });
      showMsg('add-msg', 'Entry added!', 'success');
    }
    setTimeout(() => showView('feed'), 800);
  } catch (err) {
    showMsg('add-msg', err.message || 'Could not save entry.');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'Save Changes' : 'Add Entry';
  }
});

/* ─────────────────────────────────────────────
   DELETE
   ───────────────────────────────────────────── */
async function deleteEntry(id, placeName) {
  if (!confirm(`Delete "${placeName}"? This cannot be undone.`)) return;

  try {
    await apiFetch(`${API_MATCHA}/${id}`, { method: 'DELETE' });
    loadFeed();
  } catch (err) {
    alert('Could not delete entry: ' + err.message);
  }
}

/* ─────────────────────────────────────────────
   NAV: wire up the Add button to openAddForm
   ───────────────────────────────────────────── */
document.getElementById('nav-add-btn').addEventListener('click', (e) => {
  e.preventDefault();
  openAddForm();
});

/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */
updateNav();
loadFeed();