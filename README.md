# 📖 nHentai Web Reader (Pure Static Web App)

Ứng dụng Web tĩnh 100% (Pure Frontend: HTML, CSS, JS) chạy trực tiếp trên trình duyệt, không phụ thuộc bất kỳ Node.js/Backend Server nào.

## 🚀 Tính Năng Web Tĩnh

1. **Không Cần Backend Server**:
   - Mở file `index.html` trực tiếp bằng trình duyệt hoặc mở qua bất kỳ static web server nào (Live Server, Nginx, GitHub Pages, Vercel, Netlify...).

2. **Tự Động Bypass Referrer & CORS**:
   - Sử dụng thẻ `<meta name="referrer" content="no-referrer">` giúp ảnh CDN (`i1`-`i3`, `t1`-`t4`) hiển thị trực tiếp.
   - Tích hợp cơ chế tự động thử API trực tiếp và fallback qua CORS Proxy nếu môi trường trình duyệt chặn cross-origin.

3. **Full Chức Năng**:
   - **Trang chủ & Phân trang**: Tải các doujinshi mới nhất.
   - **Phổ biến (Popular Now)**: Banner 5 gallery hot nhất & danh sách truyện hot.
   - **Tìm kiếm & Tag**: Tìm kiếm từ khóa, loại trừ từ khóa, lọc theo Tag ID.
   - **Manga Reader 2 chế độ**: Single Page (từng trang + preload ảnh) & Continuous Scroll (cuộn Webtoon).
   - **Phím tắt**: Mũi tên trái/phải, A/D, Space, Escape, F (Fullscreen).
   - **Lưu trữ cá nhân**: Lưu Yêu thích (Favorites) & Lịch sử đọc (History) trong `localStorage`.

---

## 📂 Danh Sách File Dự Án

- `index.html`: Cấu trúc HTML5 tĩnh.
- `styles.css`: Giao diện Dark Mode đẹp mắt, responsive.
- `app.js`: Mã nguồn JavaScript thuần xử lý giao diện & kết nối API.
