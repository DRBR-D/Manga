/**
 * nHentai Web Reader — Pure Root Web Application
 * Flat Directory Structure (All files in root - No subfolders needed)
 */

const IMG_SERVERS = ["i1.nhentai.net", "i2.nhentai.net", "i3.nhentai.net"];
const THUMB_SERVERS = ["t1.nhentai.net", "t2.nhentai.net", "t3.nhentai.net", "t4.nhentai.net"];
const IMG_EXT_MAP = { j: "jpg", p: "png", g: "gif", w: "webp" };

// Global Application State
const state = {
  activeView: 'listing',
  listingType: 'home',
  query: '',
  tagId: null,
  tagName: '',
  sort: 'recent',
  page: 1,
  maxPages: 1,
  currentBook: null,
  customWorker: localStorage.getItem('nh_custom_worker') || '',
  reader: {
    book: null,
    pageIndex: 0,
    mode: 'single',
    fitMode: 'fit-height'
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
 * Universal API Fetcher with Auto Failover & Custom Worker Support
 */
async function fetchApi(endpoint, params = {}) {
  const cleanParams = { ...params };
  if (cleanParams.sort === 'recent') delete cleanParams.sort;

  const queryString = new URLSearchParams(cleanParams).toString();
  const directTarget = `https://nhentai.net/api/v2/${endpoint}${queryString ? '?' + queryString : ''}`;

  const candidates = [];

  // Priority 1: Custom Cloudflare Worker Proxy URL if set by user
  if (state.customWorker) {
    const cleanWorker = state.customWorker.replace(/\/+$/, '');
    candidates.push(`${cleanWorker}/${endpoint}${queryString ? '?' + queryString : ''}`);
  }

  // Priority 2: Direct API fetch
  candidates.push(directTarget);

  // Priority 3: Fallback CORS Proxies
  candidates.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(directTarget)}`);
  candidates.push(`https://corsproxy.io/?${encodeURIComponent(directTarget)}`);
  candidates.push(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directTarget)}`);

  let lastErr = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) continue;
        const text = await res.text();
        if (text.trim().startsWith('<')) continue;
        const data = JSON.parse(text);
        if (data && !data.error) return data;
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(lastErr ? lastErr.message : 'Trình duyệt bị chặn CORS hoặc không thể kết nối nHentai API.');
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateFavBadge();
  loadHomepage();
});

function setupEventListeners() {
  document.getElementById('brand-logo')?.addEventListener('click', () => {
    state.listingType = 'home';
    state.query = '';
    state.tagId = null;
    state.page = 1;
    loadHomepage();
  });

  document.getElementById('search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('search-input');
    const query = input ? input.value.trim() : '';
    if (!query) return;
    state.listingType = 'search';
    state.query = query;
    state.tagId = null;
    const sortSel = document.getElementById('sort-select');
    state.sort = sortSel ? sortSel.value : 'recent';
    state.page = 1;
    loadListing();
  });

  document.getElementById('jump-id-btn')?.addEventListener('click', jumpToId);
  document.getElementById('jump-id-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') jumpToId();
  });

  // Navigation Buttons
  setupNavBtn('nav-home', 'home', loadHomepage);
  setupNavBtn('nav-popular', 'popular', loadPopularSectionOnly);
  setupNavBtn('nav-random-top', null, fetchRandomBook);
  setupNavBtn('nav-favs', 'favs', renderFavsView);
  setupNavBtn('nav-history', 'history', renderHistoryView);

  // Pagination
  document.getElementById('pg-prev')?.addEventListener('click', () => changePage(state.page - 1));
  document.getElementById('pg-next')?.addEventListener('click', () => changePage(state.page + 1));
  document.getElementById('pg-input')?.addEventListener('change', (e) => {
    let p = parseInt(e.target.value, 10);
    if (isNaN(p)) return;
    p = Math.max(1, Math.min(p, state.maxPages));
    changePage(p);
  });

  // Details & Reader Actions
  document.getElementById('details-back-btn')?.addEventListener('click', () => switchView('listing'));
  document.getElementById('btn-start-reading')?.addEventListener('click', () => { if (state.currentBook) openReader(state.currentBook, 0); });
  document.getElementById('btn-toggle-fav')?.addEventListener('click', () => { if (state.currentBook) toggleFavorite(state.currentBook); });
  document.getElementById('reader-close-btn')?.addEventListener('click', closeReader);

  document.getElementById('reader-mode-select')?.addEventListener('change', (e) => {
    state.reader.mode = e.target.value;
    renderReaderStage();
  });

  document.getElementById('btn-prev-page')?.addEventListener('click', () => stepReaderPage(-1));
  document.getElementById('btn-next-page')?.addEventListener('click', () => stepReaderPage(1));
  document.getElementById('zone-prev')?.addEventListener('click', () => stepReaderPage(-1));
  document.getElementById('zone-next')?.addEventListener('click', () => stepReaderPage(1));

  document.addEventListener('keydown', handleGlobalKeyDown);
}

function setupNavBtn(id, listingType, callback) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => {
    if (listingType) {
      state.listingType = listingType;
      state.page = 1;
    }
    callback();
  });
}

function switchView(viewName) {
  state.activeView = viewName;
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) activeSec.classList.add('active');
}

// Data Loading: Homepage
async function loadHomepage() {
  switchView('listing');
  const popBanner = document.getElementById('popular-banner');
  if (popBanner) popBanner.classList.remove('hidden');

  const titleEl = document.getElementById('listing-title');
  if (titleEl) titleEl.textContent = '📖 Galleries Mới Nhất';

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
    renderErrorCard(err.message);
  } finally {
    showLoader(false);
  }
}

async function loadPopularSectionOnly() {
  switchView('listing');
  const popBanner = document.getElementById('popular-banner');
  if (popBanner) popBanner.classList.add('hidden');

  const titleEl = document.getElementById('listing-title');
  if (titleEl) titleEl.textContent = '🔥 Galleries Phổ Biến';

  showLoader(true);
  try {
    const popularData = await fetchApi('galleries/popular');
    renderGalleryGrid(popularData || []);
    const pg = document.getElementById('pagination');
    if (pg) pg.style.display = 'none';
  } catch (err) {
    renderErrorCard(err.message);
  } finally {
    showLoader(false);
  }
}

async function loadListing() {
  switchView('listing');
  const popBanner = document.getElementById('popular-banner');
  if (popBanner) popBanner.classList.add('hidden');

  const pg = document.getElementById('pagination');
  if (pg) pg.style.display = 'flex';

  showLoader(true);
  try {
    let data;
    if (state.listingType === 'search') {
      const titleEl = document.getElementById('listing-title');
      if (titleEl) titleEl.textContent = `🔍 Từ khóa: "${state.query}"`;
      data = await fetchApi('search', {
        query: state.query,
        page: state.page,
        sort: state.sort
      });
    } else if (state.listingType === 'tag') {
      const titleEl = document.getElementById('listing-title');
      if (titleEl) titleEl.textContent = `🏷️ Tag: ${state.tagName || ('ID ' + state.tagId)}`;
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
    renderErrorCard(err.message);
  } finally {
    showLoader(false);
  }
}

async function jumpToId() {
  const input = document.getElementById('jump-id-input');
  if (!input) return;
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
  if (!grid) return;
  grid.innerHTML = '';

  if (!galleries || galleries.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--ios-text-sub);">Không tìm thấy gallery nào.</p>';
    return;
  }

  galleries.forEach(item => {
    const card = createGalleryCard(item);
    grid.appendChild(card);
  });
}

function renderPopularBanner(popularGalleries) {
  const bannerGrid = document.getElementById('popular-grid');
  if (!bannerGrid) return;
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
      <img src="${thumbUrl}" alt="${titleText}" class="card-thumb-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='https://via.placeholder.com/250x350/1c1c1e/ffffff?text=No+Cover'">
      <span class="card-pages-badge">${item.num_pages}P</span>
      <button class="card-fav-btn ${isFav ? 'active' : ''}" title="Yêu thích">♥</button>
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
  if (favBtn) {
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(item, favBtn);
    });
  }

  return card;
}

function renderErrorCard(errMsg) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; background: #1c1c1e; border-radius: 16px; padding: 32px 20px; text-align: center; max-width: 600px; margin: 20px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
      <h3 style="color: #ff453a; margin-bottom: 12px; font-size: 1.2rem;">⚠️ Trình Duyệt Bị Chặn CORS API nHentai</h3>
      <p style="color: #8e8e93; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5;">
        Server nHentai chặn truy cập API từ domain web (CORS Error). 
      </p>

      <div style="background: #2c2c2e; padding: 16px; border-radius: 12px; text-align: left; margin-bottom: 20px; font-size: 0.85rem; color: #d1d1d6;">
        <div style="font-weight: 600; color: #0a84ff; margin-bottom: 8px;">💡 Cách xử lý cực dễ (Tạo Worker riêng 1 phút):</div>
        1. Vào <code>dash.cloudflare.com</code> ➔ <b>Workers & Pages</b> ➔ <b>Create Worker</b>.<br>
        2. Dán đoạn mã proxy 10 dòng ➔ <b>Save and Deploy</b>.<br>
        3. Nhập link Worker của bạn bên dưới:
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 20px;">
        <input type="text" id="custom-worker-input" value="${state.customWorker}" placeholder="https://my-proxy.username.workers.dev" style="flex: 1; background: #2c2c2e; border: 1px solid #3a3a3c; color: #fff; padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; outline: none;">
        <button id="btn-save-worker" class="btn btn-primary" style="padding: 10px 18px; border-radius: 10px; background: #30d158; border: none;">Lưu Worker</button>
      </div>

      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px;">
        <button id="btn-retry-fetch" class="btn btn-primary" style="padding: 10px 20px; border-radius: 10px;">🔄 Thử lại ngay</button>
      </div>

      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px; font-size: 0.85rem; color: #8e8e93;">
        💡 <strong>Mẹo khác:</strong> Bạn có thể nhập trực tiếp ID truyện vào ô tìm kiếm ID (vd: <code>660253</code>) ở thanh trên cùng để đọc mượt mà không cần tải trang chủ.
      </div>
    </div>
  `;

  const saveWorkerBtn = document.getElementById('btn-save-worker');
  if (saveWorkerBtn) {
    saveWorkerBtn.addEventListener('click', () => {
      const input = document.getElementById('custom-worker-input');
      if (input) {
        state.customWorker = input.value.trim();
        localStorage.setItem('nh_custom_worker', state.customWorker);
        showToast('Đã lưu Worker URL thành công!');
        if (state.listingType === 'home') loadHomepage();
        else loadListing();
      }
    });
  }

  const retryBtn = document.getElementById('btn-retry-fetch');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      if (state.listingType === 'home') loadHomepage();
      else loadListing();
    });
  }
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

  const coverImg = document.getElementById('details-cover');
  if (coverImg) coverImg.src = coverUrl;

  const tPretty = document.getElementById('details-title-pretty');
  if (tPretty) tPretty.textContent = book.title?.pretty || book.title?.english || `Gallery #${book.id}`;

  const tEng = document.getElementById('details-title-english');
  if (tEng) tEng.textContent = book.title?.english || '';

  const tJap = document.getElementById('details-title-japanese');
  if (tJap) tJap.textContent = book.title?.japanese || '';

  const dPages = document.getElementById('details-pages-count');
  if (dPages) dPages.textContent = book.num_pages;

  const dFavs = document.getElementById('details-favs-count');
  if (dFavs) dFavs.textContent = book.num_favorites;

  const dId = document.getElementById('details-id');
  if (dId) dId.textContent = book.id;

  const dDate = document.getElementById('details-upload-date');
  if (dDate) dDate.textContent = book.upload_date ? new Date(book.upload_date * 1000).toLocaleDateString('vi-VN') : 'N/A';

  const isFav = !!state.favorites[book.id];
  const favBtn = document.getElementById('btn-toggle-fav');
  if (favBtn) {
    favBtn.textContent = isFav ? '💔 Bỏ Yêu Thích' : '💖 Thêm Vào Yêu Thích';
  }

  renderDetailsTags(book.tags || []);
  renderDetailsThumbnails(book);
}

