// ============================================================
//  ✦ Pink Haze — Cloudinary + Firebase + Admin Password
//  Updated: Scroll animations, Multiple images, Date grouping
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, orderBy, query, onSnapshot, arrayUnion, increment }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============================================================
//  🔧 FIREBASE CONFIG
// ============================================================
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_API_KEY,
  authDomain:        import.meta.env.VITE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_APP_ID
};

// ============================================================
//  ☁️ CLOUDINARY CONFIG
// ============================================================
const CLOUDINARY_CLOUD_NAME    = "dzdi5kpla";
const CLOUDINARY_UPLOAD_PRESET = "PinkHaze";

// ============================================================
//  🔑 ADMIN PASSWORD
// ============================================================
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

// ============================================================
//  INIT
// ============================================================
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

let isAdmin           = false;
let panelOpen         = false;
let currentFeedbackId = null;
let currentShareId    = null;
let selectedRating    = 0;
let selectedFiles     = [];   // multiple images support

// ============================================================
//  ON LOAD
// ============================================================

// ============================================================
//  WELCOME SCREEN — Typing Animation
// ============================================================
function startWelcome() {
  const title    = 'Welcome to Pink Haze';
  const subtitle = 'A daily gallery of AI-generated art — curated with love. Discover breathtaking visuals, share your thoughts, and explore creativity one image at a time.';
  const typedEl  = document.getElementById('typedText');
  const subEl    = document.getElementById('welcomeSub');
  const btn      = document.getElementById('welcomeBtn');

  let i = 0;
  // Type title
  const typeTitle = setInterval(() => {
    if (i < title.length) {
      typedEl.textContent += title[i];
      i++;
    } else {
      clearInterval(typeTitle);
      // After title done — show subtitle
      setTimeout(() => {
        subEl.textContent = subtitle;
        subEl.classList.add('show');
        // Show button
        setTimeout(() => {
          btn.classList.add('show');
          btn.style.opacity = '1';
        }, 600);
      }, 300);
    }
  }, 55);
}

function enterGallery() {
  const screen = document.getElementById('welcomeScreen');
  screen.classList.add('hide');
  setTimeout(() => { screen.style.display = 'none'; }, 800);
}
window.enterGallery = enterGallery;

document.addEventListener('DOMContentLoaded', () => {
  startWelcome();
  listenToPosts();
  setupImagePreview();
  setupScrollObserver();
});

// ============================================================
//  SCROLL ANIMATION — Intersection Observer
// ============================================================
function setupScrollObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // animate only once
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  // Observe existing cards
  document.querySelectorAll('.image-card, .date-group-header').forEach(el => observer.observe(el));
  window._scrollObserver = observer; // save for new cards
}

function observeNewCard(el) {
  if (window._scrollObserver) window._scrollObserver.observe(el);
}

// ============================================================
//  REAL-TIME LISTENER
// ============================================================
function listenToPosts() {
  const q = query(collection(db, "posts"), orderBy("date", "desc"));
  onSnapshot(q, (snapshot) => {
    const posts = [];
    snapshot.forEach(d => posts.push({ id: d.id, ...d.data() }));
    allPostsCache = posts;
    renderFeed(posts);
    syncDetailPageCounts(posts);
  });
}

