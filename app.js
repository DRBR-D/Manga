/**
 * nHentai Web Reader — Hybrid Web Application
 * Compatible with Cloudflare Pages (dash.cloudflare.com), GitHub Pages, and Local Hosting
 * Based on nhentai-api-docs.md specification
 */

// CDN Domain Configs (Deterministic hash algorithm as in md)
const IMG_SERVERS = ["i1.nhentai.net", "i2.nhentai.net", "i3.nhentai.net"];
const THUMB_SERVERS = ["t1.nhentai.net", "t2.nhentai.net", "t3.nhentai.net", "t4.nhentai.net"];
const IMG_EXT_MAP = { j: "jpg", p: "png", g: "gif", w: "webp" };

// Global State
const state = {
  activeView: 'listing',
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

// CDN Helper Functions
function pickServer(servers, mediaId) {
  if (!mediaId) return servers[0];
  const hash = String(mediaId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return servers[hash % servers.length];
}

function buildPageImageUrl(mediaId, path) {
  const srv = pickServer(IMG_SERVERS, mediaId);
  return `https://${srv}/${path}`;
}

function buildPageThumbUrl(mediaId, thumbnailOrPath) {
  const srv = pickServer(THUMB_SERVERS, mediaId);
  return `https://${srv}/${thumbnailOrPath}`;
}

function buildCoverUrl(mediaId, imgType = "j") {
  const ext = IMG_EXT_MAP[imgType] || "jpg";
  const srv = pickServer(THUMB_SERVERS, mediaId);
  return `https://${srv}/galleries/${mediaId}/cover.${ext}`;
}

function buildGalleryThumbUrl(mediaId) {
  const srv = pickServer(THUMB_SERVERS, mediaId);
  return `https://${srv}/galleries/${mediaId}/thumb.webp`;
}

/**
 * Universal Smart API Fetcher
 * Strategy:
 * 1. Relative `/api/` (Works automatically on Cloudflare Pages via Functions & Local Server)
 * 2. Direct `https://nhentai.net/api/v2/`
 * 3. Public CORS Proxies (allorigins, corsproxy, etc. for GitHub Pages)
 */
async function fetchApi(endpoint, params = {}) {
  const cleanParams = { ...params };
  if (cleanParams.sort === 'recent') delete cleanParams.sort; // Prevent 400 Bad Request on v2 search

  const queryString = new URLSearchParams(cleanParams).toString();
  const relUrl = `/api/${endpoint}${queryString ? '?' + queryString : ''}`;
  const directUrl = `https://nhentai.net/api/v2/${endpoint}${queryString ? '?' + queryString : ''}`;

  // Candidates array in order of preference
  const candidates = [
    relUrl, // Cloudflare Pages Function or Local Express Proxy
    directUrl, // Direct API fetch
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
    `https://cors.eu.org/${directUrl}`
  ];

  let lastError = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          return data;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(lastError ? lastError.message : 'Không thể kết nối nHentai API. Hãy kiểm tra lại mạng hoặc thử chọn server khác.');
}

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateFavBadge();
  loadHomepage();
});

