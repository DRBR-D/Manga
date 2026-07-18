const API_BASE = 'https://vsmov.com/api';
const IMG_PREFIX = 'https://vsmov.com/uploads/';

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
        
        // Scroll effect for Top Nav
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                this.topNav.classList.add('scrolled');
            } else {
                this.topNav.classList.remove('scrolled');
            }
        });

        // Search Input Debounce
        let timeout = null;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const query = e.target.value.trim();
            if (query.length > 2) {
                timeout = setTimeout(() => this.searchMovie(query), 500);
            } else {
                this.searchResults.innerHTML = '';
            }
        });
    }

    async fetchAPI(endpoint) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`);
            if (!res.ok) throw new Error('Network response was not ok');
            return await res.json();
        } catch (error) {
            console.error('API Error:', error);
            return null;
        }
    }

    getImage(url) {
        if (!url) return '';
        return url.startsWith('http') ? url : IMG_PREFIX + url;
    }

    showLoader() {
        this.mainContent.innerHTML = `
            <div class="global-loader">
                <div class="spinner"></div>
            </div>
        `;
    }

    renderHero(movie) {
        if (!movie) return '';
        const poster = this.getImage(movie.poster_url || movie.thumb_url);
        
        return `
            <div class="hero-banner">
                <img src="${poster}" alt="Hero Banner">
                <div class="hero-overlay">
                    <div class="hero-content">
                        <div class="hero-meta">
                            <span class="hero-badge">${movie.quality || 'FHD'}</span>
                            <span class="hero-badge">${movie.lang || 'Vietsub'}</span>
                            <span>${movie.year || '2025'}</span>
                        </div>
                        <h1 class="hero-title">${movie.name}</h1>
                        <p style="color: var(--text-secondary); max-width: 600px; margin-bottom: 20px;">
                            ${movie.origin_name}
                        </p>
                        <div class="hero-actions">
                            <button class="btn-primary" onclick="app.showDetail('${movie.slug}')">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                                XEM NGAY
                            </button>
                            <button class="btn-secondary" onclick="app.showDetail('${movie.slug}')">
                                THÔNG TIN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCarousel(title, items) {
        if (!items || items.length === 0) return '';
        
        const cards = items.map(movie => `
            <div class="movie-card" onclick="app.showDetail('${movie.slug}')">
                <div class="poster-wrapper">
                    <img src="${this.getImage(movie.thumb_url)}" alt="${movie.name}" loading="lazy">
                    <div class="movie-badge">${movie.episode_current || 'Tập 1'}</div>
                    <div class="movie-overlay">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style="color: white; margin: 0 auto 10px auto;">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </div>
                </div>
                <div class="movie-info">
                    <div class="movie-title">${movie.name}</div>
                    <div class="movie-meta-text">${movie.year || 'N/A'} • ${movie.lang || 'Vietsub'}</div>
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
        const cards = items.map(movie => `
            <div class="movie-card" onclick="app.showDetail('${movie.slug}')" style="flex: auto;">
                <div class="poster-wrapper">
                    <img src="${this.getImage(movie.thumb_url)}" alt="${movie.name}" loading="lazy">
                    <div class="movie-badge">${movie.episode_current || 'Tập 1'}</div>
                </div>
                <div class="movie-info">
                    <div class="movie-title">${movie.name}</div>
                    <div class="movie-meta-text">${movie.year || 'N/A'}</div>
                </div>
            </div>
        `).join('');
        
        return `<div class="search-grid">${cards}</div>`;
    }

    async goHome() {
        this.updateTabs(0);
        this.showLoader();
        
        // Fetch multiple endpoints concurrently for a rich homepage
        const [newMovies, actionMovies, romanceMovies] = await Promise.all([
            this.fetchAPI('/danh-sach/phim-moi-cap-nhat?page=1'),
            this.fetchAPI('/the-loai/hanh-dong?page=1'),
            this.fetchAPI('/the-loai/tinh-cam?page=1')
        ]);

        if (newMovies && newMovies.items) {
            let heroItem = newMovies.items[0];
            let html = this.renderHero(heroItem);
            
            html += this.renderCarousel('Phim Mới Cập Nhật', newMovies.items.slice(1, 15));
            
            if (actionMovies && actionMovies.items) {
                html += this.renderCarousel('Hành Động Khói Lửa', actionMovies.items.slice(0, 10));
            }
            if (romanceMovies && romanceMovies.items) {
                html += this.renderCarousel('Tình Cảm Lãng Mạn', romanceMovies.items.slice(0, 10));
            }
            
            this.mainContent.innerHTML = html;
        }
    }

    async showCategory(slug) {
        const tabIndex = slug === 'hanh-dong' ? 1 : (slug === 'tinh-cam' ? 2 : 0);
        this.updateTabs(tabIndex);
        
        this.showLoader();
        const data = await this.fetchAPI(`/the-loai/${slug}?page=1`);
        
        if (data && data.items) {
            const titleName = data.titlePage || 'Danh sách phim';
            let html = `
                <div class="section-wrapper" style="margin-top: calc(var(--nav-height) + 20px);">
                    <div class="section-title" style="font-size: 2rem;">${titleName}</div>
                    <div style="padding: 0 var(--spacing-lg);">
                        ${this.renderGrid(data.items)}
                    </div>
                </div>
            `;
            this.mainContent.innerHTML = html;
        }
    }

    updateTabs(index) {
        // Mobile Tabs
        const tabs = document.querySelectorAll('.tab-item');
        tabs.forEach((tab, i) => {
            if (i === index) tab.classList.add('active');
            else tab.classList.remove('active');
        });
        
        // Desktop Menu
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

    async searchMovie(query) {
        this.searchResults.innerHTML = `
            <div class="global-loader" style="height: 200px;">
                <div class="spinner"></div>
            </div>
        `;
        
        const data = await this.fetchAPI(`/tim-kiem?keyword=${encodeURIComponent(query)}`);
        
        if (data && data.items && data.items.length > 0) {
            this.searchResults.innerHTML = this.renderGrid(data.items);
        } else {
            this.searchResults.innerHTML = '<div style="text-align:center; padding: 40px; font-size: 1.2rem;">Không tìm thấy kết quả phù hợp</div>';
        }
    }

    async showDetail(slug) {
        // Close search if open
        if (this.searchOverlay.classList.contains('active')) {
            this.toggleSearch();
        }

        // Create detail view element
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
        
        // Force reflow and slide in
        void detailView.offsetWidth;
        detailView.classList.add('active');
        
        const data = await this.fetchAPI(`/phim/${slug}`);
        if (!data || !data.movie) {
            this.closeDetail();
            return;
        }

        const movie = data.movie;
        const poster = this.getImage(movie.poster_url || movie.thumb_url);
        
        // Xử lý tập phim
        let firstEpisodeLink = '';
        let episodesHtml = '';
        
        if (data.episodes && data.episodes.length > 0) {
            const serverData = data.episodes[0].server_data;
            if (serverData && serverData.length > 0) {
                firstEpisodeLink = serverData[0].link_embed;
                
                episodesHtml = serverData.map(ep => `
                    <div class="episode-btn" onclick="app.startPlayer('${ep.link_embed}')">
                        ${ep.name}
                    </div>
                `).join('');
            }
        }
        
        // Categories mapping (tags)
        const categories = movie.category ? movie.category.map(c => c.name) : [];
        const tagsHtml = categories.map((c, i) => `<span class="d-tag ${i===0?'highlight':''}">${c}</span>`).join('');
        
        detailView.innerHTML = `
            <div class="detail-header-fixed">
                <div class="back-btn" onclick="app.closeDetail()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </div>
            </div>
            
            <div class="detail-hero">
                <img src="${poster}" alt="Poster">
                <div class="detail-gradient"></div>
            </div>
            
            <div class="detail-content-wrapper">
                <div style="display: flex; gap: 12px; margin-bottom: 12px; font-weight: bold;">
                    <span style="color: var(--accent-color);">${movie.year}</span>
                    <span style="color: var(--text-secondary);">${movie.episode_current} / ${movie.episode_total}</span>
                    <span style="color: var(--text-secondary);">${movie.quality}</span>
                </div>
                
                <h1 class="detail-main-title">${movie.name}</h1>
                
                <div class="detail-tags">
                    ${tagsHtml}
                </div>
                
                <div style="display: flex; gap: 16px; margin-bottom: 30px;">
                    ${firstEpisodeLink ? `
                    <button class="btn-primary" onclick="app.startPlayer('${firstEpisodeLink}')">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        XEM TẬP 1
                    </button>
                    ` : ''}
                </div>
                
                <div class="detail-desc-text">
                    ${movie.content ? movie.content.replace(/<[^>]*>?/gm, '') : 'Chưa có tóm tắt phim.'}
                </div>
                
                ${episodesHtml ? `
                <h3 style="margin-bottom: 15px; font-size: 1.2rem;">Danh sách tập</h3>
                <div class="episodes-grid">
                    ${episodesHtml}
                </div>
                ` : ''}
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

    startPlayer(embedLink) {
        let playerOverlay = document.getElementById('playerOverlay');
        if (!playerOverlay) {
            playerOverlay = document.createElement('div');
            playerOverlay.id = 'playerOverlay';
            playerOverlay.className = 'player-overlay';
            document.getElementById('app').appendChild(playerOverlay);
        }
        
        playerOverlay.innerHTML = `
            <div class="detail-header-fixed" style="background: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent);">
                <div class="back-btn" onclick="app.closePlayer()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </div>
            </div>
            <div class="video-wrapper">
                <iframe src="${embedLink}" allowfullscreen></iframe>
            </div>
        `;
        
        void playerOverlay.offsetWidth;
        playerOverlay.classList.add('active');
    }
    
    closePlayer() {
        const playerOverlay = document.getElementById('playerOverlay');
        if (playerOverlay) {
            playerOverlay.classList.remove('active');
            // Remove iframe completely to stop audio/video
            setTimeout(() => playerOverlay.remove(), 400);
        }
    }
}

const app = new App();