// ============================================================
//  RENDER FEED — Date Grouped
// ============================================================
function renderFeed(posts) {
  const feed = document.getElementById('feed');
  if (!posts.length) {
    feed.innerHTML = `
      <div class="empty-state">
        <div class="e-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style="color:var(--pink)"><path d="M12 2C9.5 2 8 4 8 6c0 1.1.4 2.1 1 2.8C7.4 9.6 6 11.6 6 14c0 3.3 2.7 6 6 6s6-2.7 6-6c0-2.4-1.4-4.4-3-5.2.6-.7 1-1.7 1-2.8 0-2-1.5-4-4-4z"/></svg></div>
        <h3>No images yet</h3>
        <p>Admin will post the first daily image soon!</p>
      </div>`;
    return;
  }

  // Group posts by date (YYYY-MM-DD)
  const grouped = {};
  posts.forEach(p => {
    const dateKey = p.date ? p.date.slice(0, 10) : 'unknown';
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(p);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  let html = '';
  sortedDates.forEach((dateKey, i) => {
    const label = formatDateLabel(dateKey);
    const groupPosts = grouped[dateKey];

    html += `<div class="date-group-header scroll-fade" style="animation-delay:${i * 0.05}s">
               <span class="date-group-line"></span>
               <span class="date-group-label">${label}</span>
               <span class="date-group-line"></span>
             </div>`;

    // 6-column grid: each card sits directly in the grid (masonry-col uses display:contents)
    html += `<div class="masonry-grid">`;
    groupPosts.forEach((p, j) => {
      html += `<div class="masonry-col">` + createCardHTML(p, (i + j) * 0.05) + `</div>`;
    });
    html += `</div>`;
  });

  allPostsCache = posts;
  feed.innerHTML = html;
  feed.querySelectorAll('.scroll-fade').forEach(el => observeNewCard(el));

  // Restore active state for already-reacted posts
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('react_')) {
      const postId = key.replace('react_', '');
      const type   = localStorage.getItem(key);
      if (type) updateReactUI(postId, type);
    }
  });
}

// ============================================================
//  CARD HTML — with multi-image carousel
// ============================================================
function createCardHTML(post, delay = 0) {
  const likes     = post.likes    || 0;
  const dislikes  = post.dislikes || 0;
  const feedbacks = post.feedbacks || [];

  const images = post.imgUrls && post.imgUrls.length
    ? post.imgUrls
    : (post.imgUrl ? [post.imgUrl] : []);

  const deleteBtn = isAdmin
    ? `<button class="delete-btn" onclick="deletePost('${post.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg> Delete</button>`
    : '';

  const fbSection = feedbacks.length
    ? `<div class="feedbacks-section">
        <span class="feedbacks-toggle" onclick="toggleFeedbacks('${post.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ${feedbacks.length} feedback${feedbacks.length > 1 ? 's' : ''} — tap to view
        </span>
        <div class="feedbacks-list" id="fb_${post.id}" style="display:none">
          ${feedbacks.map(f => `
            <div class="feedback-item">
              <div class="fb-stars">${'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(f.rating)}${'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(5 - f.rating)}</div>
              <div class="fb-text">${escHtml(f.text)}</div>
            </div>`).join('')}
        </div>
      </div>`
    : '';

  const carouselHTML = buildCarousel(post.id, images, post.prompt, post.title);

  return `
    <article class="image-card scroll-fade" id="card_${post.id}" style="animation-delay:${delay}s">
      ${carouselHTML}
      <div class="card-body">
        <div class="action-bar">
          <button class="action-btn" onclick="react('${post.id}','likes')" title="Like">
            <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
            <span class="count" id="likes_${post.id}">${likes}</span>
          </button>
          <button class="action-btn" onclick="react('${post.id}','dislikes')" title="Dislike">
            <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg></span>
            <span class="count" id="dislikes_${post.id}">${dislikes}</span>
          </button>
          <div class="dot-sep"></div>
          <button class="action-btn sky" onclick="openFeedback('${post.id}')">
            <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span><span>Feedback</span>
          </button>
          <button class="action-btn sky" onclick="openShare('${post.id}')">
            <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span><span>Share</span>
          </button>
          ${feedbacks.length ? `<button class="action-btn view-fb-btn" onclick="openFeedbackPage('${post.id}')">
            <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>
            <span>${feedbacks.length}</span>
          </button>` : ''}
          ${deleteBtn}
        </div>
      </div>
    </article>`;
}

