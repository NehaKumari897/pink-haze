// ============================================================
//  ✦ Pink Haze — Advanced Full Featured App
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
         orderBy, query, onSnapshot, arrayUnion, increment }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_API_KEY,
  authDomain:        import.meta.env.VITE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_APP_ID
};

const CLOUDINARY_CLOUD_NAME    = "dzdi5kpla";
const CLOUDINARY_UPLOAD_PRESET = "PinkHaze";
const ADMIN_PASSWORD           = import.meta.env.VITE_ADMIN_PASSWORD;

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── STATE ─────────────────────────────────────────────────────
let isAdmin           = false;
let panelOpen         = false;
let currentFeedbackId = null;
let selectedRating    = 0;
let selectedFiles     = [];
let allPostsCache     = [];
let searchQuery       = '';
let activeFilter      = 'all';
let visibleCount      = 18;   // infinite scroll / load more
const PAGE_SIZE       = 18;

// ── SVG ICONS ─────────────────────────────────────────────────
const IC = {
  heart:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  dislike:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>`,
  chat:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  link:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  trash:       `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  plus:        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  close:       `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  eye:         `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  bookmark:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  bookmarkF:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  edit:        `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  download:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  copy:        `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  story:       `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`,
  back:        `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  starF:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  starE:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
};

// ============================================================
//  ON LOAD
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  startWelcome();
  listenToPosts();
  setupImagePreview();
  setupScrollObserver();
  setupSearch();
  setupScrollToTop();
  setupCustomCursor();
  setupTheme();
  setupNotifications();
});

// ── CUSTOM CURSOR ─────────────────────────────────────────────
function setupCustomCursor() {
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  function animateCursor() {
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  document.addEventListener('mouseover', e => {
    if (e.target.closest('button,a,.image-card,.iotd-banner')) ring.classList.add('hover');
    else ring.classList.remove('hover');
  });
}

// ── DARK / LIGHT THEME ────────────────────────────────────────
function setupTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    showToast(next === 'light' ? 'Light mode on ☀️' : 'Dark mode on 🌙');
  });
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
let lastPostCount = -1;
function setupNotifications() {
  document.getElementById('notifBtn')?.addEventListener('click', () => {
    showToast('You are up to date!');
    document.getElementById('notifBadge').style.display = 'none';
  });
}
function checkNewPosts(count) {
  if (lastPostCount === -1) { lastPostCount = count; return; }
  if (count > lastPostCount) {
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'block';
    showToast(`${count - lastPostCount} new image${count - lastPostCount > 1 ? 's' : ''} posted!`);
    lastPostCount = count;
  }
}

// ── SCROLL TO TOP ─────────────────────────────────────────────
function setupScrollToTop() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400));
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── SEARCH ───────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('searchInput');
  const clear = document.getElementById('searchClear');
  if (!input) return;
  input.addEventListener('input', () => {
    searchQuery = input.value.trim().toLowerCase();
    if (clear) clear.style.display = searchQuery ? 'block' : 'none';
    visibleCount = PAGE_SIZE;
    renderFeed(allPostsCache);
  });
}
function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  searchQuery = '';
  renderFeed(allPostsCache);
}
window.clearSearch = clearSearch;

// ── FILTER ───────────────────────────────────────────────────
function setFilter(f) {
  activeFilter = f;
  visibleCount = PAGE_SIZE;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === f));
  renderFeed(allPostsCache);
}
window.setFilter = setFilter;

// ── LOAD MORE ────────────────────────────────────────────────
function loadMore() {
  visibleCount += PAGE_SIZE;
  renderFeed(allPostsCache);
  document.getElementById('loadMoreBtn').textContent = 'Load More';
}
window.loadMore = loadMore;

// ── BOOKMARKS ────────────────────────────────────────────────
function isBookmarked(id) { return !!localStorage.getItem('bm_' + id); }
function toggleBookmark(id) {
  if (isBookmarked(id)) {
    localStorage.removeItem('bm_' + id);
    showToast('Bookmark removed');
  } else {
    localStorage.setItem('bm_' + id, '1');
    showToast('Bookmarked!');
  }
  document.querySelectorAll(`[data-bm="${id}"]`).forEach(btn => {
    btn.classList.toggle('active', isBookmarked(id));
    btn.innerHTML = isBookmarked(id) ? IC.bookmarkF : IC.bookmark;
  });
  if (activeFilter === 'bookmarked') renderFeed(allPostsCache);
}
window.toggleBookmark = toggleBookmark;

// ── VIEW COUNTER ─────────────────────────────────────────────
async function trackView(id) {
  if (localStorage.getItem('viewed_' + id)) return;
  localStorage.setItem('viewed_' + id, '1');
  try { await updateDoc(doc(db, 'posts', id), { views: increment(1) }); } catch(e) {}
}

// ── DOWNLOAD IMAGE ────────────────────────────────────────────
async function downloadImage(url, title) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = (title || 'pink-haze-image') + '.jpg';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Download started!');
  } catch(e) {
    window.open(url, '_blank');
    showToast('Opened in new tab');
  }
}
window.downloadImage = downloadImage;

// ── COPY PROMPT ───────────────────────────────────────────────
function copyPrompt(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Prompt copied!'));
}
window.copyPrompt = copyPrompt;

// ── EDIT POST ─────────────────────────────────────────────────
let editingPostId = null;
function openEditModal(id) {
  const post = allPostsCache.find(p => p.id === id);
  if (!post) return;
  editingPostId = id;
  document.getElementById('editTitleInput').value  = post.title  || '';
  document.getElementById('editPromptInput').value = post.prompt || '';
  document.getElementById('editModal').style.display = 'flex';
}
window.openEditModal = openEditModal;
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; editingPostId = null; }
window.closeEditModal = closeEditModal;
async function saveEdit() {
  if (!editingPostId) return;
  const title  = document.getElementById('editTitleInput').value.trim();
  const prompt = document.getElementById('editPromptInput').value.trim();
  if (!prompt) { showToast('Prompt cannot be empty'); return; }
  try {
    await updateDoc(doc(db, 'posts', editingPostId), { title, prompt });
    closeEditModal(); showToast('Post updated!');
  } catch(e) { showToast('Error updating post'); }
}
window.saveEdit = saveEdit;

// ── LEADERBOARD ───────────────────────────────────────────────
function openLeaderboard() {
  const sorted = [...allPostsCache].sort((a,b) => (b.likes||0)-(a.likes||0)).slice(0,10);
  const rows = sorted.map((p,i) => {
    const img   = p.imgUrls?.[0] || p.imgUrl || '';
    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
    return `<div class="lb-row" onclick="closeLeaderboard();openDetailPage('${p.id}')">
      <span class="lb-rank">${medal}</span>
      <img class="lb-thumb" src="${img}" alt="">
      <div class="lb-info">
        <div class="lb-title">${escHtml(p.title||'Untitled')}</div>
        <div class="lb-meta">${IC.heart} ${p.likes||0} likes</div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('leaderboardList').innerHTML = rows || '<p style="color:var(--text-muted);padding:20px;text-align:center">No posts yet</p>';
  document.getElementById('leaderboardModal').style.display = 'flex';
}
function closeLeaderboard() { document.getElementById('leaderboardModal').style.display = 'none'; }
window.openLeaderboard  = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;

