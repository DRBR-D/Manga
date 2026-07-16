/**
 * NOKAI HAVA - Manga Reader App Logic
 */

const API_BASE = "https://nhentai.net/api/v2";
const USE_PROXY = true; // Bật true để vượt lỗi CORS trên GitHub Pages
const PROXY_URL = "https://corsproxy.io/?";

const THUMB_SERVERS = ["t1.nhentai.net", "t2.nhentai.net", "t3.nhentai.net", "t4.nhentai.net"];
const IMG_SERVERS = ["i1.nhentai.net", "i2.nhentai.net", "i3.nhentai.net"];
const IMG_EXT = { j: "jpg", p: "png", g: "gif", w: "webp" };

// Elements
const bannerSlider = document.getElementById("banner-slider");
const rankingGrid = document.getElementById("ranking-grid");
const newComicsGrid = document.getElementById("new-comics-grid");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageInfo = document.getElementById("page-info");

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

const mainContent = document.getElementById("main-content");
const searchView = document.getElementById("search-view");
const searchGrid = document.getElementById("search-grid");
const searchTitle = document.getElementById("search-title");

// Reader elements
const detailModal = document.getElementById("detail-modal");
const closeDetailBtn = document.getElementById("close-detail");
const detailHeader = document.getElementById("detail-header");
const detailInfo = document.getElementById("detail-info");
const startReadBtn = document.getElementById("start-read-btn");

const readerView = document.getElementById("reader-view");
const backToDetailBtn = document.getElementById("back-to-detail");
const readerContent = document.getElementById("reader-content");
const readerProgress = document.getElementById("reader-progress");

let currentBook = null;
let currentSlide = 0;
let currentNewPage = 1;

function pickServer(servers, mediaId) {
    const hash = String(mediaId).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return servers[hash % servers.length];
}

function getThumbUrl(manga) {
    if (manga.thumbnail && typeof manga.thumbnail === 'string') {
        if (manga.thumbnail.startsWith("http")) return manga.thumbnail;
        return `https://${pickServer(THUMB_SERVERS, manga.media_id)}/${manga.thumbnail}`;
    }
    if (manga.images && manga.images.thumbnail) {
        const ext = IMG_EXT[manga.images.thumbnail.t] || 'jpg';
        return `https://${pickServer(THUMB_SERVERS, manga.media_id)}/galleries/${manga.media_id}/thumb.${ext}`;
    }
    return `https://${pickServer(THUMB_SERVERS, manga.media_id)}/galleries/${manga.media_id}/thumb.webp`;
}

function getCoverUrl(manga) {
    if (manga.cover && manga.cover.path) {
        return `https://${pickServer(THUMB_SERVERS, manga.media_id)}/${manga.cover.path}`;
    }
    if (manga.images && manga.images.cover) {
        const ext = IMG_EXT[manga.images.cover.t] || 'jpg';
        return `https://${pickServer(THUMB_SERVERS, manga.media_id)}/galleries/${manga.media_id}/cover.${ext}`;
    }
    return `https://${pickServer(THUMB_SERVERS, manga.media_id)}/galleries/${manga.media_id}/cover.jpg`;
}

function getPageUrl(manga, page, idx) {
    if (page.path) {
        return `https://${pickServer(IMG_SERVERS, manga.media_id)}/${page.path}`;
    }
    const ext = IMG_EXT[page.t] || 'jpg';
    return `https://${pickServer(IMG_SERVERS, manga.media_id)}/galleries/${manga.media_id}/${idx + 1}.${ext}`;
}