// ============================================================
//  CAROUSEL BUILDER
// ============================================================
function buildCarousel(postId, images, prompt, title) {
  if (!images.length) return '';

  const PREV_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  const NEXT_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

  const pid = postId + '_prompt';
  const promptOverlay = ''; // prompt now shown in card-body below image

  if (images.length === 1) {
    return `
      <div class="card-img-wrap" onclick="openDetailPage('${postId}')" style="cursor:pointer">
        <img class="card-img" src="${images[0]}" alt="Daily Image" loading="lazy">
      </div>`;
  }

  // Multiple images
  const dots = images.map((_, i) =>
    `<button class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goSlide('${postId}',${i})" aria-label="Slide ${i+1}"></button>`
  ).join('');

  const slides = images.map((url, i) =>
    `<div class="carousel-slide ${i === 0 ? 'active' : ''}">
       <img class="card-img" src="${url}" alt="Image ${i+1}" loading="lazy">
     </div>`
  ).join('');

  return `
    <div class="carousel" id="carousel_${postId}" data-index="0" data-total="${images.length}">
      <div class="carousel-track" onclick="openDetailPage('${postId}')" style="cursor:pointer">${slides}</div>
      <button class="carousel-btn prev" onclick="event.stopPropagation();prevSlide('${postId}')">${PREV_SVG}</button>
      <button class="carousel-btn next" onclick="event.stopPropagation();nextSlide('${postId}')">${NEXT_SVG}</button>
      <div class="carousel-dots">${dots}</div>
      <span class="carousel-counter" id="counter_${postId}">1 / ${images.length}</span>
    </div>`;
}

// ============================================================
//  CAROUSEL CONTROLS
// ============================================================
function goSlide(postId, index) {
  const carousel = document.getElementById(`carousel_${postId}`);
  if (!carousel) return;
  const total = parseInt(carousel.dataset.total);
  index = ((index % total) + total) % total;
  carousel.dataset.index = index;

  carousel.querySelectorAll('.carousel-slide').forEach((s, i) => {
    s.classList.toggle('active', i === index);
  });
  carousel.querySelectorAll('.carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === index);
  });
  const counter = document.getElementById(`counter_${postId}`);
  if (counter) counter.textContent = `${index + 1} / ${total}`;
}

function nextSlide(postId) {
  const carousel = document.getElementById(`carousel_${postId}`);
  if (!carousel) return;
  goSlide(postId, parseInt(carousel.dataset.index) + 1);
}

function prevSlide(postId) {
  const carousel = document.getElementById(`carousel_${postId}`);
  if (!carousel) return;
  goSlide(postId, parseInt(carousel.dataset.index) - 1);
}

window.goSlide   = goSlide;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;

// ============================================================
//  REACT — Like / Dislike
// ============================================================
async function react(id, type) {
  const storageKey = `react_${id}`;
  const already = localStorage.getItem(storageKey);

  // Same button again — block
  if (already === type) {
    showToast(type === 'likes' ? 'Already liked!' : 'Already disliked!');
    return;
  }

  const postRef = doc(db, "posts", id);
  const updates = {};

  // Undo previous reaction using Firestore increment(-1)
  if (already) {
    updates[already] = increment(-1);
  }

  // Add new reaction using Firestore increment(+1)
  updates[type] = increment(1);

  await updateDoc(postRef, updates);

  // Save choice
  localStorage.setItem(storageKey, type);

  // Update button UI
  updateReactUI(id, type);
}

function updateReactUI(id, activeType) {
  // Highlight buttons everywhere
  document.querySelectorAll(`[onclick*="react('${id}'"]`).forEach(btn => {
    const isLike    = btn.getAttribute('onclick').includes("'likes'");
    const isDislike = btn.getAttribute('onclick').includes("'dislikes'");
    if (isLike)    btn.classList.toggle('active', activeType === 'likes');
    if (isDislike) btn.classList.toggle('active', activeType === 'dislikes');
  });
}

// Called by Firestore onSnapshot — keep detail page counts live
function syncDetailPageCounts(posts) {
  const dp = document.getElementById('detailPage');
  if (!dp || !dp.classList.contains('open')) return;

  posts.forEach(p => {
    // Update detail page like/dislike spans
    const lEl = document.getElementById(`dp_likes_${p.id}`);
    const dEl = document.getElementById(`dp_dislikes_${p.id}`);
    if (lEl) lEl.textContent = p.likes    || 0;
    if (dEl) dEl.textContent = p.dislikes || 0;

    // Also sync gallery counters
    const glEl = document.getElementById(`likes_${p.id}`);
    const gdEl = document.getElementById(`dislikes_${p.id}`);
    if (glEl) glEl.textContent = p.likes    || 0;
    if (gdEl) gdEl.textContent = p.dislikes || 0;
  });
}
window.react = react;