// Event Listeners
function setupEventListeners() {
  document.getElementById('brand-logo').addEventListener('click', () => {
    state.listingType = 'home';
    state.query = '';
    state.tagId = null;
    state.page = 1;
    loadHomepage();
  });

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

  document.getElementById('sort-select').addEventListener('change', () => {
    if (state.listingType === 'search' || state.listingType === 'tag') {
      state.sort = document.getElementById('sort-select').value;
      state.page = 1;
      loadListing();
    }
  });

  document.getElementById('jump-id-btn').addEventListener('click', jumpToId);
  document.getElementById('jump-id-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') jumpToId();
  });

  document.getElementById('nav-home').addEventListener('click', () => {
    setActiveNav('nav-home');
    state.listingType = 'home';
    state.page = 1;
    loadHomepage();
  });

  document.getElementById('nav-popular').addEventListener('click', () => {
    setActiveNav('nav-popular');
    state.listingType = 'popular';
    loadPopularSectionOnly();
  });

  document.getElementById('nav-random').addEventListener('click', fetchRandomBook);

  document.getElementById('nav-favs').addEventListener('click', () => {
    setActiveNav('nav-favs');
    state.listingType = 'favs';
    renderFavsView();
  });

  document.getElementById('nav-history').addEventListener('click', () => {
    setActiveNav('nav-history');
    state.listingType = 'history';
    renderHistoryView();
  });

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

  document.getElementById('zone-prev').addEventListener('click', () => stepReaderPage(-1));
  document.getElementById('zone-next').addEventListener('click', () => stepReaderPage(1));

  document.addEventListener('keydown', handleGlobalKeyDown);
}

function setActiveNav(navId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const target = document.getElementById(navId);
  if (target) target.classList.add('active');
}

function switchView(viewName) {
  state.activeView = viewName;
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) activeSec.classList.add('active');
}

// Data Fetching: Homepage
async function loadHomepage() {
  switchView('listing');
  setActiveNav('nav-home');
  document.getElementById('popular-banner').classList.remove('hidden');
  document.getElementById('active-filter-badge').classList.add('hidden');
  document.getElementById('listing-title').textContent = '📖 Galleries Mới Nhất';

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
    showToast(`Lỗi tải trang chủ: ${err.message}`);
  } finally {
    showLoader(false);
  }
}

// Data Fetching: Popular Section Only
async function loadPopularSectionOnly() {
  switchView('listing');
  document.getElementById('popular-banner').classList.add('hidden');
  document.getElementById('active-filter-badge').classList.remove('hidden');
  document.getElementById('active-filter-badge').textContent = '🔥 Hot Popular';
  document.getElementById('listing-title').textContent = '🔥 Galleries Phổ Biến';

  showLoader(true);
  try {
    const popularData = await fetchApi('galleries/popular');
    renderGalleryGrid(popularData || []);
    document.getElementById('pagination').style.display = 'none';
  } catch (err) {
    showToast(`Lỗi tải phổ biến: ${err.message}`);
  } finally {
    showLoader(false);
  }
}