// ── ANALYTICS ────────────────────────────────────────────────
function updateAnalytics(posts) {
  const el = document.getElementById('analyticsBar');
  if (!el) return;
  // Only visible to admin
  if (!isAdmin) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  const totalViews = posts.reduce((s,p) => s+(p.views||0), 0);
  const totalLikes = posts.reduce((s,p) => s+(p.likes||0), 0);
  const totalFb    = posts.reduce((s,p) => s+(p.feedbacks?.length||0), 0);
  el.innerHTML = `
    <span class="stat-pill">${IC.eye} ${totalViews} views</span>
    <span class="stat-pill">${IC.heart} ${totalLikes} likes</span>
    <span class="stat-pill">${IC.chat} ${totalFb} feedbacks</span>
    <span class="stat-pill">${IC.bookmark} ${posts.length} posts</span>`;
}

// ── STORY VIEWER ─────────────────────────────────────────────
let storyPosts = [];
let storyIdx   = 0;
let storyTimer = null;

function openStory(startId) {
  storyPosts = allPostsCache.filter(p => {
    const img = p.imgUrls?.[0] || p.imgUrl;
    return !!img;
  });
  storyIdx = storyPosts.findIndex(p => p.id === startId);
  if (storyIdx < 0) storyIdx = 0;
  renderStory();
  document.getElementById('storyViewer').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
window.openStory = openStory;

function closeStory() {
  clearTimeout(storyTimer);
  document.getElementById('storyViewer').style.display = 'none';
  document.body.style.overflow = '';
}
window.closeStory = closeStory;

function renderStory() {
  const post = storyPosts[storyIdx];
  if (!post) return;
  const img = post.imgUrls?.[0] || post.imgUrl || '';
  document.getElementById('storyContent').innerHTML = `
    <img src="${img}" alt="story" style="width:100%;border-radius:20px;max-height:75vh;object-fit:contain;display:block">
    <div class="story-prompt">
      <div class="story-prompt-label">AI Prompt</div>
      <div class="story-prompt-text">${escHtml(post.prompt || '')}</div>
    </div>`;

  // Progress bars
  const bars = storyPosts.map((_,i) =>
    `<div class="story-bar ${i<storyIdx?'done':i===storyIdx?'active':''}">
      <div class="story-bar-fill"></div>
    </div>`).join('');
  document.getElementById('storyProgress').innerHTML = bars;
  document.getElementById('storyCounter').textContent = `${storyIdx+1} / ${storyPosts.length}`;

  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => storyNext(), 5000);
}

function storyNext() {
  storyIdx = (storyIdx + 1) % storyPosts.length;
  renderStory();
}
function storyPrev() {
  storyIdx = (storyIdx - 1 + storyPosts.length) % storyPosts.length;
  renderStory();
}
window.storyNext = storyNext;
window.storyPrev = storyPrev;

// Keyboard nav for story
document.addEventListener('keydown', e => {
  const sv = document.getElementById('storyViewer');
  if (sv && sv.style.display !== 'none') {
    if (e.key === 'ArrowRight') storyNext();
    if (e.key === 'ArrowLeft')  storyPrev();
    if (e.key === 'Escape')     closeStory();
  }
});

// ============================================================
//  WELCOME SCREEN
// ============================================================
function startWelcome() {
  const title   = 'Welcome to Pink Haze';
  const subtitle= 'A daily gallery of AI-generated art — curated with love. Discover breathtaking visuals, share your thoughts, and explore creativity one image at a time.';
  const typedEl = document.getElementById('typedText');
  const subEl   = document.getElementById('welcomeSub');
  const btn     = document.getElementById('welcomeBtn');
  if (!typedEl) return;
  let i = 0;
  const iv = setInterval(() => {
    if (i < title.length) { typedEl.textContent += title[i]; i++; }
    else {
      clearInterval(iv);
      setTimeout(() => {
        subEl.textContent = subtitle;
        subEl.classList.add('show');
        setTimeout(() => { btn.style.opacity='1'; btn.classList.add('show'); }, 600);
      }, 300);
    }
  }, 55);
}
function enterGallery() {
  const s = document.getElementById('welcomeScreen');
  s.classList.add('hide');
  setTimeout(() => s.style.display='none', 800);
}
window.enterGallery = enterGallery;