// ============================================================
//  DELETE POST
// ============================================================
async function deletePost(id) {
  if (!isAdmin) return;
  if (!confirm('Delete this post?')) return;
  await deleteDoc(doc(db, "posts", id));
  showToast('Post deleted');
}
window.deletePost = deletePost;

// ============================================================
//  FAB — Admin gate
// ============================================================
function handleFabClick() {
  if (isAdmin) {
    togglePanel();
  } else {
    document.getElementById('adminModal').style.display = 'flex';
    setTimeout(() => document.getElementById('adminPassInput').focus(), 100);
  }
}
window.handleFabClick = handleFabClick;

function closeAdmin() {
  document.getElementById('adminModal').style.display = 'none';
  document.getElementById('adminPassInput').value = '';
}
window.closeAdmin = closeAdmin;

function checkPassword() {
  const val = document.getElementById('adminPassInput').value;
  if (val === ADMIN_PASSWORD) {
    isAdmin = true;
    closeAdmin();
    showToast('Admin access granted');
    if (!document.getElementById('adminBadge')) {
      const badge = document.createElement('div');
      badge.id = 'adminBadge';
      badge.className = 'admin-badge';
      badge.textContent = 'Admin Mode';
      document.body.appendChild(badge);
    }
    document.getElementById('fabIcon').textContent = '＋';
    listenToPosts();
  } else {
    showToast('Wrong password');
    document.getElementById('adminPassInput').value = '';
  }
}
window.checkPassword = checkPassword;

// ============================================================
//  UPLOAD PANEL
// ============================================================
function togglePanel() {
  panelOpen = !panelOpen;
  document.getElementById('uploadPanel').classList.toggle('open', panelOpen);
  document.getElementById('fabIcon').innerHTML = panelOpen ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>` : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  if (panelOpen) {
    document.getElementById('uploadPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
window.togglePanel = togglePanel;

// ============================================================
//  IMAGE PREVIEW — Multiple files support
// ============================================================
function setupImagePreview() {
  const input = document.getElementById('imageInput');
  input.addEventListener('change', () => {
    selectedFiles = Array.from(input.files);
    renderPreviews();
  });

  // Prevent clicks inside preview container from bubbling to upload-area
  document.getElementById('previewContainer').addEventListener('click', e => {
    e.stopPropagation();
  });
}

function renderPreviews() {
  const container = document.getElementById('previewContainer');
  const placeholder = document.getElementById('uploadPlaceholder');

  if (!selectedFiles.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    placeholder.style.display = 'flex';
    return;
  }

  placeholder.style.display = 'none';
  container.style.display = 'flex';
  container.innerHTML = selectedFiles.map((file, i) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="preview-thumb">
        <img src="${url}" alt="preview ${i+1}">
        <button class="preview-remove" onclick="removeFile(${i})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <div class="preview-prompt-wrap">
          <textarea class="per-img-prompt" placeholder="Prompt for image ${i+1}..." rows="2"></textarea>
        </div>
      </div>`;
  }).join('');
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  // Rebuild FileList-like array (selectedFiles is now just an array)
  renderPreviews();
  if (!selectedFiles.length) {
    document.getElementById('imageInput').value = '';
  }
}
window.removeFile = removeFile;

