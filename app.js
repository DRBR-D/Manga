/**
 * nHentai iOS Web Reader — Static Web App
 * iOS Human Interface Guidelines compliant
 * Optimized for iPhone SE (4.7" / 375x667)
 */

// CDN Domain Configs (Deterministic hash algorithm)
const IMG_SERVERS = ["i1.nhentai.net", "i2.nhentai.net", "i3.nhentai.net"];
const THUMB_SERVERS = ["t1.nhentai.net", "t2.nhentai.net", "t3.nhentai.net", "t4.nhentai.net"];
const IMG_EXT_MAP = { j: "jpg", p: "png", g: "gif", w: "webp" };

// Global State
const state = {
  activeView: 'listing',
  activeTab: 'home',
  listingType: 'home', // 'home', 'search', 'tag', 'popular', 'favs', 'history'
  query: '',
  tagId: null,
  tagName: '',
  sort: 'recent',
  page: 1,
  maxPages: 1,
  currentBook: null,
  reader: {
    book: null,
    pageIndex: 0,
    mode: 'single', // 'single' | 'continuous'
    fitMode: 'fit-height' // 'fit-height' | 'fit-width' | 'fit-original'
  },
  favorites: JSON.parse(localStorage.getItem('nh_favorites') || '{}'),
  history: JSON.parse(localStorage.getItem('nh_history') || '{}')
};