async function fetchAPI(endpoint, params = {}) {
    try {
        const url = new URL(`${API_BASE}/${endpoint}`);
        // Chèn thêm time để chống cache (bảo đảm luôn lấy truyện mới nhất)
        params['_t'] = Date.now();
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const finalUrl = USE_PROXY ? `${PROXY_URL}${encodeURIComponent(url.toString())}` : url.toString();
        
        const res = await fetch(finalUrl, { headers: { "Accept": "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// === UI RENDERERS ===

function createComicCard(manga) {
    const card = document.createElement("div");
    card.className = "comic-card";
    
    const thumbUrl = getThumbUrl(manga);
    const title = manga.english_title || manga.title?.pretty || "Unknown";
    const isNew = Date.now()/1000 - manga.upload_date < 86400 * 3 ? '<div class="card-badge">HOT</div>' : '';
    
    card.innerHTML = `
        <div class="card-image">
            ${isNew}
            <img src="${thumbUrl}" alt="Cover" loading="lazy">
        </div>
        <div class="card-info">
            <div class="card-title">${title}</div>
            <div class="card-meta">
                <span><i class="fas fa-heart"></i> ${manga.num_favorites || 0}</span>
                <span><i class="fas fa-file-alt"></i> ${manga.num_pages || 0}</span>
            </div>
        </div>
    `;
    card.addEventListener("click", () => openDetail(manga.id));
    return card;
}

function createSlide(manga) {
    const slide = document.createElement("div");
    slide.className = "slide";
    
    const coverUrl = getCoverUrl(manga);
    const title = manga.title?.pretty || manga.title?.english || "Unknown";
    
    slide.innerHTML = `
        <img src="${coverUrl}" alt="Banner">
        <div class="slide-info">
            <h2 class="slide-title">${title}</h2>
            <button class="classic-btn primary-btn"><i class="fas fa-book-open"></i> ĐỌC NGAY</button>
        </div>
    `;
    slide.addEventListener("click", () => openDetail(manga.id));
    return slide;
}

// === INITIALIZATION ===
async function initApp() {
    try {
        // Load Popular for Ranking & Slider
        const popular = await fetchAPI("galleries/popular");
        if (popular && popular.length > 0) {
            // Slider (Top 3)
            bannerSlider.innerHTML = "";
            for(let i=0; i<Math.min(3, popular.length); i++) {
                // Fetch full book for cover (popular only has thumb usually, but we need full book for `title.pretty` and `cover`)
                const book = await fetchAPI(`galleries/${popular[i].id}`);
                bannerSlider.appendChild(createSlide(book));
            }
            setInterval(() => moveSlide(1), 5000); // Auto slide
            
            // Ranking (Top 10)
            rankingGrid.innerHTML = "";
            popular.slice(0, 10).forEach(m => rankingGrid.appendChild(createComicCard(m)));
        }

        // Load New Page 1
        await loadNewComics(1);
        
    } catch (err) {
        console.error("Init failed", err);
    }
}

async function loadNewComics(page) {
    try {
        newComicsGrid.innerHTML = '<div class="loader" style="grid-column: 1/-1;"></div>';
        const newest = await fetchAPI("galleries", { page: page, per_page: 25 });
        
        if (newest && newest.result) {
            newComicsGrid.innerHTML = "";
            newest.result.forEach(m => newComicsGrid.appendChild(createComicCard(m)));
            
            currentNewPage = page;
            pageInfo.textContent = `Trang ${page}`;
            prevPageBtn.disabled = page <= 1;
            
            // Cuộn mượt mà lên đầu phần mới cập nhật
            const section = newComicsGrid.parentElement;
            if(page > 1) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    } catch (err) {
        newComicsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gold);">Lỗi tải dữ liệu.</p>';
        console.error(err);
    }
}

prevPageBtn.addEventListener("click", () => {
    if (currentNewPage > 1) loadNewComics(currentNewPage - 1);
});

nextPageBtn.addEventListener("click", () => {
    loadNewComics(currentNewPage + 1);
});

// === INTERACTIVE LOGIC ===

window.moveSlide = function(direction) {
    const slides = bannerSlider.children;
    if(slides.length === 0) return;
    currentSlide = (currentSlide + direction + slides.length) % slides.length;
    bannerSlider.style.transform = `translateX(-${currentSlide * 100}%)`;
}

window.moveCarousel = function(direction, id) {
    const carousel = document.getElementById(id);
    const scrollAmount = carousel.clientWidth * 0.8;
    carousel.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

// Search
async function performSearch(query) {
    if (!query) return;
    mainContent.style.display = "none";
    searchView.style.display = "block";
    searchGrid.innerHTML = `<div class="loader"></div>`;
    searchTitle.textContent = `KẾT QUẢ CHO: "${query}"`;
    
    try {
        // Tìm bằng ID (nếu query chỉ chứa số)
        if (/^\d+$/.test(query)) {
            try {
                const book = await fetchAPI(`galleries/${query}`);
                searchGrid.innerHTML = "";
                searchGrid.appendChild(createComicCard(book));
                return;
            } catch(e) {
                // Nếu không có ID nào, tiếp tục search thường
            }
        }
        
        const res = await fetchAPI("search", { query, page: 1 });
        searchGrid.innerHTML = "";
        if (res.result && res.result.length > 0) {
            res.result.forEach(m => searchGrid.appendChild(createComicCard(m)));
        } else {
            searchGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Không tìm thấy truyện.</p>`;
        }
    } catch (e) {
        searchGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--primary-color);">Lỗi tìm kiếm.</p>`;
    }
}

searchBtn.addEventListener("click", () => performSearch(searchInput.value.trim()));
searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch(searchInput.value.trim());
});

window.closeSearch = function() {
    searchView.style.display = "none";
    mainContent.style.display = "block";
    searchInput.value = "";
}

// Random button click
document.getElementById('random-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const random = await fetchAPI("galleries/random");
        openDetail(random.id);
    } catch(err) {
        console.error(err);
    }
});

window.performSearchTag = async function(tagId, tagName) {
    // Đóng cửa sổ chi tiết truyện
    detailModal.classList.remove("active");
    document.body.classList.remove("modal-open");
    
    // Tự động điền tên thẻ vào ô tìm kiếm và thực hiện tìm kiếm luôn
    searchInput.value = tagName;
    
    // Lướt nhẹ lên đầu trang để tiện xem kết quả
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Gọi hàm tìm kiếm chung
    performSearch(tagName);
}

// === MODAL & READER ===
async function openDetail(id) {
    document.body.classList.add("modal-open");
    detailModal.classList.add("active");
    detailHeader.innerHTML = `<div class="loader"></div>`;
    detailInfo.innerHTML = "";
    startReadBtn.style.display = "none";
    
    try {
        currentBook = await fetchAPI(`galleries/${id}`);
        const coverUrl = getCoverUrl(currentBook);
        const title = currentBook.title?.pretty || currentBook.title?.english || "Unknown";
        const tagsList = currentBook.tags || [];
        const tagsHtml = tagsList.slice(0, 12).map(t => `<span class="tag" onclick="performSearchTag(${t.id}, '${t.name.replace(/'/g, "\\'")}')" style="cursor: pointer;">${t.name}</span>`).join('');
            
        detailHeader.innerHTML = `
            <img src="${coverUrl}" alt="Cover">
            <div class="detail-title">
                <h2>${title}</h2>
                <div class="tags">${tagsHtml}</div>
            </div>
        `;
        
        detailInfo.innerHTML = `
            <div style="color: var(--text-muted); margin: 15px 0;">
                <p><strong><i class="fas fa-hashtag"></i> ID:</strong> ${currentBook.id}</p>
                <p><strong><i class="fas fa-layer-group"></i> Số trang:</strong> ${currentBook.num_pages}</p>
                <p><strong><i class="fas fa-heart"></i> Yêu thích:</strong> ${currentBook.num_favorites}</p>
            </div>
        `;
        startReadBtn.style.display = "flex";
    } catch (e) {
        detailHeader.innerHTML = `<p>Lỗi tải thông tin.</p>`;
    }
}

closeDetailBtn.addEventListener("click", () => {
    detailModal.classList.remove("active");
    document.body.classList.remove("modal-open");
});

startReadBtn.addEventListener("click", () => {
    if (!currentBook) return;
    detailModal.classList.remove("active");
    readerView.classList.remove("hidden");
    readerContent.innerHTML = "";
    
    const pages = currentBook.pages || (currentBook.images ? currentBook.images.pages : []);
    
    pages.forEach((page, idx) => {
        const imgUrl = getPageUrl(currentBook, page, idx);
        const img = document.createElement("img");
        img.className = "reader-page";
        if(idx < 3) img.src = imgUrl; // Load first 3 immediately
        else {
            img.dataset.src = imgUrl;
            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1.4'%3E%3C/svg%3E";
            imgObserver.observe(img);
        }
        readerContent.appendChild(img);
    });
    readerContent.scrollTop = 0;
    updateProgress();
});

backToDetailBtn.addEventListener("click", () => {
    readerView.classList.add("hidden");
    detailModal.classList.add("active");
    document.body.classList.add("modal-open");
});

const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            const img = e.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imgObserver.unobserve(img);
            }
        }
    });
}, { rootMargin: '500px 0px' });

