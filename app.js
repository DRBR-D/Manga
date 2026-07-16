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

// === API HELPERS ===
function pickServer(servers, mediaId) {
    const hash = String(mediaId).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return servers[hash % servers.length];
}

function getThumbUrl(mediaId, path) {
    const srv = pickServer(THUMB_SERVERS, mediaId);
    return `https://${srv}/${path}`;
}

function getCoverUrl(mediaId, imgType = "j") {
    const ext = IMG_EXT[imgType] || "jpg";
    const srv = pickServer(THUMB_SERVERS, mediaId);
    return `https://${srv}/galleries/${mediaId}/cover.${ext}`;
}

function getImageUrl(mediaId, path) {
    const srv = pickServer(IMG_SERVERS, mediaId);
    return `https://${srv}/${path}`;
}

async function fetchAPI(endpoint, params = {}) {
    try {
        const url = new URL(`${API_BASE}/${endpoint}`);
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
    
    const thumbUrl = manga.thumbnail.startsWith("http") ? manga.thumbnail : getThumbUrl(manga.media_id, manga.thumbnail);
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
    
    // For slide, we try to use cover instead of thumb for better res
    const coverUrl = getCoverUrl(manga.media_id, "j");
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

// === MODAL & READER ===
async function openDetail(id) {
    detailModal.classList.add("active");
    detailHeader.innerHTML = `<div class="loader"></div>`;
    detailInfo.innerHTML = "";
    startReadBtn.style.display = "none";
    
    try {
        currentBook = await fetchAPI(`galleries/${id}`);
        const coverUrl = getThumbUrl(currentBook.media_id, currentBook.cover.path);
        const title = currentBook.title.pretty || currentBook.title.english;
        const tagsHtml = currentBook.tags.slice(0, 8).map(t => `<span class="tag">${t.name}</span>`).join('');
            
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
});

startReadBtn.addEventListener("click", () => {
    if (!currentBook) return;
    detailModal.classList.remove("active");
    readerView.classList.remove("hidden");
    readerContent.innerHTML = "";
    
    currentBook.pages.forEach((page, idx) => {
        const imgUrl = getImageUrl(currentBook.media_id, page.path);
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

// Run
initApp();