// ============================================================
//  POST IMAGE — Multiple Cloudinary Upload + Firestore Save
// ============================================================
async function postImage() {
  if (!isAdmin) { showToast('Admin only!'); return; }

  const title = document.getElementById('titleInput').value.trim();

  if (!selectedFiles.length) { showToast('Please select an image'); return; }

  // Collect per-image prompts
  const promptInputs = document.querySelectorAll('.per-img-prompt');
  const prompts = Array.from(promptInputs).map(el => el.value.trim());
  if (prompts.some(p => !p)) { showToast('Please add prompt for every image'); return; }

  const btn = document.querySelector('.post-btn');
  btn.textContent = `Uploading 0/${selectedFiles.length}...`;
  btn.disabled = true;

  try {
    const imgUrls = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      btn.textContent = `Uploading ${i + 1}/${selectedFiles.length}...`;
      const formData = new FormData();
      formData.append('file', selectedFiles[i]);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const res  = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      if (!data.secure_url) throw new Error('Cloudinary upload failed');
      imgUrls.push(data.secure_url);
    }

    // Save each image as its OWN post (separate card per image, each with own prompt)
    for (let i = 0; i < imgUrls.length; i++) {
      await addDoc(collection(db, "posts"), {
        imgUrl:    imgUrls[i],
        imgUrls:   [imgUrls[i]],
        prompt:    prompts[i],
        title:     i === 0 ? title : '',
        date:      new Date().toISOString(),
        likes:     0,
        dislikes:  0,
        feedbacks: []
      });
    }

    // Reset form
    selectedFiles = [];
    document.getElementById('imageInput').value = '';
    document.getElementById('titleInput').value = '';
    renderPreviews();

    togglePanel();
    showToast('Images posted!');
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    console.error(err);
    showToast('Upload failed — check console');
  } finally {
    btn.textContent = 'Post to Gallery';
    btn.disabled = false;
  }
}
window.postImage = postImage;



// ============================================================
//  DETAIL PAGE — tap on image
// ============================================================
function openDetailPage(postId) {
  const post = allPostsCache.find(p => p.id === postId);
  if (!post) return;

  const images  = post.imgUrls && post.imgUrls.length ? post.imgUrls : (post.imgUrl ? [post.imgUrl] : []);
  const likes   = post.likes    || 0;
  const dislikes= post.dislikes || 0;
  const feedbacks = post.feedbacks || [];

  const STAR_F = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:var(--pink)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  const STAR_E = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--border)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

  const imgsHTML = images.map((url, i) =>
    `<img class="dp-img ${i === 0 ? 'active' : ''}" src="${url}" alt="img ${i+1}" onclick="dpSwitch(${i})" loading="lazy">`
  ).join('');

  const thumbsHTML = images.length > 1 ? `
    <div class="dp-thumbs">
      ${images.map((url, i) =>
        `<img class="dp-thumb ${i === 0 ? 'active' : ''}" src="${url}" onclick="dpSwitch(${i})" alt="thumb ${i+1}">`
      ).join('')}
    </div>` : '';

  const fbHTML = feedbacks.length
    ? feedbacks.map(f => `
        <div class="dp-fb-item">
          <div class="dp-fb-stars">${STAR_F.repeat(f.rating)}${STAR_E.repeat(5 - f.rating)}</div>
          <p class="dp-fb-text">${escHtml(f.text)}</p>
        </div>`).join('')
    : '<p class="dp-no-fb">No feedbacks yet — be the first!</p>';

  document.getElementById('detailPage').innerHTML = `
    <div class="dp-inner">
      <button class="fp-back" onclick="closeDetailPage()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </button>

      <div class="dp-layout">
        <div class="dp-left">
          <div class="dp-main-img-wrap">
            ${imgsHTML}
          </div>
          ${thumbsHTML}
        </div>

        <div class="dp-right">
          ${post.title ? `<h2 class="dp-title">${escHtml(post.title)}</h2>` : ''}

          <div class="dp-prompt-box">
            <div class="dp-prompt-label">AI Prompt</div>
            <p class="dp-prompt-text">${escHtml(post.prompt || '')}</p>
          </div>

          <div class="dp-reactions">
            <button class="action-btn ${localStorage.getItem('react_'+postId)==='likes'?'active':''}" onclick="react('${postId}','likes')">
              <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
              <span id="dp_likes_${postId}">${likes}</span>
            </button>
            <button class="action-btn ${localStorage.getItem('react_'+postId)==='dislikes'?'active':''}" onclick="react('${postId}','dislikes')">
              <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg></span>
              <span id="dp_dislikes_${postId}">${dislikes}</span>
            </button>
            <button class="action-btn sky" onclick="openFeedback('${postId}')">
              <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
              Feedback
            </button>
          </div>

          <h3 class="dp-fb-title">Community Feedbacks</h3>
          <div class="dp-fb-list">${fbHTML}</div>
        </div>
      </div>
    </div>`;

  document.getElementById('detailPage').classList.add('open');
  document.querySelector('.site-header').style.display = 'none';
  document.querySelector('.main-content').style.display = 'none';
  document.querySelector('.site-footer').style.display  = 'none';
  document.querySelector('.fab').style.display          = 'none';
  window.scrollTo({ top: 0 });
}
window.openDetailPage = openDetailPage;