readerContent.addEventListener("scroll", updateProgress);

function updateProgress() {
    if(!currentBook) return;
    const pages = readerContent.querySelectorAll(".reader-page");
    let currentIdx = 0;
    for (let i = 0; i < pages.length; i++) {
        if (pages[i].getBoundingClientRect().top <= window.innerHeight / 2) currentIdx = i;
        else break;
    }
    readerProgress.textContent = `${currentIdx + 1} / ${currentBook.num_pages}`;
}

// === PULL TO REFRESH & SMART HEADER ===
const mainHeader = document.querySelector(".main-header");
const ptrIndicator = document.getElementById("ptr-indicator");
let lastScrollY = window.scrollY;

// Hiện header khi ở top, ẩn khi cuộn xuống
window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;
    
    // Nếu không phải đang trong chế độ đọc truyện thì mới xử lý header
    if (readerView.classList.contains("hidden")) {
        if (currentScrollY > 60) {
            mainHeader.classList.add("hide-header");
        } else if (currentScrollY <= 0) {
            mainHeader.classList.remove("hide-header");
        }
    }
    lastScrollY = currentScrollY;
});

// Vuốt xuống tải lại (Pull-to-refresh)
let touchStartY = 0;
let touchCurrentY = 0;
let isPulling = false;

window.addEventListener("touchstart", (e) => {
    // Chỉ kích hoạt pull to refresh khi ở trang chủ và scroll trên cùng
    if (window.scrollY <= 0 && readerView.classList.contains("hidden")) {
        touchStartY = e.touches[0].clientY;
        isPulling = true;
    } else {
        isPulling = false;
    }
}, { passive: true });

window.addEventListener("touchmove", (e) => {
    if (!isPulling) return;
    touchCurrentY = e.touches[0].clientY;
    const pullDistance = touchCurrentY - touchStartY;
    
    if (pullDistance > 10 && pullDistance < 120) {
        ptrIndicator.style.transform = `translateY(${pullDistance - 60}px)`;
        ptrIndicator.innerHTML = `<i class="fas fa-arrow-down"></i> Kéo tiếp để tải lại...`;
    } else if (pullDistance >= 120) {
        ptrIndicator.style.transform = `translateY(0)`;
        ptrIndicator.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i> Buông ra để tải lại!`;
    }
}, { passive: true });

window.addEventListener("touchend", () => {
    if (!isPulling) return;
    const pullDistance = touchCurrentY - touchStartY;
    
    if (pullDistance >= 120) {
        ptrIndicator.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang tải...`;
        setTimeout(() => location.reload(), 300);
    } else {
        ptrIndicator.style.transform = `translateY(-100%)`;
    }
    isPulling = false;
});

// Run
initApp();