// ============================================================
//  FIRESTORE LISTENER
// ============================================================
function listenToPosts() {
  const q = query(collection(db,'posts'), orderBy('date','desc'));
  onSnapshot(q, snap => {
    const posts = [];
    snap.forEach(d => posts.push({ id:d.id, ...d.data() }));
    checkNewPosts(posts.length);
    allPostsCache = posts;

    // Hide skeleton
    const sk = document.getElementById('skeletonGrid');
    if (sk) sk.style.display = 'none';

    renderFeed(posts);
    syncDetailPageCounts(posts);
    updateAnalytics(posts);
  });
}

// ============================================================
//  RENDER FEED
// ============================================================
function renderFeed(posts) {
  const feed = document.getElementById('feed');

  let filtered = [...posts];
  if (activeFilter === 'bookmarked') filtered = filtered.filter(p => isBookmarked(p.id));
  if (activeFilter === 'top')        filtered = filtered.sort((a,b) => (b.likes||0)-(a.likes||0));
  if (searchQuery)                   filtered = filtered.filter(p =>
    (p.prompt||'').toLowerCase().includes(searchQuery) ||
    (p.title||'').toLowerCase().includes(searchQuery)
  );

  if (!filtered.length) {
    feed.innerHTML = `<div class="empty-state">
      <div class="e-icon">${IC.heart}</div>
      <h3>${searchQuery?'No results found':activeFilter==='bookmarked'?'No bookmarks yet':'No images yet'}</h3>
      <p>${searchQuery?'Try a different search term':'Check back soon!'}</p>
    </div>`;
    document.getElementById('loadMoreWrap').style.display = 'none';
    return;
  }

  // Show/hide load more
  const lmw = document.getElementById('loadMoreWrap');
  lmw.style.display = filtered.length > visibleCount ? 'block' : 'none';
  const paged = filtered.slice(0, visibleCount);

  // IOTD — Today's all posts carousel
  const today = new Date().toISOString().slice(0,10);
  const todayPosts = [...filtered].filter(p => p.date?.slice(0,10) === today);
  let html = '';

  if (todayPosts.length && activeFilter === 'all' && !searchQuery) {
    const slides = todayPosts.map((p, i) => {
      const img = p.imgUrls?.[0] || p.imgUrl || '';
      return `<div class="iotd-slide ${i===0?'active':''}" data-id="${p.id}" onclick="openDetailPage('${p.id}')">
        <img class="iotd-img" src="${img}" alt="${escHtml(p.title||'AI Art')}" loading="lazy">
        <div class="iotd-overlay">
          <span class="iotd-badge">✦ Today's Gallery</span>
          <h2 class="iotd-title">${escHtml(p.title||'Untitled')}</h2>
          <div class="iotd-stats">${IC.heart} ${p.likes||0} likes</div>
        </div>
      </div>`;
    }).join('');

    const dots = todayPosts.map((_,i) =>
      `<button class="iotd-dot ${i===0?'active':''}" onclick="event.stopPropagation();iotdGoTo(${i})"></button>`
    ).join('');

    const arrows = todayPosts.length > 1 ? `
      <button class="iotd-arrow iotd-prev" onclick="event.stopPropagation();iotdPrev()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="iotd-arrow iotd-next" onclick="event.stopPropagation();iotdNext()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>` : '';

    const counter = todayPosts.length > 1
      ? `<span class="iotd-counter" id="iotdCounter">1 / ${todayPosts.length}</span>` : '';

    html += `<div class="iotd-carousel scroll-fade" id="iotdCarousel" data-index="0" data-total="${todayPosts.length}">
      <div class="iotd-track">${slides}</div>
      ${arrows}
      ${todayPosts.length > 1 ? `<div class="iotd-dots">${dots}</div>` : ''}
      ${counter}
    </div>`;
  }

  // Group by date
  const grouped = {};
  paged.forEach(p => {
    const dk = p.date?p.date.slice(0,10):'unknown';
    if (!grouped[dk]) grouped[dk] = [];
    grouped[dk].push(p);
  });
  const sortedDates = Object.keys(grouped).sort((a,b)=>b.localeCompare(a));

  sortedDates.forEach((dk,i) => {
    html += `<div class="date-group-header scroll-fade" style="animation-delay:${i*0.04}s">
      <span class="date-group-line"></span>
      <span class="date-group-label">${formatDateLabel(dk)}</span>
      <span class="date-group-line"></span>
    </div>
    <div class="masonry-grid">`;
    grouped[dk].forEach((p,j) => { html += `<div class="masonry-col">${createCardHTML(p,(i+j)*0.04)}</div>`; });
    html += `</div>`;
  });

  feed.innerHTML = html;
  feed.querySelectorAll('.scroll-fade').forEach(el => observeNewCard(el));
  setupBlurLoad();
  setTimeout(() => startIotdAutoPlay(), 100);

  // Restore react states
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('react_')) {
      const id   = k.replace('react_','');
      const type = localStorage.getItem(k);
      if (type) updateReactUI(id, type);
    }
  });
}

// ── BLUR PLACEHOLDER LOAD ─────────────────────────────────────
function setupBlurLoad() {
  document.querySelectorAll('.card-img').forEach(img => {
    if (img.complete) return;
    img.classList.add('loading');
    img.addEventListener('load', () => {
      img.classList.remove('loading');
      img.classList.add('loaded');
    }, { once: true });
  });
}