function closeDetailPage() {
  document.getElementById('detailPage').classList.remove('open');
  document.querySelector('.site-header').style.display = '';
  document.querySelector('.main-content').style.display = '';
  document.querySelector('.site-footer').style.display  = '';
  document.querySelector('.fab').style.display          = '';
}
window.closeDetailPage = closeDetailPage;

function dpSwitch(index) {
  document.querySelectorAll('.dp-img').forEach((el, i) => el.classList.toggle('active', i === index));
  document.querySelectorAll('.dp-thumb').forEach((el, i) => el.classList.toggle('active', i === index));
}
window.dpSwitch = dpSwitch;

// ============================================================
//  FEEDBACK PAGE
// ============================================================
let allPostsCache = [];

function openFeedbackPage(postId) {
  const post = allPostsCache.find(p => p.id === postId);
  if (!post) return;

  const feedbacks = post.feedbacks || [];
  const images = post.imgUrls && post.imgUrls.length ? post.imgUrls : (post.imgUrl ? [post.imgUrl] : []);
  const coverImg = images[0] || '';

  const STAR_F = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color:var(--pink)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  const STAR_E = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--border)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

  const fbHTML = feedbacks.length
    ? feedbacks.map(f => `
        <div class="fp-feedback-item">
          <div class="fp-stars">${STAR_F.repeat(f.rating)}${STAR_E.repeat(5 - f.rating)}</div>
          <p class="fp-text">${escHtml(f.text)}</p>
          <span class="fp-date">${new Date(f.date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</span>
        </div>`).join('')
    : '<div class="fp-empty">No feedbacks yet</div>';

  const avgRating = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : null;

  document.getElementById('feedbackPage').innerHTML = `
    <div class="fp-inner">
      <button class="fp-back" onclick="closeFeedbackPage()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to Gallery
      </button>

      <div class="fp-hero">
        ${coverImg ? `<img src="${coverImg}" class="fp-cover" alt="cover">` : ''}
        <div class="fp-hero-info">
          ${post.title ? `<h2 class="fp-title">${escHtml(post.title)}</h2>` : ''}
          <div class="fp-prompt-box">
            <span class="fp-prompt-label">AI Prompt</span>
            <p class="fp-prompt-text">${escHtml(post.prompt)}</p>
          </div>
          ${avgRating ? `
          <div class="fp-avg-rating">
            <span class="fp-avg-num">${avgRating}</span>
            <div class="fp-avg-stars">${STAR_F.repeat(Math.round(avgRating))}${STAR_E.repeat(5 - Math.round(avgRating))}</div>
            <span class="fp-avg-label">${feedbacks.length} review${feedbacks.length > 1 ? 's' : ''}</span>
          </div>` : ''}
        </div>
      </div>

      <h3 class="fp-section-title">Community Feedbacks</h3>
      <div class="fp-list">${fbHTML}</div>
    </div>`;

  document.getElementById('feedbackPage').classList.add('open');
  document.querySelector('.site-header').style.display = 'none';
  document.querySelector('.main-content').style.display = 'none';
  document.querySelector('.site-footer').style.display = 'none';
  document.querySelector('.fab').style.display = 'none';
  window.scrollTo({ top: 0 });
}
window.openFeedbackPage = openFeedbackPage;

function closeFeedbackPage() {
  document.getElementById('feedbackPage').classList.remove('open');
  document.querySelector('.site-header').style.display = '';
  document.querySelector('.main-content').style.display = '';
  document.querySelector('.site-footer').style.display = '';
  document.querySelector('.fab').style.display = '';
}
window.closeFeedbackPage = closeFeedbackPage;