// Data Fetching: Search & Tag Filter
async function loadListing() {
  switchView('listing');
  document.getElementById('popular-banner').classList.add('hidden');
  document.getElementById('pagination').style.display = 'flex';

  const filterBadge = document.getElementById('active-filter-badge');
  filterBadge.classList.remove('hidden');

  showLoader(true);
  try {
    let data;
    if (state.listingType === 'search') {
      filterBadge.textContent = `Từ khóa: "${state.query}"`;
      document.getElementById('listing-title').textContent = '🔍 Kết Quả Tìm Kiếm';
      data = await fetchApi('search', {
        query: state.query,
        page: state.page,
        sort: state.sort
      });
    } else if (state.listingType === 'tag') {
      filterBadge.textContent = `Tag: ${state.tagName || ('ID ' + state.tagId)}`;
      document.getElementById('listing-title').textContent = '🏷️ Danh Sách Theo Tag';
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
    showToast(`Lỗi tìm kiếm: ${err.message}`);
  } finally {
    showLoader(false);
  }
}

async function jumpToId() {
  const input = document.getElementById('jump-id-input');
  const bookId = parseInt(input.value.trim(), 10);
  if (!bookId || isNaN(bookId)) {
    showToast('Vui lòng nhập ID hợp lệ');
    return;
  }
  loadBookDetails(bookId);
}

async function fetchRandomBook() {
  showToast('Đang chọn truyện ngẫu nhiên...');
  try {
    const book = await fetchApi('galleries/random');
    if (book && book.id) {
      loadBookDetails(book.id);
    }
  } catch (err) {
    showToast(`Lỗi lấy random: ${err.message}`);
  }
}

function renderGalleryGrid(galleries) {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';

  if (!galleries || galleries.length === 0) {
    grid.innerHTML = '<p class="no-data">Không tìm thấy gallery nào.</p>';
    return;
  }

  galleries.forEach(item => {
    const card = createGalleryCard(item);
    grid.appendChild(card);
  });
}

function renderPopularBanner(popularGalleries) {
  const bannerGrid = document.getElementById('popular-grid');
  bannerGrid.innerHTML = '';

  if (!popularGalleries || popularGalleries.length === 0) return;

  popularGalleries.slice(0, 5).forEach(item => {
    const card = createGalleryCard(item);
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
  card.className = 'gallery-card';
  card.innerHTML = `
    <div class="card-thumb-container">
      <img src="${thumbUrl}" alt="${titleText}" class="card-thumb-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/250x350/1e212d/ffffff?text=No+Cover'">
      <span class="card-pages-badge">${item.num_pages}P</span>
      <button class="card-fav-btn ${isFav ? 'active' : ''}" title="Thêm vào yêu thích">♥</button>
    </div>
    <div class="card-info">
      <div class="card-title" title="${titleText}">${titleText}</div>
      <div class="card-meta">
        <span>#${item.id}</span>
        <span>💖 ${item.num_favorites || 0}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.classList.contains('card-fav-btn')) return;
    loadBookDetails(item.id);
  });

  const favBtn = card.querySelector('.card-fav-btn');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(item, favBtn);
  });

  return card;
}

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
    showToast(`Không thể tải thông tin truyện #${bookId}: ${err.message}`);
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
  favBtn.textContent = isFav ? '💔 Bỏ Yêu Thích' : '💖 Thêm Vào Yêu Thích';
  favBtn.className = isFav ? 'btn btn-outline btn-lg active' : 'btn btn-outline btn-lg';

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
    groupEl.className = 'tag-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'tag-group-label';
    labelEl.textContent = cat;

    const listEl = document.createElement('div');
    listEl.className = 'tag-badges-list';

    groups[cat].forEach(t => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
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
    card.className = 'page-thumb-card';
    card.innerHTML = `
      <img src="${thumbUrl}" alt="Page ${pageNum}" class="page-thumb-img" loading="lazy" referrerpolicy="no-referrer">
      <div class="page-thumb-num">${pageNum}</div>
    `;

    card.addEventListener('click', () => {
      openReader(book, idx);
    });

    grid.appendChild(card);
  });
}

function renderRelatedSection(relatedList) {
  const grid = document.getElementById('related-grid');
  grid.innerHTML = '';
  if (!relatedList || relatedList.length === 0) {
    grid.innerHTML = '<p class="no-data">Không có đề xuất.</p>';
    return;
  }

  relatedList.slice(0, 6).forEach(item => {
    const card = createGalleryCard(item);
    grid.appendChild(card);
  });
}

// Reader Engine
function openReader(book, startIndex = 0) {
  state.reader.book = book;
  state.reader.pageIndex = Math.max(0, Math.min(startIndex, book.pages.length - 1));

  document.getElementById('reader-book-title').textContent = book.title?.pretty || book.title?.english || `Gallery #${book.id}`;
  document.getElementById('reader-total-pages').textContent = book.pages.length;

  switchView('reader');
  renderReaderStage();
}

function closeReader() {
  switchView('details');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function renderReaderStage() {
  const mode = state.reader.mode;
  const singleContainer = document.getElementById('single-reader-container');
  const continuousContainer = document.getElementById('continuous-reader-container');

  if (mode === 'single') {
    singleContainer.classList.remove('hidden');
    continuousContainer.classList.add('hidden');
    document.getElementById('reader-page-nav').classList.remove('hidden');
    updateSinglePage();
  } else {
    singleContainer.classList.add('hidden');
    continuousContainer.classList.remove('hidden');
    document.getElementById('reader-page-nav').classList.add('hidden');
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

  loaderEl.classList.remove('hidden');
  imgEl.style.opacity = '0.3';

  imgEl.onload = () => {
    loaderEl.classList.add('hidden');
    imgEl.style.opacity = '1';
  };
  imgEl.onerror = () => {
    loaderEl.classList.add('hidden');
    imgEl.style.opacity = '1';
    showToast(`Không thể tải trang ${idx + 1}. Thử lại...`);
  };

  imgEl.src = imgUrl;
  updateReaderFitClass();

  document.getElementById('reader-page-input').value = idx + 1;

  preloadNextPages(idx + 1, 2);
  saveHistory(book, idx + 1);
}

function updateReaderFitClass() {
  const imgEl = document.getElementById('reader-current-img');
  imgEl.className = `reader-main-img ${state.reader.fitMode}`;
}

function stepReaderPage(delta) {
  if (state.reader.mode !== 'single') return;
  const book = state.reader.book;
  if (!book) return;

  const newIdx = state.reader.pageIndex + delta;
  if (newIdx < 0) {
    showToast('Đây là trang đầu tiên!');
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
    item.className = 'continuous-page-item';
    item.innerHTML = `
      <img src="${imgUrl}" alt="Page ${pageNum}" class="continuous-page-img" loading="lazy" referrerpolicy="no-referrer">
      <div class="continuous-page-num">Trang ${pageNum} / ${book.pages.length}</div>
    `;

    container.appendChild(item);
  });
}

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

function toggleFavorite(book, btnEl = null) {
  const id = book.id;
  const isFav = !!state.favorites[id];

  if (isFav) {
    delete state.favorites[id];
    showToast(`Đã xóa #${id} khỏi danh sách yêu thích`);
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
    showToast(`Đã thêm #${id} vào danh sách yêu thích! 💖`);
  }

  localStorage.setItem('nh_favorites', JSON.stringify(state.favorites));
  updateFavBadge();

  if (btnEl) {
    btnEl.classList.toggle('active', !isFav);
  }

  if (state.currentBook && state.currentBook.id === id) {
    const detailFavBtn = document.getElementById('btn-toggle-fav');
    if (detailFavBtn) {
      detailFavBtn.textContent = !isFav ? '💔 Bỏ Yêu Thích' : '💖 Thêm Vào Yêu Thích';
      detailFavBtn.className = !isFav ? 'btn btn-outline btn-lg active' : 'btn btn-outline btn-lg';
    }
  }
}

function updateFavBadge() {
  const count = Object.keys(state.favorites).length;
  document.getElementById('fav-count-badge').textContent = count;
}

function renderFavsView() {
  switchView('listing');
  document.getElementById('popular-banner').classList.add('hidden');
  document.getElementById('pagination').style.display = 'none';
  document.getElementById('active-filter-badge').classList.remove('hidden');
  document.getElementById('active-filter-badge').textContent = `Tổng: ${Object.keys(state.favorites).length} truyện`;
  document.getElementById('listing-title').textContent = '💖 Danh Sách Yêu Thích';

  const favList = Object.values(state.favorites);
  renderGalleryGrid(favList);
}

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
  document.getElementById('popular-banner').classList.add('hidden');
  document.getElementById('pagination').style.display = 'none';
  document.getElementById('active-filter-badge').classList.remove('hidden');
  document.getElementById('active-filter-badge').textContent = `Đã đọc: ${Object.keys(state.history).length} truyện`;
  document.getElementById('listing-title').textContent = '📜 Lịch Sử Đọc Truyện';

  const historyList = Object.values(state.history).sort((a, b) => b.updatedAt - a.updatedAt);
  renderGalleryGrid(historyList);
}

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

function showLoader(visible) {
  const loader = document.getElementById('listing-loader');
  if (visible) loader.classList.remove('hidden');
  else loader.classList.add('hidden');
}

function formatCount(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num;
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