// ═══════════════════════════════════════════════════════════════════════
// CDN Helpers
// ═══════════════════════════════════════════════════════════════════════
function pickServer(servers, mediaId) {
  if (!mediaId) return servers[0];
  const hash = String(mediaId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return servers[hash % servers.length];
}

function buildPageImageUrl(mediaId, path) {
  return `https://${pickServer(IMG_SERVERS, mediaId)}/${path}`;
}

function buildPageThumbUrl(mediaId, thumbnailOrPath) {
  return `https://${pickServer(THUMB_SERVERS, mediaId)}/${thumbnailOrPath}`;
}

function buildCoverUrl(mediaId, imgType = "j") {
  const ext = IMG_EXT_MAP[imgType] || "jpg";
  return `https://${pickServer(THUMB_SERVERS, mediaId)}/galleries/${mediaId}/cover.${ext}`;
}

function buildGalleryThumbUrl(mediaId) {
  return `https://${pickServer(THUMB_SERVERS, mediaId)}/galleries/${mediaId}/thumb.webp`;
}

// ═══════════════════════════════════════════════════════════════════════
// API Fetcher with CORS Proxy Fallbacks
// ═══════════════════════════════════════════════════════════════════════
async function fetchApi(endpoint, params = {}) {
  const cleanParams = { ...params };
  if (cleanParams.sort === 'recent') delete cleanParams.sort;

  const queryString = new URLSearchParams(cleanParams).toString();
  const rawTargetUrl = `https://nhentai.net/api/v2/${endpoint}${queryString ? '?' + queryString : ''}`;

  const fetchTargets = [
    rawTargetUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(rawTargetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(rawTargetUrl)}`
  ];

  let lastError = null;
  for (const url of fetchTargets) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(lastError ? lastError.message : 'Không thể lấy dữ liệu từ nHentai API');
}

// ═══════════════════════════════════════════════════════════════════════
// Initialize
// ═══════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateFavBadge();
  loadHomepage();
});

// ═══════════════════════════════════════════════════════════════════════
// Event Listeners
// ═══════════════════════════════════════════════════════════════════════
function setupEventListeners() {
  // ── Brand / Logo ──
  document.getElementById('brand-logo').addEventListener('click', () => {
    state.listingType = 'home';
    state.query = '';
    state.tagId = null;
    state.page = 1;
    setActiveTab('tab-home');
    loadHomepage();
  });

  // ── Search Form ──
  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    state.listingType = 'search';
    state.query = query;
    state.tagId = null;
    state.sort = document.getElementById('sort-select').value;
    state.page = 1;
    loadListing();
  });

  // Search clear button
  document.getElementById('search-clear-btn').addEventListener('click', () => {
    const input = document.getElementById('search-input');
    input.value = '';
    input.focus();
    state.listingType = 'home';
    state.query = '';
    state.tagId = null;
    state.page = 1;
    setActiveTab('tab-home');
    loadHomepage();
  });

  // Sort change
  document.getElementById('sort-select').addEventListener('change', () => {
    if (state.listingType === 'search' || state.listingType === 'tag') {
      state.sort = document.getElementById('sort-select').value;
      state.page = 1;
      loadListing();
    }
  });

  // ── ID Jumper ──
  document.getElementById('jump-id-btn').addEventListener('click', jumpToId);
  document.getElementById('jump-id-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') jumpToId();
  });

  // ── Random (top nav) ──
  document.getElementById('btn-random-top').addEventListener('click', fetchRandomBook);

  // ── Bottom Tab Bar ──
  document.querySelectorAll('.ios-tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      switch (view) {
        case 'home':
          setActiveTab('tab-home');
          state.listingType = 'home';
          state.page = 1;
          loadHomepage();
          break;
        case 'search':
          setActiveTab('tab-search');
          document.getElementById('search-input').focus();
          break;
        case 'popular':
          setActiveTab('tab-popular');
          state.listingType = 'popular';
          loadPopularSectionOnly();
          break;
        case 'favs':
          setActiveTab('tab-favs');
          state.listingType = 'favs';
          renderFavsView();
          break;
        case 'history':
          setActiveTab('tab-history');
          state.listingType = 'history';
          renderHistoryView();
          break;
      }
    });
  });

  // ── Pagination ──
  document.getElementById('pg-first').addEventListener('click', () => changePage(1));
  document.getElementById('pg-prev').addEventListener('click', () => changePage(state.page - 1));
  document.getElementById('pg-next').addEventListener('click', () => changePage(state.page + 1));
  document.getElementById('pg-last').addEventListener('click', () => changePage(state.maxPages));
  document.getElementById('pg-input').addEventListener('change', (e) => {
    let p = parseInt(e.target.value, 10);
    if (isNaN(p)) return;
    p = Math.max(1, Math.min(p, state.maxPages));
    changePage(p);
  });

  // ── Detail View ──
  document.getElementById('details-back-btn').addEventListener('click', () => {
    switchView('listing');
  });

  document.getElementById('btn-start-reading').addEventListener('click', () => {
    if (state.currentBook) openReader(state.currentBook, 0);
  });

  document.getElementById('btn-toggle-fav').addEventListener('click', () => {
    if (state.currentBook) toggleFavorite(state.currentBook);
  });

  document.getElementById('btn-random-detail').addEventListener('click', fetchRandomBook);

  // ── Reader Controls ──
  document.getElementById('reader-close-btn').addEventListener('click', closeReader);

  document.getElementById('reader-mode-select').addEventListener('change', (e) => {
    state.reader.mode = e.target.value;
    renderReaderStage();
  });

  document.getElementById('btn-prev-page').addEventListener('click', () => stepReaderPage(-1));
  document.getElementById('btn-next-page').addEventListener('click', () => stepReaderPage(1));

  document.getElementById('reader-page-input').addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && state.reader.book) {
      setReaderPage(val - 1);
    }
  });

  document.getElementById('btn-toggle-fit').addEventListener('click', () => {
    const modes = ['fit-height', 'fit-width', 'fit-original'];
    const currentIdx = modes.indexOf(state.reader.fitMode);
    state.reader.fitMode = modes[(currentIdx + 1) % modes.length];
    updateReaderFitClass();
    showToast(`Kích thước: ${state.reader.fitMode}`);
  });

  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

  // Reader touch zones
  document.getElementById('zone-prev').addEventListener('click', () => stepReaderPage(-1));
  document.getElementById('zone-next').addEventListener('click', () => stepReaderPage(1));

  // Keyboard shortcuts
  document.addEventListener('keydown', handleGlobalKeyDown);

  // Reader toolbar auto-hide on tap (toggle)
  document.getElementById('single-reader-container').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      toggleReaderToolbar();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Tab Bar
// ═══════════════════════════════════════════════════════════════════════
function setActiveTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.ios-tab-item').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active');
    target.setAttribute('aria-selected', 'true');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// View Switching
// ═══════════════════════════════════════════════════════════════════════
function switchView(viewName) {
  state.activeView = viewName;
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('ios-hidden'));

  if (viewName === 'listing') {
    const listingSec = document.getElementById('view-listing');
    if (listingSec) listingSec.classList.remove('ios-hidden');
  } else if (viewName === 'details') {
    const detailsSec = document.getElementById('view-details');
    if (detailsSec) detailsSec.classList.remove('ios-hidden');
  } else if (viewName === 'reader') {
    const readerSec = document.getElementById('view-reader');
    if (readerSec) readerSec.classList.remove('ios-hidden');
  }

  // Toggle bottom tab bar visibility (hide in reader)
  const tabBar = document.getElementById('ios-tab-bar');
  if (viewName === 'reader') {
    tabBar.classList.add('ios-hidden');
  } else {
    tabBar.classList.remove('ios-hidden');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Data Fetching: Homepage
// ═══════════════════════════════════════════════════════════════════════
async function loadHomepage() {
  switchView('listing');
  const popularBanner = document.getElementById('popular-banner');
  const paginationBar = document.getElementById('pagination');
  const filterBadge = document.getElementById('active-filter-badge');
  const listingTitle = document.getElementById('listing-title');

  popularBanner.classList.remove('ios-hidden');
  paginationBar.classList.remove('ios-hidden');
  filterBadge.classList.add('ios-hidden');
  listingTitle.textContent = '📖 Mới Nhất';

  showLoader(true);
  try {
    const [popularData, homeData] = await Promise.all([
      fetchApi('galleries/popular').catch(() => []),
      fetchApi('galleries', { page: state.page, per_page: 25 })
    ]);

    renderPopularBanner(popularData);
    renderGalleryGrid(homeData.result || []);
    state.maxPages = homeData.num_pages || 1;
    updatePaginationUI();
  } catch (err) {
    showToast(`Lỗi: ${err.message}`);
  } finally {
    showLoader(false);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Data Fetching: Popular Only
// ═══════════════════════════════════════════════════════════════════════
async function loadPopularSectionOnly() {
  switchView('listing');
  document.getElementById('popular-banner').classList.add('ios-hidden');
  document.getElementById('pagination').classList.add('ios-hidden');

  const filterBadge = document.getElementById('active-filter-badge');
  filterBadge.classList.remove('ios-hidden');
  filterBadge.textContent = '🔥 Hot';

  document.getElementById('listing-title').textContent = '🔥 Phổ Biến';

  showLoader(true);
  try {
    const popularData = await fetchApi('galleries/popular');
    renderGalleryGrid(popularData || []);
  } catch (err) {
    showToast(`Lỗi: ${err.message}`);
  } finally {
    showLoader(false);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Data Fetching: Search & Tag Filter
// ═══════════════════════════════════════════════════════════════════════
async function loadListing() {
  switchView('listing');
  document.getElementById('popular-banner').classList.add('ios-hidden');
  document.getElementById('pagination').classList.remove('ios-hidden');

  const filterBadge = document.getElementById('active-filter-badge');
  filterBadge.classList.remove('ios-hidden');

  showLoader(true);
  try {
    let data;
    if (state.listingType === 'search') {
      filterBadge.textContent = `"${state.query}"`;
      document.getElementById('listing-title').textContent = '🔍 Kết Quả';
      data = await fetchApi('search', {
        query: state.query,
        page: state.page,
        sort: state.sort
      });
    } else if (state.listingType === 'tag') {
      filterBadge.textContent = `${state.tagName || ('Tag: ' + state.tagId)}`;
      document.getElementById('listing-title').textContent = '🏷️ Theo Tag';
      data = await fetchApi('galleries/tagged', {
        tag_id: state.tagId,
        page: state.page,
        sort: state.sort
      });
    }

    renderGalleryGrid(data.result || []);
    state.maxPages = data.num_pages || 1;
    updatePaginationUI();
  } catch (err) {
    showToast(`Lỗi: ${err.message}`);
  } finally {
    showLoader(false);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Jump to ID
// ═══════════════════════════════════════════════════════════════════════
async function jumpToId() {
  const input = document.getElementById('jump-id-input');
  const bookId = parseInt(input.value.trim(), 10);
  if (!bookId || isNaN(bookId)) {
    showToast('Vui lòng nhập ID hợp lệ');
    return;
  }
  loadBookDetails(bookId);
}

// ═══════════════════════════════════════════════════════════════════════
// Random Book
// ═══════════════════════════════════════════════════════════════════════
async function fetchRandomBook() {
  showToast('Đang chọn truyện ngẫu nhiên...');
  try {
    const book = await fetchApi('galleries/random');
    if (book && book.id) {
      loadBookDetails(book.id);
    }
  } catch (err) {
    showToast(`Lỗi: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Render Gallery Grid
// ═══════════════════════════════════════════════════════════════════════
function renderGalleryGrid(galleries) {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';

  if (!galleries || galleries.length === 0) {
    const empty = document.getElementById('listing-empty');
    if (empty) {
      empty.classList.remove('ios-hidden');
      document.getElementById('listing-empty-desc').textContent = 'Không tìm thấy gallery nào.';
    }
    return;
  }

  const empty = document.getElementById('listing-empty');
  if (empty) empty.classList.add('ios-hidden');

  galleries.forEach(item => {
    const card = createGalleryCard(item);
    grid.appendChild(card);
  });
}

function renderPopularBanner(popularGalleries) {
  const bannerGrid = document.getElementById('popular-grid');
  bannerGrid.innerHTML = '';

  if (!popularGalleries || popularGalleries.length === 0) return;

  popularGalleries.slice(0, 8).forEach(item => {
    const card = createPopularCard(item);
    bannerGrid.appendChild(card);
  });
}

function createGalleryCard(item) {
  const mediaId = item.media_id;
  const isFav = !!state.favorites[item.id];
  const titleText = item.title ? (item.title.pretty || item.title.english) : (item.english_title || item.japanese_title || `Gallery #${item.id}`);

  const thumbUrl = item.thumbnail && item.thumbnail.includes('/')
    ? `https://${pickServer(THUMB_SERVERS, mediaId)}/${item.thumbnail}`
    : buildGalleryThumbUrl(mediaId);

  const card = document.createElement('div');
  card.className = 'ios-card';
  card.innerHTML = `
    <div class="ios-card-thumb">
      <img src="${thumbUrl}" alt="${titleText}" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/250x350/2C2C2E/ffffff?text=No+Cover'">
      <span class="ios-card-badge">${item.num_pages}P</span>
      <button class="ios-card-fav-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Bỏ yêu thích' : 'Thêm yêu thích'}">♥</button>
    </div>
    <div class="ios-card-info">
      <div class="ios-card-title" title="${titleText}">${titleText}</div>
      <div class="ios-card-meta">
        <span>#${item.id}</span>
        <span>💖 ${item.num_favorites || 0}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.classList.contains('ios-card-fav-btn')) return;
    loadBookDetails(item.id);
  });

  const favBtn = card.querySelector('.ios-card-fav-btn');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(item, favBtn);
  });

  return card;
}

function createPopularCard(item) {
  const mediaId = item.media_id;
  const titleText = item.title ? (item.title.pretty || item.title.english) : `Gallery #${item.id}`;

  const thumbUrl = item.thumbnail && item.thumbnail.includes('/')
    ? `https://${pickServer(THUMB_SERVERS, mediaId)}/${item.thumbnail}`
    : buildGalleryThumbUrl(mediaId);

  const card = document.createElement('div');
  card.className = 'ios-popular-card';
  card.innerHTML = `
    <div class="ios-popular-thumb">
      <img src="${thumbUrl}" alt="${titleText}" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/250x350/2C2C2E/ffffff?text=No+Cover'">
    </div>
    <div class="ios-popular-info">
      <div class="ios-popular-title">${titleText}</div>
      <div class="ios-popular-meta">#${item.id} · ${item.num_pages}P</div>
    </div>
  `;

  card.addEventListener('click', () => loadBookDetails(item.id));
  return card;
}

// ═══════════════════════════════════════════════════════════════════════
// Book Details
// ═══════════════════════════════════════════════════════════════════════
async function loadBookDetails(bookId) {
  showLoader(true);
  try {
    const book = await fetchApi(`galleries/${bookId}`);
    state.currentBook = book;
    saveHistory(book);

    fetchApi(`galleries/${bookId}/related`).then(relData => {
      renderRelatedSection(relData.result || []);
    }).catch(() => {});

    renderDetailsView(book);
    switchView('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    showToast(`Không thể tải #${bookId}: ${err.message}`);
  } finally {
    showLoader(false);
  }
}

function renderDetailsView(book) {
  const mediaId = book.media_id;
  const coverType = book.cover ? book.cover.t : 'j';
  const coverUrl = buildCoverUrl(mediaId, coverType);

  document.getElementById('details-cover').src = coverUrl;
  document.getElementById('details-title-pretty').textContent = book.title?.pretty || book.title?.english || `Gallery #${book.id}`;
  document.getElementById('details-title-english').textContent = book.title?.english || '';
  document.getElementById('details-title-japanese').textContent = book.title?.japanese || '';

  document.getElementById('details-pages-count').textContent = book.num_pages;
  document.getElementById('details-favs-count').textContent = book.num_favorites;
  document.getElementById('details-id').textContent = book.id;

  const dateStr = book.upload_date ? new Date(book.upload_date * 1000).toLocaleDateString('vi-VN') : 'N/A';
  document.getElementById('details-upload-date').textContent = dateStr;

  const isFav = !!state.favorites[book.id];
  const favBtn = document.getElementById('btn-toggle-fav');
  favBtn.textContent = isFav ? '💔 Bỏ Yêu Thích' : '💖 Yêu Thích';
  favBtn.className = isFav ? 'ios-btn ios-btn-danger' : 'ios-btn ios-btn-secondary';

  renderDetailsTags(book.tags || []);
  renderDetailsThumbnails(book);
}

function renderDetailsTags(tags) {
  const container = document.getElementById('details-tags-list');
  container.innerHTML = '';

  const groups = {};
  tags.forEach(tag => {
    const type = tag.type || 'tag';
    if (!groups[type]) groups[type] = [];
    groups[type].push(tag);
  });

  const categoryOrder = ['language', 'artist', 'character', 'parody', 'group', 'category', 'tag'];

  categoryOrder.forEach(cat => {
    if (!groups[cat]) return;
    const groupEl = document.createElement('div');
    groupEl.className = 'ios-tag-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'ios-tag-label';
    labelEl.textContent = cat;

    const listEl = document.createElement('div');
    listEl.className = 'ios-tag-chips';

    groups[cat].forEach(t => {
      const chip = document.createElement('button');
      chip.className = 'ios-tag-chip';
      chip.innerHTML = `${t.name} <span class="count">${t.count ? '(' + formatCount(t.count) + ')' : ''}</span>`;
      chip.addEventListener('click', () => {
        state.listingType = 'tag';
        state.tagId = t.id;
        state.tagName = t.name;
        state.page = 1;
        loadListing();
      });
      listEl.appendChild(chip);
    });

    groupEl.appendChild(labelEl);
    groupEl.appendChild(listEl);
    container.appendChild(groupEl);
  });
}

function renderDetailsThumbnails(book) {
  const grid = document.getElementById('pages-thumb-grid');
  grid.innerHTML = '';
  document.getElementById('thumb-count').textContent = book.pages ? book.pages.length : 0;

  if (!book.pages) return;

  const mediaId = book.media_id;
  book.pages.forEach((p, idx) => {
    const pageNum = idx + 1;
    const thumbUrl = buildPageThumbUrl(mediaId, p.thumbnail || p.path);

    const card = document.createElement('div');
    card.className = 'ios-thumb-card';
    card.innerHTML = `
      <img src="${thumbUrl}" alt="Trang ${pageNum}" loading="lazy" referrerpolicy="no-referrer">
      <div class="page-num">${pageNum}</div>
    `;
    card.addEventListener('click', () => openReader(book, idx));
    grid.appendChild(card);
  });
}

function renderRelatedSection(relatedList) {
  const grid = document.getElementById('related-grid');
  grid.innerHTML = '';
  if (!relatedList || relatedList.length === 0) {
    grid.innerHTML = '<p style="color:var(--ios-text-tertiary);text-align:center;padding:24px;font-size:14px;">Không có đề xuất.</p>';
    return;
  }

  relatedList.slice(0, 6).forEach(item => {
    const card = createGalleryCard(item);
    grid.appendChild(card);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Reader Engine
// ═══════════════════════════════════════════════════════════════════════
function openReader(book, startIndex = 0) {
  state.reader.book = book;
  state.reader.pageIndex = Math.max(0, Math.min(startIndex, book.pages.length - 1));

  document.getElementById('reader-book-title').textContent = book.title?.pretty || book.title?.english || `Gallery #${book.id}`;
  document.getElementById('reader-total-pages').textContent = book.pages.length;
  document.getElementById('reader-page-indicator-text').textContent = `${startIndex + 1} / ${book.pages.length}`;

  switchView('reader');
  renderReaderStage();
}

function closeReader() {
  switchView(state.currentBook ? 'details' : 'listing');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function renderReaderStage() {
  const mode = state.reader.mode;
  const singleContainer = document.getElementById('single-reader-container');
  const continuousContainer = document.getElementById('continuous-reader-container');

  if (mode === 'single') {
    singleContainer.classList.remove('ios-hidden');
    continuousContainer.classList.add('ios-hidden');
    updateSinglePage();
  } else {
    singleContainer.classList.add('ios-hidden');
    continuousContainer.classList.remove('ios-hidden');
    renderContinuousPages();
  }
}

function updateSinglePage() {
  const book = state.reader.book;
  const idx = state.reader.pageIndex;
  if (!book || !book.pages || !book.pages[idx]) return;

  const pageObj = book.pages[idx];
  const mediaId = book.media_id;
  const imgUrl = buildPageImageUrl(mediaId, pageObj.path);

  const imgEl = document.getElementById('reader-current-img');
  const loaderEl = document.getElementById('reader-img-loader');

  loaderEl.classList.remove('ios-hidden');
  imgEl.style.opacity = '0.3';

  imgEl.onload = () => {
    loaderEl.classList.add('ios-hidden');
    imgEl.style.opacity = '1';
  };
  imgEl.onerror = () => {
    loaderEl.classList.add('ios-hidden');
    imgEl.style.opacity = '1';
    showToast(`Không thể tải trang ${idx + 1}`);
  };

  imgEl.src = imgUrl;
  updateReaderFitClass();

  // Update page indicators
  document.getElementById('reader-page-input').value = idx + 1;
  document.getElementById('reader-page-indicator-text').textContent = `${idx + 1} / ${book.pages.length}`;

  preloadNextPages(idx + 1, 2);
  saveHistory(book, idx + 1);
}

function updateReaderFitClass() {
  const imgEl = document.getElementById('reader-current-img');
  imgEl.className = `ios-reader-image ${state.reader.fitMode}`;
}

function stepReaderPage(delta) {
  if (state.reader.mode !== 'single') return;
  const book = state.reader.book;
  if (!book) return;

  const newIdx = state.reader.pageIndex + delta;
  if (newIdx < 0) {
    showToast('Đây là trang đầu tiên');
    return;
  }
  if (newIdx >= book.pages.length) {
    showToast('Đã đọc hết bộ truyện này! 🎉');
    return;
  }
  setReaderPage(newIdx);
}

function setReaderPage(idx) {
  state.reader.pageIndex = idx;
  updateSinglePage();
}

function preloadNextPages(startIndex, count) {
  const book = state.reader.book;
  if (!book || !book.pages) return;
  for (let i = startIndex; i < startIndex + count && i < book.pages.length; i++) {
    const pageObj = book.pages[i];
    const url = buildPageImageUrl(book.media_id, pageObj.path);
    const img = new Image();
    img.src = url;
  }
}

function renderContinuousPages() {
  const container = document.getElementById('continuous-pages-list');
  container.innerHTML = '';
  const book = state.reader.book;
  if (!book || !book.pages) return;

  const mediaId = book.media_id;
  book.pages.forEach((p, idx) => {
    const pageNum = idx + 1;
    const imgUrl = buildPageImageUrl(mediaId, p.path);

    const item = document.createElement('div');
    item.className = 'ios-reader-scroll-page';
    item.innerHTML = `
      <img src="${imgUrl}" alt="Trang ${pageNum}" loading="lazy" referrerpolicy="no-referrer">
      <div class="page-num">${pageNum} / ${book.pages.length}</div>
    `;
    container.appendChild(item);
  });
}

function toggleReaderToolbar() {
  const toolbar = document.getElementById('reader-toolbar');
  const bottomBar = document.getElementById('reader-bottom-bar');
  toolbar.classList.toggle('ios-hidden');
  bottomBar.classList.toggle('ios-hidden');
}

// ═══════════════════════════════════════════════════════════════════════
// Keyboard & Fullscreen
// ═══════════════════════════════════════════════════════════════════════
function handleGlobalKeyDown(e) {
  if (state.activeView === 'reader') {
    if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
      stepReaderPage(-1);
    } else if (e.key === 'ArrowRight' || e.code === 'KeyD' || e.key === ' ') {
      e.preventDefault();
      stepReaderPage(1);
    } else if (e.key === 'Escape') {
      closeReader();
    } else if (e.code === 'KeyF') {
      toggleFullscreen();
    }
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Favorites
// ═══════════════════════════════════════════════════════════════════════
function toggleFavorite(book, btnEl = null) {
  const id = book.id;
  const isFav = !!state.favorites[id];

  if (isFav) {
    delete state.favorites[id];
    showToast(`Đã xóa #${id} khỏi yêu thích`);
  } else {
    state.favorites[id] = {
      id: book.id,
      media_id: book.media_id,
      title: book.title,
      english_title: book.title?.english,
      japanese_title: book.title?.japanese,
      num_pages: book.num_pages,
      num_favorites: book.num_favorites,
      cover: book.cover
    };
    showToast(`Đã thêm #${id} vào yêu thích! 💖`);
  }

  localStorage.setItem('nh_favorites', JSON.stringify(state.favorites));
  updateFavBadge();

  if (btnEl) {
    btnEl.classList.toggle('active', !isFav);
  }

  if (state.currentBook && state.currentBook.id === id) {
    const detailFavBtn = document.getElementById('btn-toggle-fav');
    if (detailFavBtn) {
      detailFavBtn.textContent = !isFav ? '💔 Bỏ Yêu Thích' : '💖 Yêu Thích';
      detailFavBtn.className = !isFav ? 'ios-btn ios-btn-danger' : 'ios-btn ios-btn-secondary';
    }
  }

  // Re-render if viewing favs
  if (state.listingType === 'favs') {
    renderFavsView();
  }
}

function updateFavBadge() {
  const count = Object.keys(state.favorites).length;
  const badge = document.getElementById('fav-count-badge');
  badge.textContent = count;
  if (count > 0) {
    badge.classList.remove('ios-hidden');
  } else {
    badge.classList.add('ios-hidden');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Favorites View
// ═══════════════════════════════════════════════════════════════════════
function renderFavsView() {
  switchView('listing');
  document.getElementById('popular-banner').classList.add('ios-hidden');
  document.getElementById('pagination').classList.add('ios-hidden');

  const filterBadge = document.getElementById('active-filter-badge');
  filterBadge.classList.remove('ios-hidden');
  filterBadge.textContent = `${Object.keys(state.favorites).length} truyện`;

  document.getElementById('listing-title').textContent = '💖 Yêu Thích';

  const favList = Object.values(state.favorites);
  const empty = document.getElementById('listing-empty');
  if (favList.length === 0) {
    if (empty) {
      empty.classList.remove('ios-hidden');
      document.getElementById('listing-empty-desc').textContent = 'Chưa có truyện yêu thích nào.';
    }
  } else {
    if (empty) empty.classList.add('ios-hidden');
  }
  renderGalleryGrid(favList);
}

// ═══════════════════════════════════════════════════════════════════════
// History
// ═══════════════════════════════════════════════════════════════════════
function saveHistory(book, lastPage = 1) {
  state.history[book.id] = {
    id: book.id,
    media_id: book.media_id,
    title: book.title,
    english_title: book.title?.english,
    num_pages: book.num_pages,
    num_favorites: book.num_favorites,
    lastPage: lastPage,
    updatedAt: Date.now()
  };
  localStorage.setItem('nh_history', JSON.stringify(state.history));
}

function renderHistoryView() {
  switchView('listing');
  document.getElementById('popular-banner').classList.add('ios-hidden');
  document.getElementById('pagination').classList.add('ios-hidden');

  const filterBadge = document.getElementById('active-filter-badge');
  filterBadge.classList.remove('ios-hidden');
  filterBadge.textContent = `${Object.keys(state.history).length} truyện`;

  document.getElementById('listing-title').textContent = '📜 Lịch Sử';

  const historyList = Object.values(state.history).sort((a, b) => b.updatedAt - a.updatedAt);

  const empty = document.getElementById('listing-empty');
  if (historyList.length === 0) {
    if (empty) {
      empty.classList.remove('ios-hidden');
      document.getElementById('listing-empty-desc').textContent = 'Chưa có lịch sử đọc.';
    }
  } else {
    if (empty) empty.classList.add('ios-hidden');
  }
  renderGalleryGrid(historyList);
}

// ═══════════════════════════════════════════════════════════════════════
// Pagination
// ═══════════════════════════════════════════════════════════════════════
function changePage(newPage) {
  state.page = newPage;
  if (state.listingType === 'home') {
    loadHomepage();
  } else {
    loadListing();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updatePaginationUI() {
  document.getElementById('pg-input').value = state.page;
  document.getElementById('pg-max').textContent = state.maxPages;
}

// ═══════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════
function showLoader(visible) {
  const loader = document.getElementById('listing-loader');
  if (visible) loader.classList.remove('ios-hidden');
  else loader.classList.add('ios-hidden');
}

function formatCount(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num;
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'ios-toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