// ============================================================
//  FEEDBACK MODAL
// ============================================================
function openFeedback(id) {
  if (localStorage.getItem(`feedback_${id}`)) {
    showToast('Feedback already submitted!');
    return;
  }
  currentFeedbackId = id;
  selectedRating = 0;
  document.getElementById('feedbackText').value = '';
  updateStars(0);
  // Make sure modal is above detail page
  const modal = document.getElementById('feedbackModal');
  modal.style.zIndex = '1100';
  modal.style.display = 'flex';
}
window.openFeedback = openFeedback;

function closeFeedback() {
  document.getElementById('feedbackModal').style.display = 'none';
}
window.closeFeedback = closeFeedback;

function setRating(val) { selectedRating = val; updateStars(val); }
window.setRating = setRating;

function updateStars(val) {
  document.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
  });
}

async function submitFeedback() {
  const text = document.getElementById('feedbackText').value.trim();
  if (!text)           { showToast('Please write something'); return; }
  if (!selectedRating) { showToast('Please select a rating'); return; }

  try {
    await updateDoc(doc(db, "posts", currentFeedbackId), {
      feedbacks: arrayUnion({ text, rating: selectedRating, date: new Date().toISOString() })
    });
    // Save so user can't submit again
    localStorage.setItem(`feedback_${currentFeedbackId}`, '1');
    closeFeedback();
    showToast('Feedback submitted!');
    // Refresh detail page feedbacks if open
    const dp = document.getElementById('detailPage');
    if (dp && dp.classList.contains('open')) {
      setTimeout(() => openDetailPage(currentFeedbackId), 400);
    }
  } catch (err) {
    showToast('Error submitting feedback');
  }
}
window.submitFeedback = submitFeedback;

// ============================================================
//  SHARE
// ============================================================
function openShare(id) {
  currentShareId = id;
  const shareUrl = `${location.href.split('#')[0]}#card_${id}`;
  document.getElementById('shareLinkInput').value = shareUrl;
  document.getElementById('shareModal').style.display = 'flex';
}
window.openShare = openShare;

function closeShare() { document.getElementById('shareModal').style.display = 'none'; }
window.closeShare = closeShare;

function copyLink() {
  navigator.clipboard.writeText(document.getElementById('shareLinkInput').value)
    .then(() => showToast('Link copied!'));
}
window.copyLink = copyLink;

function shareWhatsApp() {
  const url = encodeURIComponent(document.getElementById('shareLinkInput').value);
  window.open(`https://wa.me/?text=Check%20this%20AI%20art!%20${url}`, '_blank');
}
window.shareWhatsApp = shareWhatsApp;

function shareTwitter() {
  const url = encodeURIComponent(document.getElementById('shareLinkInput').value);
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=Amazing%20AI%20Art%20✨`, '_blank');
}
window.shareTwitter = shareTwitter;

function shareInstagram() { copyLink(); showToast('Link copied! Paste on Instagram'); }
window.shareInstagram = shareInstagram;

// ============================================================
//  TOGGLE FEEDBACKS
// ============================================================
function toggleFeedbacks(id) {
  const el = document.getElementById('fb_' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}
window.toggleFeedbacks = toggleFeedbacks;

// ============================================================
//  CLOSE MODALS ON OVERLAY CLICK
// ============================================================
['feedbackModal','shareModal','adminModal'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', function(e) {
    if (e.target === this) {
      if (id === 'feedbackModal') closeFeedback();
      else if (id === 'shareModal') closeShare();
      else closeAdmin();
    }
  });
});


// ============================================================
//  TOGGLE FULL PROMPT
// ============================================================
function togglePrompt(pid) {
  const collapsed = document.getElementById('pc_' + pid);
  const fullBox   = document.getElementById('overlay_' + pid);
  if (!fullBox) return;
  const isHidden = fullBox.style.display === 'none';
  fullBox.style.display   = isHidden ? 'block' : 'none';
  if (collapsed) collapsed.style.display = isHidden ? 'none' : 'flex';
}
window.togglePrompt = togglePrompt;

// ============================================================
//  UTILS
// ============================================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function formatDateLabel(dateKey) {
  if (!dateKey || dateKey === 'unknown') return 'Earlier';
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateKey === today)     return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  const d = new Date(dateKey);
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}