function renderDetailsTags(tags) {
  const container = document.getElementById('details-tags-list');
  if (!container) return;
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
  if (!grid) return;
  grid.innerHTML = '';

  const tCount = document.getElementById('thumb-count');
  if (tCount) tCount.textContent = book.pages ? book.pages.length : 0;

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

    card.addEventListener('click', () => openReader(book, idx));
    grid.appendChild(card);
  });
}

function renderRelatedSection(relatedList) {
  const grid = document.getElementById('related-grid');
  if (!grid) return;
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

  const titleEl = document.getElementById('reader-book-title');
  if (titleEl) titleEl.textContent = book.title?.pretty || book.title?.english || `Gallery #${book.id}`;

  const totalEl = document.getElementById('reader-total-pages');
  if (totalEl) totalEl.textContent = book.pages.length;

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
    if (singleContainer) singleContainer.classList.remove('hidden');
    if (continuousContainer) continuousContainer.classList.add('hidden');
    const pNav = document.getElementById('reader-page-nav');
    if (pNav) pNav.classList.remove('hidden');
    updateSinglePage();
  } else {
    if (singleContainer) singleContainer.classList.add('hidden');
    if (continuousContainer) continuousContainer.classList.remove('hidden');
    const pNav = document.getElementById('reader-page-nav');
    if (pNav) pNav.classList.add('hidden');
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

  if (loaderEl) loaderEl.classList.remove('hidden');
  if (imgEl) {
    imgEl.style.opacity = '0.3';
    imgEl.onload = () => {
      if (loaderEl) loaderEl.classList.add('hidden');
      imgEl.style.opacity = '1';
    };
    imgEl.onerror = () => {
      if (loaderEl) loaderEl.classList.add('hidden');
      imgEl.style.opacity = '1';
      showToast(`Không thể tải trang ${idx + 1}. Thử lại...`);
    };
    imgEl.src = imgUrl;
  }

  updateReaderFitClass();

  const pInput = document.getElementById('reader-page-input');
  if (pInput) pInput.value = idx + 1;

  preloadNextPages(idx + 1, 2);
  saveHistory(book, idx + 1);
}