// ============================================================
//  SCROLL OBSERVER
// ============================================================
function setupScrollObserver() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.scroll-fade').forEach(el => obs.observe(el));
  window._scrollObserver = obs;
}
function observeNewCard(el) { if (window._scrollObserver) window._scrollObserver.observe(el); }

// ============================================================
//  CARD HTML
// ============================================================
function createCardHTML(post, delay=0) {
  const likes    = post.likes    || 0;
  const dislikes = post.dislikes || 0;
  const views    = post.views    || 0;
  const feedbacks= post.feedbacks|| [];
  const images   = post.imgUrls?.length ? post.imgUrls : (post.imgUrl?[post.imgUrl]:[]);
  const bm       = isBookmarked(post.id);
  const mainImg  = images[0] || '';

  const deleteBtn = isAdmin ? `<button class="delete-btn" onclick="deletePost('${post.id}')">${IC.trash}</button>` : '';
  const editBtn   = isAdmin ? `<button class="action-btn" onclick="openEditModal('${post.id}')" title="Edit">${IC.edit}</button>` : '';

  return `
    <article class="image-card scroll-fade" id="card_${post.id}" style="animation-delay:${delay}s">
      <div class="card-img-wrap" onclick="handleImageClick('${post.id}')" style="cursor:pointer">
        <img class="card-img" src="${mainImg}" alt="${escHtml(post.title||'AI Art')}" loading="lazy">
      </div>
      <div class="card-body">
        ${post.title?`<h2 class="card-title">${escHtml(post.title)}</h2>`:''}
        ${post.prompt?`
        <div class="prompt-collapsed" id="pc_${post.id}">
          <span class="prompt-label-inline">Prompt</span>
          <span class="prompt-preview-text">${escHtml(post.prompt)}</span>
          <button class="prompt-more-btn" onclick="togglePrompt('${post.id}')">more</button>
        </div>
        <div class="prompt-expanded-box" id="overlay_${post.id}" style="display:none">
          <span class="prompt-label-inline">AI Prompt</span>
          <p class="prompt-expanded-text">${escHtml(post.prompt)}</p>
          <button class="prompt-more-btn" onclick="togglePrompt('${post.id}')">less</button>
        </div>`:''}

        <div class="action-bar">
          <button class="action-btn" onclick="react('${post.id}','likes')">
            <span class="icon">${IC.heart}</span><span class="count" id="likes_${post.id}">${likes}</span>
          </button>
          <button class="action-btn" onclick="react('${post.id}','dislikes')">
            <span class="icon">${IC.dislike}</span><span class="count" id="dislikes_${post.id}">${dislikes}</span>
          </button>
          <div class="dot-sep"></div>
          <button class="action-btn sky" onclick="openFeedback('${post.id}')">${IC.chat}</button>
          <button class="action-btn sky" onclick="openShare('${post.id}')">${IC.link}</button>
          <button class="action-btn ${bm?'active':''}" data-bm="${post.id}" onclick="toggleBookmark('${post.id}')">${bm?IC.bookmarkF:IC.bookmark}</button>
          <button class="action-btn download" onclick="downloadImage('${mainImg}','${escHtml(post.title||'pink-haze')}')" title="Download">${IC.download}</button>
          <button class="action-btn copy-prompt" onclick="copyPrompt('${escHtml(post.prompt||'')}')" title="Copy Prompt">${IC.copy}</button>
          <button class="action-btn" onclick="openStory('${post.id}')" title="Story View">${IC.story}</button>

          ${editBtn}${deleteBtn}
        </div>
      </div>
    </article>`;
}

// ── IMAGE CLICK ───────────────────────────────────────────────
function handleImageClick(id) { trackView(id); openDetailPage(id); }
window.handleImageClick = handleImageClick;

// ── PROMPT TOGGLE ────────────────────────────────────────────
function togglePrompt(pid) {
  const collapsed = document.getElementById('pc_'+pid);
  const fullBox   = document.getElementById('overlay_'+pid);
  if (!fullBox) return;
  const hidden = fullBox.style.display==='none';
  fullBox.style.display   = hidden?'block':'none';
  if (collapsed) collapsed.style.display = hidden?'none':'flex';
}
window.togglePrompt = togglePrompt;

// ============================================================
//  REACT
// ============================================================
async function react(id, type) {
  // If detail page is open, dpReact handles it — avoid double counting
  const dp = document.getElementById('detailPage');
  if (dp && dp.classList.contains('open')) return;

  const key = 'react_' + id;
  const already = localStorage.getItem(key);
  if (already === type) { showToast(type === 'likes' ? 'Already liked!' : 'Already disliked!'); return; }
  const updates = {};
  if (already) updates[already] = increment(-1);
  updates[type] = increment(1);
  await updateDoc(doc(db, 'posts', id), updates);
  localStorage.setItem(key, type);
  updateReactUI(id, type);
}
window.react = react;

function updateReactUI(id, activeType) {
  // Only update gallery card buttons (not dpReact buttons)
  document.querySelectorAll(`[onclick="react('${id}','likes')"], [onclick="react('${id}','dislikes')"]`).forEach(btn => {
    const ol = btn.getAttribute('onclick') || '';
    if (ol.includes("'likes'"))    btn.classList.toggle('active', activeType === 'likes');
    if (ol.includes("'dislikes'")) btn.classList.toggle('active', activeType === 'dislikes');
  });
}

