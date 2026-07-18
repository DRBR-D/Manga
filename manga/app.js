const API_BASE = 'https://nhentai.net/api/v2';
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const IMG_EXT = { j: "jpg", p: "png", g: "gif", w: "webp" };
const IMG_SERVERS = ["i1.nhentai.net", "i2.nhentai.net", "i3.nhentai.net"];
const THUMB_SERVERS = ["t1.nhentai.net", "t2.nhentai.net", "t3.nhentai.net", "t4.nhentai.net"];

class App {
    constructor() {
        this.mainContent = document.getElementById('main-content');
        this.searchOverlay = document.getElementById('searchOverlay');
        this.searchResults = document.getElementById('searchResults');
        this.searchInput = document.getElementById('searchInput');
        this.topNav = document.querySelector('.top-nav');
        
        this.init();
    }

    init() {
        this.goHome();
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                this.topNav.classList.add('scrolled');
            } else {
                this.topNav.classList.remove('scrolled');
            }
        });

        let timeout = null;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const query = e.target.value.trim();
            if (query.length > 2) {
                timeout = setTimeout(() => this.searchManga(query), 500);
            } else {
                this.searchResults.innerHTML = '';
            }
        });
    }

    async fetchAPI(endpoint, params = {}) {
        try {
            const url = new URL(`${API_BASE}/${endpoint}`);
            params['_t'] = Date.now();
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

            const PROXY_URL = "https://corsproxy.io/?";
            const finalUrl = `${PROXY_URL}${encodeURIComponent(url.toString())}`;

            const response = await fetch(finalUrl, {
                headers: { 
                    'accept': 'application/json'
                }
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return null;
        }
    }

    pickServer(servers, mediaId) {
        const hash = String(mediaId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        return servers[hash % servers.length];
    }

    imageUrl(mediaId, path) {
        const srv = this.pickServer(IMG_SERVERS, mediaId);
        return `https://${srv}/${path}`;
    }

    thumbUrl(mediaId, path) {
        const srv = this.pickServer(THUMB_SERVERS, mediaId);
        return `https://${srv}/${path}`;
    }

    coverUrl(mediaId, imgType = "j") {
        const ext = IMG_EXT[imgType] || "jpg";
        const srv = this.pickServer(THUMB_SERVERS, mediaId);
        return `https://${srv}/galleries/${mediaId}/cover.${ext}`;
    }

    galleryThumbUrl(mediaId) {
        const srv = this.pickServer(THUMB_SERVERS, mediaId);
        return `https://${srv}/galleries/${mediaId}/thumb.webp`;
    }

    showLoader() {
        this.mainContent.innerHTML = `
            <div class="global-loader">
                <div class="spinner"></div>
            </div>
        `;
    }

    renderHero(book) {
        if (!book) return '';
        const poster = this.galleryThumbUrl(book.media_id);
        const title = book.english_title || (book.title && book.title.english) || "Unknown Title";
        
        return `
            <div class="hero-banner">
                <img src="${poster}" alt="Cover" style="filter: blur(10px); transform: scale(1.1);">
                <div class="hero-overlay" style="background: linear-gradient(to top, var(--bg-base) 0%, rgba(17,10,20,0.6) 100%);">
                    <div class="hero-content" style="display:flex; gap: 20px; align-items:flex-end;">
                        <img src="${poster}" style="width: 180px; height: 250px; border-radius: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); z-index: 10;">
                        <div>
                            <h1 class="hero-title">${title}</h1>
                            <div class="hero-actions">
                                <button class="btn-primary" onclick="app.showDetail(${book.id})">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                    ĐỌC NGAY
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCarousel(title, items) {
        if (!items || items.length === 0) return '';
        
        const cards = items.map(book => `
            <div class="manga-card" onclick="app.showDetail(${book.id})">
                <div class="poster-wrapper">
                    <img src="${this.galleryThumbUrl(book.media_id)}" alt="Thumb" loading="lazy">
                    <div class="manga-badge">${book.num_pages || '?'} Pages</div>
                </div>
                <div class="manga-info">
                    <div class="manga-title">${book.english_title || "Unknown"}</div>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="section-wrapper">
                <div class="section-title">${title}</div>
                <div class="carousel-container">
                    ${cards}
                </div>
            </div>
        `;
    }
    
    renderGrid(items) {
        if (!items || items.length === 0) return '';
        const cards = items.map(book => `
            <div class="manga-card" onclick="app.showDetail(${book.id})" style="flex: auto;">
                <div class="poster-wrapper">
                    <img src="${this.galleryThumbUrl(book.media_id)}" alt="Thumb" loading="lazy">
                    <div class="manga-badge">${book.num_pages || '?'} p</div>
                </div>
                <div class="manga-info">
                    <div class="manga-title">${book.english_title || "Unknown"}</div>
                </div>
            </div>
        `).join('');
        
        return `<div class="search-grid">${cards}</div>`;
    }

    async goHome() {
        this.updateTabs(0);
        this.showLoader();
        
        const [homeData, popularData] = await Promise.all([
            this.fetchAPI('galleries', { page: 1, per_page: 25 }),
            this.fetchAPI('galleries/popular')
        ]);
        
        if (homeData && homeData.result) {
            let heroBook = popularData && popularData.length > 0 ? popularData[0] : homeData.result[0];
            
            let html = this.renderHero(heroBook);
            
            if (popularData && popularData.length > 0) {
                html += this.renderCarousel('Đang Hot 🔥', popularData.slice(1, 11));
            }
            
            html += this.renderCarousel('Mới Cập Nhật 🌟', homeData.result.slice(0, 15));
            
            this.mainContent.innerHTML = html;
        }
    }

    async showPopular() {
        this.updateTabs(1);
        this.showLoader();
        
        const popularData = await this.fetchAPI('galleries/popular');
        
        if (popularData && popularData.length > 0) {
            let html = `
                <div class="section-wrapper" style="margin-top: calc(var(--nav-height) + 20px);">
                    <div class="section-title" style="font-size: 2rem;">Phổ Biến Nhất</div>
                    <div style="padding: 0 var(--spacing-lg);">
                        ${this.renderGrid(popularData)}
                    </div>
                </div>
            `;
            this.mainContent.innerHTML = html;
        }
    }

    updateTabs(index) {
        const tabs = document.querySelectorAll('.tab-item');
        tabs.forEach((tab, i) => {
            if (i === index) tab.classList.add('active');
            else tab.classList.remove('active');
        });
        
        const dLinks = document.querySelectorAll('.desktop-menu a');
        dLinks.forEach((link, i) => {
            if (i === index) link.classList.add('active');
            else link.classList.remove('active');
        });
    }

    toggleSearch() {
        this.searchOverlay.classList.toggle('active');
        if (this.searchOverlay.classList.contains('active')) {
            setTimeout(() => this.searchInput.focus(), 100);
        } else {
            this.searchInput.value = '';
            this.searchResults.innerHTML = '';
        }
    }

    async searchManga(query) {
        this.searchResults.innerHTML = `
            <div class="global-loader" style="height: 200px;">
                <div class="spinner"></div>
            </div>
        `;
        
        const data = await this.fetchAPI('search', { query: query, page: 1, sort: 'recent' });
        
        if (data && data.result && data.result.length > 0) {
            this.searchResults.innerHTML = this.renderGrid(data.result);
        } else {
            this.searchResults.innerHTML = '<div style="text-align:center; padding: 40px; font-size: 1.2rem;">Không tìm thấy kết quả</div>';
        }
    }

    async showDetail(id) {
        if (this.searchOverlay.classList.contains('active')) {
            this.toggleSearch();
        }

        let detailView = document.getElementById('detailView');
        if (!detailView) {
            detailView = document.createElement('div');
            detailView.id = 'detailView';
            detailView.className = 'detail-view';
            document.getElementById('app').appendChild(detailView);
        }
        
        detailView.innerHTML = `
            <div class="global-loader" style="height: 100vh;">
                <div class="spinner"></div>
            </div>
        `;
        
        void detailView.offsetWidth;
        detailView.classList.add('active');
        
        const book = await this.fetchAPI(`galleries/${id}`);
        if (!book) {
            this.closeDetail();
            return;
        }

        window.currentBook = book;
        const title = book.title.pretty || book.title.english;
        const cover = this.coverUrl(book.media_id, book.cover ? book.cover.t : 'j');
        
        const tagsHtml = (book.tags || []).map(t => {
            const highlight = t.type === 'language' && t.name === 'english' ? 'highlight' : '';
            return `<span class="d-tag ${highlight}">${t.name}</span>`;
        }).join('');
        
        detailView.innerHTML = `
            <div class="detail-header-fixed">
                <div class="back-btn" onclick="app.closeDetail()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </div>
            </div>
            
            <div class="detail-content-wrapper">
                <div class="detail-cover">
                    <img src="${cover}" alt="Cover">
                </div>
                <div class="detail-info">
                    <h1 class="detail-main-title">${title}</h1>
                    <div style="color: var(--text-secondary); margin-bottom: 20px;">
                        #${book.id} • ${book.num_pages} Pages • ❤️ ${book.num_favorites}
                    </div>
                    <div class="detail-tags">
                        ${tagsHtml}
                    </div>
                    
                    <button class="btn-primary" onclick="app.startReading()" style="width: 100%; max-width: 300px; justify-content: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        ĐỌC TRUYỆN
                    </button>
                </div>
            </div>
        `;
    }

    closeDetail() {
        const detailView = document.getElementById('detailView');
        if (detailView) {
            detailView.classList.remove('active');
            setTimeout(() => detailView.remove(), 500); 
        }
    }

    startReading() {
        const book = window.currentBook;
        if (!book || !book.pages) return;

        let readerOverlay = document.getElementById('readerOverlay');
        if (!readerOverlay) {
            readerOverlay = document.createElement('div');
            readerOverlay.id = 'readerOverlay';
            readerOverlay.className = 'reader-overlay';
            document.getElementById('app').appendChild(readerOverlay);
        }
        
        let imagesHtml = '';
        book.pages.forEach(p => {
            const url = this.imageUrl(book.media_id, p.path);
            imagesHtml += `<img src="${url}" loading="lazy" style="width:100%; max-width:800px; margin-bottom:4px;">`;
        });
        
        readerOverlay.innerHTML = `
            <div class="detail-header-fixed" style="background: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent);">
                <div class="back-btn" onclick="app.closeReader()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </div>
                <div style="color: white; font-weight: 600; font-size: 1.1rem; margin-right: auto; margin-left: 20px; align-self: center;">
                    ${book.title.pretty || ''}
                </div>
            </div>
            <div class="reader-content" style="padding-top: var(--nav-height);">
                ${imagesHtml}
            </div>
        `;
        
        void readerOverlay.offsetWidth;
        readerOverlay.classList.add('active');
    }
    
    closeReader() {
        const readerOverlay = document.getElementById('readerOverlay');
        if (readerOverlay) {
            readerOverlay.classList.remove('active');
            setTimeout(() => readerOverlay.remove(), 400);
        }
    }
}

const app = new App();