function updateReaderFitClass() {
  const imgEl = document.getElementById('reader-current-img');
  if (imgEl) imgEl.className = `reader-main-img ${state.reader.fitMode}`;
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
  if (!container) return;
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
    }
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

  if (btnEl) btnEl.classList.toggle('active', !isFav);

  if (state.currentBook && state.currentBook.id === id) {
    const detailFavBtn = document.getElementById('btn-toggle-fav');
    if (detailFavBtn) {
      detailFavBtn.textContent = !isFav ? '💔 Bỏ Yêu Thích' : '💖 Thêm Vào Yêu Thích';
    }
  }
}

function updateFavBadge() {
  const count = Object.keys(state.favorites).length;
  const badge = document.getElementById('fav-count-badge');
  if (badge) badge.textContent = count;
}

function renderFavsView() {
  switchView('listing');
  const popBanner = document.getElementById('popular-banner');
  if (popBanner) popBanner.classList.add('hidden');

  const titleEl = document.getElementById('listing-title');
  if (titleEl) titleEl.textContent = '💖 Danh Sách Yêu Thích';

  const pg = document.getElementById('pagination');
  if (pg) pg.style.display = 'none';

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
  const popBanner = document.getElementById('popular-banner');
  if (popBanner) popBanner.classList.remove('hidden');

  const titleEl = document.getElementById('listing-title');
  if (titleEl) titleEl.textContent = '📜 Lịch Sử Đọc Truyện';

  const pg = document.getElementById('pagination');
  if (pg) pg.style.display = 'none';

  const historyList = Object.values(state.history).sort((a, b) => b.updatedAt - a.updatedAt);
  renderGalleryGrid(historyList);
}

function changePage(newPage) {
  state.page = newPage;
  if (state.listingType === 'home') loadHomepage();
  else loadListing();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updatePaginationUI() {
  const pgInput = document.getElementById('pg-input');
  if (pgInput) pgInput.value = state.page;

  const pgMax = document.getElementById('pg-max');
  if (pgMax) pgMax.textContent = state.maxPages;
}

function showLoader(visible) {
  const loader = document.getElementById('listing-loader');
  if (loader) {
    if (visible) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
  }
}

function formatCount(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num;
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