function syncDetailPageCounts(posts) {
  // Only update gallery cards — not detail page (to avoid overwriting optimistic UI)
  posts.forEach(p => {
    const gl = document.getElementById('likes_'    + p.id);
    const gd = document.getElementById('dislikes_' + p.id);
    if (gl) gl.textContent = p.likes    || 0;
    if (gd) gd.textContent = p.dislikes || 0;
  });
}

// ============================================================
//  DELETE
// ============================================================
async function deletePost(id) {
  if (!isAdmin||!confirm('Delete this post?')) return;
  await deleteDoc(doc(db,'posts',id));
  showToast('Post deleted');
}
window.deletePost = deletePost;

// ============================================================
//  FAB + ADMIN
// ============================================================
function handleFabClick() {
  if (isAdmin) togglePanel();
  else {
    document.getElementById('adminModal').style.display='flex';
    setTimeout(()=>document.getElementById('adminPassInput').focus(),100);
  }
}
window.handleFabClick = handleFabClick;

function closeAdmin() { document.getElementById('adminModal').style.display='none'; document.getElementById('adminPassInput').value=''; }
window.closeAdmin = closeAdmin;

function checkPassword() {
  const val = document.getElementById('adminPassInput').value;
  if (val===ADMIN_PASSWORD) {
    isAdmin=true; closeAdmin(); showToast('Admin access granted');
    if (!document.getElementById('adminBadge')) {
      const b=document.createElement('div'); b.id='adminBadge'; b.className='admin-badge'; b.textContent='✦ Admin Mode'; document.body.appendChild(b);
    }
    document.getElementById('fabIcon').innerHTML=IC.plus;
    listenToPosts();
  } else { showToast('Wrong password'); document.getElementById('adminPassInput').value=''; }
}
window.checkPassword = checkPassword;

// ============================================================
//  UPLOAD PANEL
// ============================================================
function togglePanel() {
  panelOpen=!panelOpen;
  document.getElementById('uploadPanel').classList.toggle('open',panelOpen);
  document.getElementById('fabIcon').innerHTML=panelOpen?IC.close:IC.plus;
  if (panelOpen) document.getElementById('uploadPanel').scrollIntoView({behavior:'smooth',block:'center'});
}
window.togglePanel=togglePanel;

function setupImagePreview() {
  const input=document.getElementById('imageInput');
  input.addEventListener('change',()=>{ selectedFiles=Array.from(input.files); renderPreviews(); });
  document.getElementById('previewContainer').addEventListener('click',e=>e.stopPropagation());
}

function renderPreviews() {
  const container=document.getElementById('previewContainer');
  const placeholder=document.getElementById('uploadPlaceholder');
  if (!selectedFiles.length) { container.innerHTML=''; container.style.display='none'; placeholder.style.display='flex'; return; }
  placeholder.style.display='none'; container.style.display='flex';
  container.innerHTML=selectedFiles.map((file,i)=>{
    const url=URL.createObjectURL(file);
    return `<div class="preview-thumb">
      <img src="${url}" alt="preview ${i+1}">
      <button class="preview-remove" onclick="removeFile(${i})">${IC.close}</button>
      <div class="preview-prompt-wrap">
        <textarea class="per-img-prompt" placeholder="Prompt for image ${i+1}..." rows="2"></textarea>
      </div>
    </div>`;
  }).join('');
}

function removeFile(i) {
  selectedFiles.splice(i,1); renderPreviews();
  if (!selectedFiles.length) document.getElementById('imageInput').value='';
}
window.removeFile=removeFile;

async function postImage() {
  if (!isAdmin) { showToast('Admin only!'); return; }
  const title=document.getElementById('titleInput').value.trim();
  if (!selectedFiles.length) { showToast('Please select an image'); return; }
  const prompts=Array.from(document.querySelectorAll('.per-img-prompt')).map(el=>el.value.trim());
  if (prompts.some(p=>!p)) { showToast('Please add prompt for every image'); return; }
  const btn=document.querySelector('.post-btn');
  btn.textContent=`Uploading 0/${selectedFiles.length}...`; btn.disabled=true;
  try {
    for (let i=0;i<selectedFiles.length;i++) {
      btn.textContent=`Uploading ${i+1}/${selectedFiles.length}...`;
      const fd=new FormData(); fd.append('file',selectedFiles[i]); fd.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);
      const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,{method:'POST',body:fd});
      const data=await res.json();
      if (!data.secure_url) throw new Error('Upload failed');
      await addDoc(collection(db,'posts'),{imgUrl:data.secure_url,imgUrls:[data.secure_url],prompt:prompts[i],title:i===0?title:'',date:new Date().toISOString(),likes:0,dislikes:0,views:0,feedbacks:[]});
    }
    selectedFiles=[]; document.getElementById('imageInput').value=''; document.getElementById('titleInput').value='';
    renderPreviews(); togglePanel(); showToast('Images posted!'); window.scrollTo({top:0,behavior:'smooth'});
  } catch(err) { console.error(err); showToast('Upload failed'); }
  finally { btn.textContent='Post to Gallery'; btn.disabled=false; }
}
window.postImage=postImage;

// ============================================================
//  DETAIL PAGE
// ============================================================
function openDetailPage(postId) {
  const post=allPostsCache.find(p=>p.id===postId);
  if (!post) return;
  trackView(postId);
  const images=post.imgUrls?.length?post.imgUrls:(post.imgUrl?[post.imgUrl]:[]);
  const likes=post.likes||0, dislikes=post.dislikes||0, views=post.views||0;
  const feedbacks=post.feedbacks||[];
  const bm=isBookmarked(postId);
  const mainImg=images[0]||'';

  const imgsHTML=images.map((url,i)=>`<img class="dp-img ${i===0?'active':''}" src="${url}" alt="img ${i+1}" onclick="dpSwitch(${i})" loading="lazy">`).join('');
  const thumbsHTML=images.length>1?`<div class="dp-thumbs">${images.map((url,i)=>`<img class="dp-thumb ${i===0?'active':''}" src="${url}" onclick="dpSwitch(${i})" alt="">`).join('')}</div>`:'';
  const fbHTML=feedbacks.length?feedbacks.map(f=>`
    <div class="dp-fb-item">
      <div class="dp-fb-stars">${IC.starF.repeat(f.rating)}${IC.starE.repeat(5-f.rating)}</div>
      <p class="dp-fb-text">${escHtml(f.text)}</p>
      <span class="dp-fb-date">${new Date(f.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
    </div>`).join(''):'<p class="dp-no-fb">No feedbacks yet — be the first!</p>';

  document.getElementById('detailPage').innerHTML=`
    <div class="dp-inner">
      <button class="fp-back" onclick="closeDetailPage()">${IC.back} Back</button>
      <div class="dp-layout">
        <div class="dp-left">
          <div class="dp-main-img-wrap">${imgsHTML}</div>
          ${thumbsHTML}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button class="action-btn download" onclick="downloadImage('${mainImg}','${escHtml(post.title||'pink-haze')}')" style="padding:8px 14px;font-size:0.8rem">${IC.download} Download</button>
            <button class="action-btn" onclick="openStory('${postId}')" style="padding:8px 14px;font-size:0.8rem">${IC.story} Story View</button>
          </div>
        </div>
        <div class="dp-right">
          ${post.title?`<h2 class="dp-title">${escHtml(post.title)}</h2>`:''}
          <div class="dp-stats-row">
            <span>${IC.chat} ${feedbacks.length} feedbacks</span>
          </div>
          <div class="dp-prompt-box">
            <div class="dp-prompt-label">AI Prompt</div>
            <p class="dp-prompt-text">${escHtml(post.prompt||'')}</p>
            <button class="dp-copy-prompt" onclick="copyPrompt('${escHtml(post.prompt||'')}')">${IC.copy} Copy</button>
          </div>
          <div class="dp-reactions">
            <button class="action-btn dp-react-btn ${localStorage.getItem('react_'+postId)==='likes'?'active':''}"
              id="dp_like_btn_${postId}"
              onclick="dpReact('${postId}','likes')">
              <span class="icon">${IC.heart}</span>
              <span id="dp_likes_${postId}">${likes}</span>
            </button>
            <button class="action-btn dp-react-btn ${localStorage.getItem('react_'+postId)==='dislikes'?'active':''}"
              id="dp_dislike_btn_${postId}"
              onclick="dpReact('${postId}','dislikes')">
              <span class="icon">${IC.dislike}</span>
              <span id="dp_dislikes_${postId}">${dislikes}</span>
            </button>
            <button class="action-btn sky" onclick="openFeedback('${postId}')">${IC.chat} Feedback</button>
            <button class="action-btn sky" onclick="openShare('${postId}')">${IC.link} Share</button>
            <button class="action-btn ${bm?'active':''}" data-bm="${postId}" onclick="toggleBookmark('${postId}')">${bm?IC.bookmarkF:IC.bookmark}</button>
          </div>
          <h3 class="dp-fb-title">Community Feedbacks</h3>
          <div class="dp-fb-list">${fbHTML}</div>
        </div>
      </div>
    </div>`;

  document.getElementById('detailPage').classList.add('open');
  ['site-header','main-content','site-footer'].forEach(c=>{const el=document.querySelector('.'+c);if(el)el.style.display='none';});
  const fab=document.querySelector('.fab'); if(fab) fab.style.display='none';
  const stb=document.getElementById('scrollTopBtn'); if(stb) stb.style.display='none';
  window.scrollTo({top:0});
}
window.openDetailPage=openDetailPage;

function closeDetailPage() {
  document.getElementById('detailPage').classList.remove('open');
  ['site-header','main-content','site-footer'].forEach(c=>{const el=document.querySelector('.'+c);if(el)el.style.display='';});
  const fab=document.querySelector('.fab'); if(fab) fab.style.display='';
  const stb=document.getElementById('scrollTopBtn'); if(stb) stb.style.display='';
}
window.closeDetailPage=closeDetailPage;

function dpSwitch(i) {
  document.querySelectorAll('.dp-img').forEach((el,j)=>el.classList.toggle('active',j===i));
  document.querySelectorAll('.dp-thumb').forEach((el,j)=>el.classList.toggle('active',j===i));
}
window.dpSwitch=dpSwitch;

// ============================================================
//  FEEDBACK PAGE
// ============================================================
function openFeedbackPage(postId) {
  const post=allPostsCache.find(p=>p.id===postId);
  if (!post) return;
  const feedbacks=post.feedbacks||[];
  const images=post.imgUrls?.length?post.imgUrls:(post.imgUrl?[post.imgUrl]:[]);
  const avg=feedbacks.length?(feedbacks.reduce((s,f)=>s+f.rating,0)/feedbacks.length).toFixed(1):null;
  const fbHTML=feedbacks.length?feedbacks.map(f=>`
    <div class="fp-feedback-item">
      <div class="fp-stars">${IC.starF.repeat(f.rating)}${IC.starE.repeat(5-f.rating)}</div>
      <p class="fp-text">${escHtml(f.text)}</p>
      <span class="fp-date">${new Date(f.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
    </div>`).join(''):'<div class="fp-empty">No feedbacks yet</div>';

  document.getElementById('feedbackPage').innerHTML=`
    <div class="fp-inner">
      <button class="fp-back" onclick="closeFeedbackPage()">${IC.back} Back to Gallery</button>
      <div class="fp-hero">
        ${images[0]?`<img src="${images[0]}" class="fp-cover" alt="cover">`:''}
        <div class="fp-hero-info">
          ${post.title?`<h2 class="fp-title">${escHtml(post.title)}</h2>`:''}
          <div class="fp-prompt-box"><span class="fp-prompt-label">AI Prompt</span><p class="fp-prompt-text">${escHtml(post.prompt||'')}</p></div>
          ${avg?`<div class="fp-avg-rating"><span class="fp-avg-num">${avg}</span><div class="fp-avg-stars">${IC.starF.repeat(Math.round(avg))}${IC.starE.repeat(5-Math.round(avg))}</div><span class="fp-avg-label">${feedbacks.length} review${feedbacks.length>1?'s':''}</span></div>`:''}
        </div>
      </div>
      <h3 class="fp-section-title">Community Feedbacks</h3>
      <div class="fp-list">${fbHTML}</div>
    </div>`;

  document.getElementById('feedbackPage').classList.add('open');
  ['site-header','main-content','site-footer'].forEach(c=>{const el=document.querySelector('.'+c);if(el)el.style.display='none';});
  document.querySelector('.fab').style.display='none';
  window.scrollTo({top:0});
}
window.openFeedbackPage=openFeedbackPage;

function closeFeedbackPage() {
  document.getElementById('feedbackPage').classList.remove('open');
  ['site-header','main-content','site-footer'].forEach(c=>{const el=document.querySelector('.'+c);if(el)el.style.display='';});
  document.querySelector('.fab').style.display='';
}
window.closeFeedbackPage=closeFeedbackPage;

// ============================================================
//  FEEDBACK MODAL
// ============================================================
function openFeedback(id) {
  if (localStorage.getItem(`feedback_${id}`)) { showToast('Feedback already submitted!'); return; }
  currentFeedbackId=id; selectedRating=0;
  document.getElementById('feedbackText').value='';
  updateStars(0);
  const m=document.getElementById('feedbackModal');
  m.style.zIndex='1200'; m.style.display='flex';
}
window.openFeedback=openFeedback;
function closeFeedback() { document.getElementById('feedbackModal').style.display='none'; }
window.closeFeedback=closeFeedback;
function setRating(val) { selectedRating=val; updateStars(val); }
window.setRating=setRating;
function updateStars(val) {
  document.querySelectorAll('.star').forEach(s=>s.classList.toggle('active',parseInt(s.dataset.val)<=val));
}
async function submitFeedback() {
  const text=document.getElementById('feedbackText').value.trim();
  if (!text) { showToast('Please write something'); return; }
  if (!selectedRating) { showToast('Please select a rating'); return; }
  try {
    await updateDoc(doc(db,'posts',currentFeedbackId),{feedbacks:arrayUnion({text,rating:selectedRating,date:new Date().toISOString()})});
    localStorage.setItem(`feedback_${currentFeedbackId}`,'1');
    closeFeedback(); showToast('Feedback submitted!');
    const dp=document.getElementById('detailPage');
    if (dp?.classList.contains('open')) setTimeout(()=>openDetailPage(currentFeedbackId),400);
  } catch(e) { showToast('Error submitting feedback'); }
}
window.submitFeedback=submitFeedback;

// ============================================================
//  SHARE
// ============================================================
let currentSharePostId = null;

function openShare(id) {
  currentSharePostId = id;
  const post = allPostsCache.find(p => p.id === id);
  const imgUrl = post?.imgUrls?.[0] || post?.imgUrl || '';
  const pageUrl = `${location.origin}${location.pathname}#card_${id}`;
  const text = encodeURIComponent('Check out this amazing AI art on Pink Haze! ✨');
  const encodedUrl = encodeURIComponent(pageUrl);

  document.getElementById('shareLinkInput').value = pageUrl;
  document.getElementById('shareWhatsAppBtn').href  = `https://wa.me/?text=${text}%20${encodedUrl}`;
  document.getElementById('shareFacebookBtn').href  = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  document.getElementById('shareInstagramBtn').onclick = () => { copyLink(); showToast('Link copied! Paste on Instagram 📸'); };
  document.getElementById('shareThreadsBtn').href   = `https://www.threads.net/intent/post?text=${text}%20${encodedUrl}`;

  const m = document.getElementById('shareModal');
  m.style.zIndex = '1200';
  m.style.display = 'flex';
}
window.openShare = openShare;

function closeShare() { document.getElementById('shareModal').style.display = 'none'; }
window.closeShare = closeShare;

function copyLink() {
  const val = document.getElementById('shareLinkInput').value;
  navigator.clipboard.writeText(val).then(() => showToast('Link copied!'));
}
window.copyLink = copyLink;

function shareWhatsApp()  { /* handled via href */ }
function shareFacebook()  { /* handled via href */ }
function shareInstagram() {
  const val     = document.getElementById('shareLinkInput').value;
  const post    = allPostsCache.find(p => val.includes(p.id));
  const imgUrl  = post?.imgUrls?.[0] || post?.imgUrl || '';

  // Copy link to clipboard
  navigator.clipboard.writeText(val).then(() => {
    showToast('Link copied! Opening Instagram...');
  }).catch(() => {});

  // Try native share API first (works on mobile)
  if (navigator.share) {
    navigator.share({
      title: post?.title || 'Pink Haze AI Art',
      text:  'Check out this amazing AI art on Pink Haze! ' + val,
      url:   val
    }).catch(() => {
      // User cancelled or error — open instagram
      window.open('https://www.instagram.com/', '_blank');
    });
  } else {
    // Desktop — open instagram.com in new tab
    setTimeout(() => window.open('https://www.instagram.com/', '_blank'), 500);
  }
}
function shareThreads()   { /* handled via href */ }
window.shareWhatsApp  = shareWhatsApp;
window.shareFacebook  = shareFacebook;
window.shareInstagram = shareInstagram;
window.shareThreads   = shareThreads;

// ============================================================
//  MODAL OVERLAY CLOSE
// ============================================================
['feedbackModal','shareModal','adminModal','leaderboardModal','editModal'].forEach(id=>{
  document.getElementById(id)?.addEventListener('click',function(e){
    if (e.target===this) {
      if      (id==='feedbackModal')    closeFeedback();
      else if (id==='shareModal')       closeShare();
      else if (id==='adminModal')       closeAdmin();
      else if (id==='leaderboardModal') closeLeaderboard();
      else if (id==='editModal')        closeEditModal();
    }
  });
});



// ── DETAIL PAGE REACT ─────────────────────────────────────────
let dpReactLock = false; // prevent double click

async function dpReact(postId, type) {
  if (dpReactLock) return;
  dpReactLock = true;

  const key     = 'react_' + postId;
  const already = localStorage.getItem(key);

  if (already === type) {
    showToast(type === 'likes' ? 'Already liked!' : 'Already disliked!');
    dpReactLock = false;
    return;
  }

  // Get UI elements
  const likeBtn        = document.getElementById('dp_like_btn_'    + postId);
  const dislikeBtn     = document.getElementById('dp_dislike_btn_' + postId);
  const likeCountEl    = document.getElementById('dp_likes_'       + postId);
  const dislikeCountEl = document.getElementById('dp_dislikes_'    + postId);

  // Read current counts directly from DOM (most accurate at this moment)
  const curLikes    = parseInt(likeCountEl?.textContent    || '0');
  const curDislikes = parseInt(dislikeCountEl?.textContent || '0');

  // Calculate new values
  let newLikes    = curLikes;
  let newDislikes = curDislikes;

  if (type === 'likes') {
    newLikes = curLikes + 1;
    if (already === 'dislikes') newDislikes = Math.max(0, curDislikes - 1);
  } else {
    newDislikes = curDislikes + 1;
    if (already === 'likes') newLikes = Math.max(0, curLikes - 1);
  }

  // Update DOM immediately (optimistic UI)
  if (likeCountEl)    likeCountEl.textContent    = newLikes;
  if (dislikeCountEl) dislikeCountEl.textContent = newDislikes;
  if (likeBtn)    likeBtn.classList.toggle('active',    type === 'likes');
  if (dislikeBtn) dislikeBtn.classList.toggle('active', type === 'dislikes');

  // Save to localStorage
  localStorage.setItem(key, type);

  // Send to Firestore in background
  try {
    const updates = {};
    if (already) updates[already] = increment(-1);
    updates[type] = increment(1);
    await updateDoc(doc(db, 'posts', postId), updates);
    showToast(type === 'likes' ? 'Liked!' : 'Disliked!');
  } catch(e) {
    // Revert UI on error
    if (likeCountEl)    likeCountEl.textContent    = curLikes;
    if (dislikeCountEl) dislikeCountEl.textContent = curDislikes;
    if (likeBtn)    likeBtn.classList.toggle('active',    already === 'likes');
    if (dislikeBtn) dislikeBtn.classList.toggle('active', already === 'dislikes');
    localStorage.setItem(key, already || '');
    showToast('Something went wrong');
  }

  dpReactLock = false;
}
window.dpReact = dpReact;

// ============================================================
//  IOTD CAROUSEL
// ============================================================
let iotdAutoTimer = null;

function iotdGoTo(index) {
  const c = document.getElementById('iotdCarousel');
  if (!c) return;
  const total = parseInt(c.dataset.total);
  index = ((index % total) + total) % total;
  c.dataset.index = index;
  c.querySelectorAll('.iotd-slide').forEach((s,i) => s.classList.toggle('active', i===index));
  c.querySelectorAll('.iotd-dot').forEach((d,i)  => d.classList.toggle('active', i===index));
  const ct = document.getElementById('iotdCounter');
  if (ct) ct.textContent = `${index+1} / ${total}`;
  resetIotdTimer();
}
window.iotdGoTo = iotdGoTo;

function iotdNext() {
  const c = document.getElementById('iotdCarousel');
  if (c) iotdGoTo(parseInt(c.dataset.index)+1);
}
function iotdPrev() {
  const c = document.getElementById('iotdCarousel');
  if (c) iotdGoTo(parseInt(c.dataset.index)-1);
}
window.iotdNext = iotdNext;
window.iotdPrev = iotdPrev;

function resetIotdTimer() {
  clearInterval(iotdAutoTimer);
  iotdAutoTimer = setInterval(() => iotdNext(), 4000);
}

function startIotdAutoPlay() {
  clearInterval(iotdAutoTimer);
  const c = document.getElementById('iotdCarousel');
  if (!c || parseInt(c.dataset.total) <= 1) return;
  iotdAutoTimer = setInterval(() => iotdNext(), 4000);
}

// ============================================================
//  UTILS
// ============================================================
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2800);
}
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function formatDateLabel(dk) {
  if (!dk||dk==='unknown') return 'Earlier';
  const today=new Date().toISOString().slice(0,10);
  const yest=new Date(Date.now()-86400000).toISOString().slice(0,10);
  if (dk===today)  return 'Today';
  if (dk===yest)   return 'Yesterday';
  return new Date(dk).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}