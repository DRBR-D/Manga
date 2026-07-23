# 📚 nHentai API — Tài Liệu Đầy Đủ & Toàn Diện

> **Multi-language API Reference** — Hỗ trợ mọi ngôn ngữ: Python, JavaScript, C#, Java, PHP, Go, Rust, Ruby, Swift, Kotlin, Dart...

---

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Yêu Cầu Quan Trọng](#yêu-cầu-quan-trọng)
3. [API Endpoints](#api-endpoints)
4. [Cấu Trúc Dữ Liệu](#cấu-trúc-dữ-liệu)
5. [CDN & Hình Ảnh](#cdn--hình-ảnh)
6. [Code Mẫu Đa Ngôn Ngữ](#code-mẫu-đa-ngôn-ngữ)
7. [Xử Lý Lỗi & Rate Limiting](#xử-lý-lỗi--rate-limiting)
8. [FAQ & Mẹo](#faq--mẹo)

---

## Tổng Quan

| Thuộc Tính | Giá Trị |
|---|---|
| **Base URL (API)** | `https://nhentai.net/api/v2/` (chính thức) — `https://nhentai.net/api/` (legacy) |
| **Base URL (Site)** | `https://nhentai.net` |
| **Auth** | Không bắt buộc cho API đọc công khai. Cần cookie + CSRF token cho API ghi (upload, comment, favorites) |
| **Rate Limit** | Không chính thức. Khuyến nghị: 1–2 req/s. **Soft-block xảy ra ở ~30 req/phút**. Một số IP bị ban nhẹ nếu vượt quá |
| **User-Agent** | **BẮT BUỘC** — API sẽ từ chối nếu thiếu |
| **Response Format** | JSON |
| **HTTPS** | Bắt buộc |

### ⚠️ User-Agent Là Bắt Buộc

API nHentai **sẽ từ chối** request không có User-Agent header. Lấy User-Agent của bạn tại:
- https://www.whatismybrowser.com/detect/what-is-my-user-agent/
- Hoặc F12 → Network → Copy `User-Agent` từ request bất kỳ

```text
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
```

---

## API Endpoints

### 1. 📖 Lấy Chi Tiết Gallery (Book)

Lấy toàn bộ metadata của một gallery/doujinshi theo ID.

```http
GET /api/v2/galleries/{id}
GET /api/gallery/{id}                    ← Legacy
```

| Tham Số | Vị Trí | Mô Tả |
|---|---|---|
| `id` | Path | ID của gallery (vd: `660253`) |

**Ví dụ Request:**
```http
GET https://nhentai.net/api/v2/galleries/660253
User-Agent: Mozilla/5.0 ...
```

<details>
<summary><b>📥 Response JSON (click to expand)</b></summary>

```json
{
  "id": 660253,
  "media_id": "4017583",
  "title": {
    "english": "[Sonota Ozey (Yukataro)] Haiboku mousou...",
    "japanese": "[その他大勢Z (ゆかたろ)] 敗北妄想なんかしたくないのにっ！...",
    "pretty": "Haiboku mousou nanka shitakunainonitsu!..."
  },
  "cover": { "path": "galleries/4017583/cover.webp.webp", "width": 350, "height": 495 },
  "thumbnail": { "path": "galleries/4017583/thumb.webp", "width": 250, "height": 352 },
  "pages": [
    { "number": 1, "path": "galleries/4017583/1.webp", "width": 1280, "height": 1808 },
    { "number": 2, "path": "galleries/4017583/2.png", "width": 1280, "height": 1808 }
  ],
  "scanlator": "",
  "upload_date": 1746751161,
  "tags": [
    { "id": 9162, "type": "tag", "name": "sole female", "url": "/tag/sole-female/", "count": 148361 },
    { "id": 12227, "type": "language", "name": "english", "url": "/language/english/", "count": 205112 },
    { "id": 33172, "type": "category", "name": "doujinshi", "url": "/category/doujinshi/", "count": 361617 }
  ],
  "num_pages": 38,
  "num_favorites": 9718
}
```
</details>

---

### 2. 🏠 Trang Chủ (Galleries Mới Nhất)

Lấy danh sách gallery mới upload, phân trang.

```http
GET /api/v2/galleries?page={page}&per_page={per_page}
GET /api/galleries/all?page={page}       ← Legacy
```

| Tham Số | Mặc Định | Mô Tả |
|---|---|---|
| `page` | `1` | Số trang (tổng: ~24978 trang, ~624418 galleries) |
| `per_page` | `25` | Số gallery mỗi trang. Gửi >25 vẫn bị cắt về 25. Tối đa thực tế: 25 |

**Ví dụ:**
```http
GET https://nhentai.net/api/v2/galleries?page=1&per_page=25
```

<details>
<summary><b>📥 Response JSON (click to expand)</b></summary>

```json
{
  "result": [
    {
      "id": 660422,
      "media_id": "4019756",
      "english_title": "[たつか] 好きになっても、いいですよ。【デジタル特装版】",
      "japanese_title": "[たつか] 好きになっても、いいですよ。【デジタル特装版】",
      "thumbnail": "galleries/4019756/thumb.jpg.webp",
      "thumbnail_width": 250,
      "thumbnail_height": 355,
      "num_pages": 208,
      "num_favorites": 36,
      "tag_ids": [123893, 33173, 23237, 6346],
      "blacklisted": false
    }
  ],
  "num_pages": 24978,
  "per_page": 25,
  "total": 624418
}
```
</details>

---

### 3. 🔥 Gallery Phổ Biến (Popular Now)

Lấy 5 gallery đang hot nhất (tương tự trang chủ).

```http
GET /api/v2/galleries/popular
```

**Ví dụ:**
```http
GET https://nhentai.net/api/v2/galleries/popular
```

<details>
<summary><b>📥 Response JSON (click to expand)</b></summary>

```json
[
  {
    "id": 660253,
    "media_id": "4017583",
    "english_title": "[Sonota Ozey (Yukataro)] Haiboku mousou...",
    "japanese_title": "[その他大勢Z (ゆかたろ)] 敗北妄想なんかしたくないのにっ！...",
    "thumbnail": "galleries/4017583/thumb.webp",
    "thumbnail_width": 250,
    "thumbnail_height": 352,
    "num_pages": 38,
    "num_favorites": 9718,
    "tag_ids": [9162, 12227, 15492, ...],
    "blacklisted": false
  },
  ...
]
```
</details>

> **Cấu trúc response:** Mảng `BookLite` — giống hệt format trong `result[]` của search và homepage, nhưng là flat array thay vì object có `result` + `num_pages`.

---

### 4. 🔍 Tìm Kiếm

Tìm gallery theo từ khóa. Hỗ trợ tag, artist, character, language, category...

```http
GET /api/v2/search?query={query}&page={page}&sort={sort}
GET /api/galleries/search?query={query}&page={page}   ← Legacy
```

| Tham Số | Mặc Định | Mô Tả |
|---|---|---|
| `query` | *(bắt buộc)* | Từ khóa tìm kiếm. Dùng `-prefix` để loại trừ (vd: `full color -loli`). Hỗ trợ tìm theo tag name, artist name, category... |
| `page` | `1` | Số trang kết quả |
| `sort` | `recent` | Các giá trị hỗ trợ: `recent` (mới nhất), `popular` (hot nhất mọi thời đại), `popular-week` (hot tuần), `popular-today` (hot ngày). |

**Ví dụ:**
```http
GET https://nhentai.net/api/v2/search?query=swimsuit+full+color+-loli&page=1&sort=popular
```

> ⚠️ **Lưu ý:** Query quá dài hoặc chứa ký tự đặc biệt có thể gây lỗi 500 từ server. Nên giới hạn query dưới ~200 ký tự và encode đúng cách. Nếu gặp lỗi, thử rút gọn query hoặc dùng `galleries/tagged` với tag ID cụ thể.

<details>
<summary><b>📥 Response JSON (click to expand)</b></summary>

```json
{
  "result": [
    {
      "id": 123456,
      "media_id": "1234567",
      "english_title": "...",
      "japanese_title": "...",
      "thumbnail": "galleries/1234567/thumb.webp",
      "thumbnail_width": 250,
      "thumbnail_height": 353,
      "num_pages": 30,
      "num_favorites": 500,
      "tag_ids": [...],
      "blacklisted": false
    }
  ],
  "num_pages": 100,
  "per_page": 25
}
```
</details>

---

### 5. 🏷️ Tìm Theo Tag

Lấy gallery theo tag ID cụ thể.

```http
GET /api/v2/galleries/tagged?tag_id={tag_id}&page={page}&sort={sort}
GET /api/galleries/tagged?tag_id={tag_id}&page={page}&sort=popular   ← Legacy
```

| Tham Số | Mặc Định | Mô Tả |
|---|---|---|
| `tag_id` | *(bắt buộc)* | ID của tag (vd: `9162` = sole female) |
| `page` | `1` | Số trang |
| `sort` | `recent` | `recent`, `popular`, `popular-week`, `popular-today` |

**Ví dụ:**
```http
GET https://nhentai.net/api/v2/galleries/tagged?tag_id=9162&page=1&sort=popular
```

---

### 6. 🔗 Gallery Liên Quan

Lấy gallery liên quan/đề xuất dựa trên gallery hiện tại.

```http
GET /api/v2/galleries/{id}/related
GET /api/gallery/{id}/related          ← Legacy
```

| Tham Số | Mô Tả |
|---|---|
| `id` | ID của gallery nguồn |

**Ví dụ:**
```http
GET https://nhentai.net/api/v2/galleries/161194/related
```

<details>
<summary><b>📥 Response JSON (click to expand)</b></summary>

```json
{
  "result": [
    {
      "id": 161195,
      "media_id": "...",
      "title": { "english": "...", "japanese": "...", "pretty": "..." },
      "cover": { ... },
      "thumbnail": { ... },
      "pages": [ ... ],
      "tags": [ ... ],
      "num_pages": 20,
      "num_favorites": 100
    }
  ]
}
```
</details>

---

### 7. 📡 CDN Configuration

Lấy cấu hình CDN hiện tại (danh sách image server & thumb server).

```http
GET /api/v2/cdn
```

**Ví dụ:**
```http
GET https://nhentai.net/api/v2/cdn
```

<details>
<summary><b>📥 Response JSON (click to expand)</b></summary>

```json
{
  "image_servers": [
    "https://i1.nhentai.net",
    "https://i2.nhentai.net",
    "https://i3.nhentai.net"
  ],
  "thumb_servers": [
    "https://t1.nhentai.net",
    "https://t2.nhentai.net",
    "https://t3.nhentai.net",
    "https://t4.nhentai.net"
  ]
}
```
</details>

---

### 8. 🏷️ Tags / Artists / Characters / Parodies / Groups

Lấy danh sách tags, artists, characters, parodies, groups.

```http
GET /api/v2/tags
GET /api/v2/artists
GET /api/v2/characters
GET /api/v2/parodies
GET /api/v2/groups
```

**Ví dụ:**
```http
GET https://nhentai.net/api/v2/tags
```

> ⚠️ **Cảnh báo quan trọng:** Các endpoint này thường xuyên bị Cloudflare chặn (403) nếu gọi từ code không có browser fingerprint. Đây KHÔNG phải là endpoint công khai ổn định như search hay galleries. **Khuyến nghị:** Dùng `GET /api/v2/search?query=<tên tag>` hoặc đọc `tags[]` từ response `getBook()` để lấy tag ID thay vì gọi trực tiếp các endpoint này. Nếu bắt buộc phải dùng, cần cookie session hợp lệ từ browser.

---

### 9. 🎲 Random Gallery

Lấy một gallery ngẫu nhiên. Trả về cấu trúc giống `GET /api/v2/galleries/{id}` (đầy đủ `Book` object).

```http
GET /api/v2/galleries/random
```

**Ví dụ:**
```http
GET https://nhentai.net/api/v2/galleries/random
```

<details>
<summary><b>📥 Response JSON (click to expand)</b></summary>

```json
{
  "id": 288869,
  "media_id": "1504878",
  "title": {
    "english": "[artist] Title...",
    "japanese": "[artist] タイトル...",
    "pretty": "Title..."
  },
  "cover": { "path": "galleries/1504878/cover.webp.webp", "width": 350, "height": 495 },
  "thumbnail": { "path": "galleries/1504878/thumb.webp", "width": 250, "height": 352 },
  "pages": [
    { "number": 1, "path": "galleries/1504878/1.webp", "width": 1280, "height": 1800 },
    { "number": 2, "path": "galleries/1504878/2.gif", "width": 1280, "height": 1800 }
  ],
  "scanlator": "",
  "upload_date": 1700000000,
  "tags": [
    { "id": 9162, "type": "tag", "name": "sole female", "url": "/tag/sole-female/", "count": 148361 }
  ],
  "num_pages": 22,
  "num_favorites": 500
}
```
</details>

---

## Cấu Trúc Dữ Liệu

### Book / Gallery Object

| Field | Type | Mô Tả |
|---|---|---|
| `id` | `int` | ID duy nhất của gallery (số) |
| `media_id` | `string` \| `int` | ID media dùng để build URL hình ảnh |
| `title.english` | `string` | Tiêu đề tiếng Anh |
| `title.japanese` | `string` | Tiêu đề tiếng Nhật |
| `title.pretty` | `string` | Tiêu đề hiển thị đẹp |
| `pages[]` | `PageInfo[]` | Danh sách ảnh trang (mỗi ảnh có `t`, `w`, `h`) |
| `cover` | `ImageInfo` | Ảnh bìa |
| `thumbnail` | `ImageInfo` | Ảnh thumbnail |
| `scanlator` | `string` | Người/Nhóm scan dịch |
| `upload_date` | `int` | Unix timestamp (giây) |
| `tags[]` | `Tag[]` | Danh sách tag |
| `num_pages` | `int` | Tổng số trang |
| `num_favorites` | `int` | Số lượt yêu thích |

### PageInfo Object

| Field | Type | Mô Tả |
|---|---|---|
| `number` | `int` | Số trang (bắt đầu từ 1) |
| `path` | `string` | Đường dẫn ảnh gốc (vd: `galleries/4017583/1.webp`) |
| `width` | `int` | Chiều rộng (pixels) |
| `height` | `int` | Chiều cao (pixels) |
| `thumbnail` | `string` | Đường dẫn ảnh thumbnail |

### ImageInfo Object (Cover/Thumbnail)

| Field | Type | Mô Tả |
|---|---|---|
| `path` | `string` | Đường dẫn ảnh (vd: `galleries/4017583/cover.webp.webp`) |
| `width` | `int` | Chiều rộng (pixels) |
| `height` | `int` | Chiều cao (pixels) |

> ⚠️ **Quan trọng:** Field `t` trong `images.pages[]` chỉ có 3 giá trị: `"j"`, `"p"`, `"g"` — áp dụng cho **ảnh full-size gốc**. Tuy nhiên, **thumbnail và cover** trên CDN thường được serve dưới dạng `.webp` (vd: `thumb.jpg.webp`, `thumb.webp`) để tối ưu băng thông. Khi build URL cho thumbnail/cover, luôn thử `.webp` trước nếu không chắc chắn về định dạng.

### Tag Object

| Field | Type | Mô Tả |
|---|---|---|
| `id` | `int` | ID của tag |
| `type` | `string` | Loại: `"tag"`, `"language"`, `"category"`, `"artist"`, `"character"`, `"parody"`, `"group"` |
| `name` | `string` | Tên tag |
| `url` | `string` | URL slug của tag |
| `count` | `int` | Tổng số gallery có tag này |

### Search Result Object (v2 - Trang Chủ / Search)

| Field | Type | Mô Tả |
|---|---|---|
| `result[]` | `BookLite[]` | Danh sách gallery (dạng rút gọn) |
| `num_pages` | `int` | Tổng số trang kết quả |
| `per_page` | `int` | Số lượng mỗi trang (mặc định 25) |
| `total` | `int` | *(chỉ có trong `/galleries`)* Tổng số gallery trong toàn hệ thống |

### BookLite (Search Result Item)

Đây là format rút gọn dùng trong kết quả search, homepage, và popular.

| Field | Type | Mô Tả |
|---|---|---|
| `id` | `int` | Gallery ID |
| `media_id` | `string` | Media ID để build URL ảnh |
| `english_title` | `string` | Tiêu đề tiếng Anh |
| `japanese_title` | `string` \| `null` | Tiêu đề tiếng Nhật (có thể null) |
| `thumbnail` | `string` | Path thumbnail tương đối (vd: `galleries/4017583/thumb.webp`) |
| `thumbnail_width` | `int` | Chiều rộng thumbnail |
| `thumbnail_height` | `int` | Chiều cao thumbnail |
| `num_pages` | `int` | Số trang |
| `num_favorites` | `int` | Số favorites |
| `tag_ids` | `int[]` | Mảng các tag ID (dùng để query `/galleries/tagged`) |
| `blacklisted` | `bool` | **Flag ẩn của hệ thống** — `true` nếu gallery bị đánh dấu vi phạm chính sách và bị ẩn khỏi trang chủ/mặc định. Không liên quan đến user blacklist. Khi `true`, gallery vẫn truy cập được qua ID trực tiếp |

---

## CDN & Hình Ảnh

### 🖼️ URL Pattern Hình Ảnh

**Hình ảnh được lưu trên CDN riêng biệt với API server.**

| Loại Ảnh | URL Pattern | Định Dạng Thực Tế |
|---|---|---|
| **Trang (full-size)** | `https://i{n}.nhentai.net/{path}` | Đường dẫn lấy từ `pages[].path` |
| **Trang (thumbnail)** | `https://t{n}.nhentai.net/{thumbnail}` | Đường dẫn lấy từ `pages[].thumbnail` |
| **Bìa (cover)** | `https://t{n}.nhentai.net/galleries/{media_id}/cover.{ext}` | `jpg` hoặc `webp` |
| **Thumbnail gallery** | `https://t{n}.nhentai.net/galleries/{media_id}/thumb.{ext}` | `jpg` hoặc `webp` |
| **Trang (original)** | `https://i{n}.nhentai.net/galleries/{media_id}/{page}.jpg` | Luôn `jpg` (fallback) |

Trong đó:
- `{n}` = 1–4 (chọn ngẫu nhiên hoặc hash từ `media_id`)
- `{media_id}` = lấy từ field `media_id` của gallery
- `{page}` = số trang (bắt đầu từ 1)
- `{ext}` = `jpg`, `png`, `gif`, `webp`

### 🔄 Quy Tắc Chuyển Đổi Image Type → Extension

| `t` value | Extension gốc | Ghi chú |
|---|---|---|
| `"j"` | `jpg` | JPEG — phổ biến nhất |
| `"p"` | `png` | PNG — thường cho ảnh không nền |
| `"g"` | `gif` | GIF — animation |
| *(thumbnail CDN)* | `webp` | Thumbnail thường được serve dạng WebP bất kể ảnh gốc là gì |

### 📌 Thuật Toán Chọn Server (Deterministic)

```python
def pick_server(servers, media_id):
    """Chọn server ổn định dựa trên media_id"""
    hash_val = sum(ord(c) for c in str(media_id))
    return servers[hash_val % len(servers)]
```

---

## Code Mẫu Đa Ngôn Ngữ

Tất cả code mẫu bên dưới **hoàn chỉnh, có thể chạy ngay** với các API endpoint chính.
Đã bao gồm hỗ trợ **WebP** thumbnail.

### 🐍 Python 3

```python
"""
nHentai API Client — Python
Yêu cầu: pip install requests
"""
import requests
import time
from typing import Optional, Dict, List

class NHentaiClient:
    BASE = "https://nhentai.net/api/v2"

    # Mapping image type -> extension (gốc + webp cho thumbnail)
    IMG_EXT = {"j": "jpg", "p": "png", "g": "gif", "w": "webp"}

    def __init__(self, user_agent: str):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": user_agent,
            "Accept": "application/json"
        })

    def _get(self, endpoint: str, params: Optional[Dict] = None) -> dict:
        url = f"{self.BASE}/{endpoint}"
        resp = self.session.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    # ----- Book / Gallery -----

    def get_book(self, book_id: int) -> dict:
        """Lấy chi tiết gallery theo ID"""
        return self._get(f"galleries/{book_id}")

    def get_related(self, book_id: int) -> dict:
        """Lấy gallery liên quan"""
        return self._get(f"galleries/{book_id}/related")

    def get_random(self) -> dict:
        """Lấy gallery ngẫu nhiên (trả về Book object đầy đủ)"""
        return self._get("galleries/random")

    # ----- Listing -----

    def get_homepage(self, page: int = 1) -> dict:
        """Trang chủ — galleries mới nhất"""
        return self._get("galleries", params={"page": page, "per_page": 25})

    def get_popular(self) -> list:
        """Gallery đang hot"""
        return self._get("galleries/popular")

    # ----- Search -----

    def search(self, query: str, page: int = 1, sort: str = "recent") -> dict:
        """Tìm kiếm gallery"""
        return self._get("search", params={
            "query": query, "page": page, "sort": sort
        })

    def search_tag(self, tag_id: int, page: int = 1, sort: str = "recent") -> dict:
        """Tìm gallery theo tag ID"""
        return self._get("galleries/tagged", params={
            "tag_id": tag_id, "page": page, "sort": sort
        })

    # ----- Image URLs -----

    @staticmethod
    def _pick_server(servers, media_id):
        """Chọn CDN server dựa trên hash của media_id"""
        hash_val = sum(ord(c) for c in str(media_id))
        return servers[hash_val % len(servers)]

    def get_image_url(self, media_id, path: str) -> str:
        """Build URL ảnh full-size (dựa vào path từ API)"""
        server_num = self._pick_server([1, 2, 3], media_id)
        return f"https://i{server_num}.nhentai.net/{path}"

    def get_thumb_url(self, media_id, path: str) -> str:
        """Build URL thumbnail (dựa vào path từ API)"""
        server_num = self._pick_server([1, 2, 3, 4], media_id)
        return f"https://t{server_num}.nhentai.net/{path}"

    def get_cover_url(self, media_id, img_type: str = "j") -> str:
        """Build URL ảnh bìa"""
        ext = self.IMG_EXT.get(img_type, "jpg")
        server_num = self._pick_server([1, 2, 3, 4], media_id)
        return f"https://t{server_num}.nhentai.net/galleries/{media_id}/cover.{ext}"

    def get_gallery_thumb_url(self, media_id) -> str:
        """Build URL thumbnail của gallery (luôn dùng webp khi có thể)"""
        server_num = self._pick_server([1, 2, 3, 4], media_id)
        return f"https://t{server_num}.nhentai.net/galleries/{media_id}/thumb.webp"


# ===== USAGE =====
if __name__ == "__main__":
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

    api = NHentaiClient(UA)

    # Lấy gallery chi tiết
    book = api.get_book(660253)
    print(f"📖 {book['title']['pretty']}")
    print(f"   Pages: {book['num_pages']}, Favorites: {book['num_favorites']}")

    # Lấy trang chủ
    home = api.get_homepage(1)
    print(f"🏠 Homepage: {len(home['result'])} galleries (total: {home.get('total', 'N/A')})")

    # Lấy popular
    popular = api.get_popular()
    print(f"🔥 Popular: {len(popular)} galleries")

    # Lấy random
    random_book = api.get_random()
    print(f"🎲 Random: {random_book['title']['pretty']}")

    # Tìm kiếm
    results = api.search("swimsuit full color", page=1, sort="popular")
    print(f"🔍 Search results: {len(results['result'])} of {results['num_pages']} pages")

    # Build image URLs
    pages = book['pages']
    for i, page in enumerate(pages[:3], 1):
        full_url = api.get_image_url(book['media_id'], page['path'])
        thumb_url = api.get_thumb_url(book['media_id'], page.get('thumbnail', page['path']))
        print(f"   🖼️  Page {i}: {full_url} ({page['w']}x{page['h']})")
        print(f"   🖼️  Thumb: {thumb_url}")
```

---

### 📜 JavaScript / Node.js

```javascript
/**
 * nHentai API Client — JavaScript (Node.js 18+)
 * Sử dụng native fetch (không cần thư viện ngoài)
 */

class NHentaiClient {
  static BASE = "https://nhentai.net/api/v2";

  // Mapping image type -> extension
  static IMG_EXT = { j: "jpg", p: "png", g: "gif", w: "webp" };

  // CDN servers
  static IMG_SERVERS = ["i1.nhentai.net", "i2.nhentai.net", "i3.nhentai.net"];
  static THUMB_SERVERS = ["t1.nhentai.net", "t2.nhentai.net", "t3.nhentai.net", "t4.nhentai.net"];

  constructor(userAgent) {
    this.ua = userAgent;
  }

  async _get(endpoint, params = {}) {
    const url = new URL(`${NHentaiClient.BASE}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": this.ua, "Accept": "application/json" }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  }

  // ----- Book -----
  getBook(id)           { return this._get(`galleries/${id}`); }
  getRelated(id)        { return this._get(`galleries/${id}/related`); }
  getRandom()           { return this._get("galleries/random"); }

  // ----- Listing -----
  getHomepage(page = 1) { return this._get("galleries", { page, per_page: 25 }); }
  getPopular()          { return this._get("galleries/popular"); }

  // ----- Search -----
  search(query, page = 1, sort = "recent") {
    return this._get("search", { query, page, sort });
  }
  searchTag(tagId, page = 1, sort = "recent") {
    return this._get("galleries/tagged", { tag_id: tagId, page, sort });
  }

  // ----- Image URLs -----
  static _pickServer(servers, mediaId) {
    const hash = String(mediaId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return servers[hash % servers.length];
  }

  static imageUrl(mediaId, path) {
    const srv = NHentaiClient._pickServer(NHentaiClient.IMG_SERVERS, mediaId);
    return `https://${srv}/${path}`;
  }

  static thumbUrl(mediaId, path) {
    const srv = NHentaiClient._pickServer(NHentaiClient.THUMB_SERVERS, mediaId);
    return `https://${srv}/${path}`;
  }

  static coverUrl(mediaId, imgType = "j") {
    const ext = NHentaiClient.IMG_EXT[imgType] || "jpg";
    const srv = NHentaiClient._pickServer(NHentaiClient.THUMB_SERVERS, mediaId);
    return `https://${srv}/galleries/${mediaId}/cover.${ext}`;
  }

  static galleryThumbUrl(mediaId) {
    const srv = NHentaiClient._pickServer(NHentaiClient.THUMB_SERVERS, mediaId);
    return `https://${srv}/galleries/${mediaId}/thumb.webp`;
  }
}

// ===== USAGE =====
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const api = new NHentaiClient(UA);

(async () => {
  const book = await api.getBook(660253);
  console.log(`📖 ${book.title.pretty}`);
  console.log(`   Pages: ${book.num_pages}, Favs: ${book.num_favorites}`);

  const popular = await api.getPopular();
  console.log(`🔥 Popular: ${popular.length} galleries`);

  const randomBook = await api.getRandom();
  console.log(`🎲 Random: ${randomBook.title.pretty}`);

  const results = await api.search("swimsuit", 1, "popular");
  console.log(`🔍 Found: ${results.result.length} results`);

  // Image URLs
  if (book.pages?.length) {
    const p = book.pages[0];
    console.log(`🖼️  Page 1: ${NHentaiClient.imageUrl(book.media_id, p.path)}`);
    console.log(`🖼️  Thumb: ${NHentaiClient.thumbUrl(book.media_id, p.thumbnail || p.path)}`);
  }
})();
```

---

### ☕ Java

```java
// nHentai API Client — Java 11+
// Không cần thư viện ngoài (chỉ dùng java.net.http)

import java.net.URI;
import java.net.http.*;
import java.io.IOException;
import java.util.*;

public class NHentaiClient {
    private static final String BASE = "https://nhentai.net/api/v2";
    private static final Map<Character, String> IMG_EXT = Map.of(
        'j', "jpg", 'p', "png", 'g', "gif", 'w', "webp"
    );
    private static final int[] IMG_SERVERS = {1, 2, 3};
    private static final int[] THUMB_SERVERS = {1, 2, 3, 4};

    private final HttpClient client;
    private final String userAgent;

    public NHentaiClient(String userAgent) {
        this.userAgent = userAgent;
        this.client = HttpClient.newHttpClient();
    }

    private static int pickServer(int[] servers, String mediaId) {
        int hash = mediaId.chars().sum();
        return servers[hash % servers.length];
    }

    private String get(String endpoint, Map<String, String> params)
            throws IOException, InterruptedException {
        StringBuilder url = new StringBuilder(BASE + "/" + endpoint);
        if (params != null && !params.isEmpty()) {
            url.append("?");
            params.forEach((k, v) -> url.append(k).append("=").append(v).append("&"));
            url.deleteCharAt(url.length() - 1);
        }

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(url.toString()))
            .header("User-Agent", userAgent)
            .header("Accept", "application/json")
            .GET()
            .build();

        HttpResponse<String> res = client.send(req,
            HttpResponse.BodyHandlers.ofString());

        if (res.statusCode() != 200)
            throw new IOException("HTTP " + res.statusCode());
        return res.body();
    }

    // ----- Book -----
    public String getBook(int id) throws IOException, InterruptedException {
        return get("galleries/" + id, null);
    }
    public String getRelated(int id) throws IOException, InterruptedException {
        return get("galleries/" + id + "/related", null);
    }
    public String getRandom() throws IOException, InterruptedException {
        return get("galleries/random", null);
    }

    // ----- Listing -----
    public String getHomepage(int page) throws IOException, InterruptedException {
        return get("galleries", Map.of("page", String.valueOf(page), "per_page", "25"));
    }
    public String getPopular() throws IOException, InterruptedException {
        return get("galleries/popular", null);
    }

    // ----- Search -----
    public String search(String query, int page, String sort)
            throws IOException, InterruptedException {
        return get("search", Map.of("query", query, "page",
            String.valueOf(page), "sort", sort));
    }

    public String searchTag(int tagId, int page, String sort)
            throws IOException, InterruptedException {
        return get("galleries/tagged", Map.of("tag_id",
            String.valueOf(tagId), "page", String.valueOf(page), "sort", sort));
    }

    // ----- Image URLs -----
    public static String imageUrl(String mediaId, int pageNum, char imgType) {
        String ext = IMG_EXT.getOrDefault(imgType, "jpg");
        int srv = pickServer(IMG_SERVERS, mediaId);
        return String.format("https://i%d.nhentai.net/galleries/%s/%d.%s", srv, mediaId, pageNum, ext);
    }

    public static String thumbUrl(String mediaId, int pageNum, char imgType) {
        // Thumbnail thường là webp
        int srv = pickServer(THUMB_SERVERS, mediaId);
        return String.format("https://t%d.nhentai.net/galleries/%s/%dt.webp", srv, mediaId, pageNum);
    }

    public static String coverUrl(String mediaId, char imgType) {
        String ext = IMG_EXT.getOrDefault(imgType, "jpg");
        int srv = pickServer(THUMB_SERVERS, mediaId);
        return String.format("https://t%d.nhentai.net/galleries/%s/cover.%s", srv, mediaId, ext);
    }

    public static String galleryThumbUrl(String mediaId) {
        int srv = pickServer(THUMB_SERVERS, mediaId);
        return String.format("https://t%d.nhentai.net/galleries/%s/thumb.webp", srv, mediaId);
    }

    // ===== USAGE =====
    public static void main(String[] args) throws Exception {
        var api = new NHentaiClient(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

        String home = api.getHomepage(1);
        System.out.println("🏠 Homepage: " + home.substring(0, 200) + "...");

        String popular = api.getPopular();
        System.out.println("🔥 Popular: " + popular.substring(0, 200) + "...");

        String randomBook = api.getRandom();
        System.out.println("🎲 Random: " + randomBook.substring(0, 200) + "...");

        String results = api.search("swimsuit", 1, "popular");
        System.out.println("🔍 Results: " + results.substring(0, 200) + "...");
    }
}
```

---

### C# / .NET

```csharp
// nHentai API Client — C# (.NET 8+)
// Sử dụng System.Text.Json

using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

public class NHentaiClient : IDisposable
{
    private const string BaseUrl = "https://nhentai.net/api/v2";
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    // Image type -> extension mapping
    private static readonly Dictionary<char, string> ImgExt = new()
    {
        ['j'] = "jpg", ['p'] = "png", ['g'] = "gif", ['w'] = "webp"
    };

    private static readonly int[] ImgServers = { 1, 2, 3 };
    private static readonly int[] ThumbServers = { 1, 2, 3, 4 };

    public NHentaiClient(string userAgent)
    {
        _client = new HttpClient();
        _client.DefaultRequestHeaders.Add("User-Agent", userAgent);
    }

    public void Dispose() => _client.Dispose();

    private static int PickServer(int[] servers, string mediaId)
    {
        var hash = mediaId.Sum(c => c);
        return servers[hash % servers.Length];
    }

    private async Task<T> Get<T>(string endpoint,
        Dictionary<string, string>? parameters = null)
    {
        var url = $"{BaseUrl}/{endpoint}";
        if (parameters?.Count > 0)
        {
            var query = string.Join("&", parameters.Select(
                p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
            url += "?" + query;
        }
        return await _client.GetFromJsonAsync<T>(url, JsonOpts)
            ?? throw new Exception("Null response");
    }

    // ----- Book -----
    public Task<Book> GetBook(int id) => Get<Book>($"galleries/{id}");
    public Task<Book> GetRandom() => Get<Book>("galleries/random");
    public Task<RelatedResult> GetRelated(int id) =>
        Get<RelatedResult>($"galleries/{id}/related");

    // ----- Listing -----
    public Task<SearchResult> GetHomepage(int page = 1) =>
        Get<SearchResult>("galleries", new() { ["page"] = page.ToString(), ["per_page"] = "25" });

    public Task<List<BookLite>> GetPopular() =>
        Get<List<BookLite>>("galleries/popular");

    // ----- Search -----
    public Task<SearchResult> Search(string query, int page = 1,
        string sort = "recent") =>
        Get<SearchResult>("search", new() {
            ["query"] = query, ["page"] = page.ToString(), ["sort"] = sort });

    public Task<SearchResult> SearchTag(int tagId, int page = 1,
        string sort = "recent") =>
        Get<SearchResult>("galleries/tagged", new() {
            ["tag_id"] = tagId.ToString(), ["page"] = page.ToString(), ["sort"] = sort });

    // ----- Image URLs -----
    public static string ImageUrl(string mediaId, int page, char imgType)
    {
        var ext = ImgExt.GetValueOrDefault(imgType, "jpg");
        var srv = PickServer(ImgServers, mediaId);
        return $"https://i{srv}.nhentai.net/galleries/{mediaId}/{page}.{ext}";
    }

    public static string ThumbUrl(string mediaId, int page, char imgType)
    {
        // Thumbnail thường là webp bất kể ảnh gốc
        var srv = PickServer(ThumbServers, mediaId);
        return $"https://t{srv}.nhentai.net/galleries/{mediaId}/{page}t.webp";
    }

    public static string CoverUrl(string mediaId, char imgType = 'j')
    {
        var ext = ImgExt.GetValueOrDefault(imgType, "jpg");
        var srv = PickServer(ThumbServers, mediaId);
        return $"https://t{srv}.nhentai.net/galleries/{mediaId}/cover.{ext}";
    }

    public static string GalleryThumbUrl(string mediaId)
    {
        var srv = PickServer(ThumbServers, mediaId);
        return $"https://t{srv}.nhentai.net/galleries/{mediaId}/thumb.webp";
    }
}

// Data Models
public class Book
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("media_id")] public string MediaId { get; set; } = "";
    [JsonPropertyName("title")] public Title? Title { get; set; }
    [JsonPropertyName("images")] public Images? Images { get; set; }
    [JsonPropertyName("tags")] public List<Tag>? Tags { get; set; }
    [JsonPropertyName("num_pages")] public int NumPages { get; set; }
    [JsonPropertyName("num_favorites")] public int NumFavorites { get; set; }
    [JsonPropertyName("scanlator")] public string? Scanlator { get; set; }
    [JsonPropertyName("upload_date")] public long UploadDate { get; set; }
}

public class Title
{
    [JsonPropertyName("english")] public string? English { get; set; }
    [JsonPropertyName("japanese")] public string? Japanese { get; set; }
    [JsonPropertyName("pretty")] public string? Pretty { get; set; }
}

public class Images
{
    [JsonPropertyName("pages")] public List<ImageInfo>? Pages { get; set; }
    [JsonPropertyName("cover")] public ImageInfo? Cover { get; set; }
    [JsonPropertyName("thumbnail")] public ImageInfo? Thumbnail { get; set; }
}

public class ImageInfo
{
    [JsonPropertyName("t")] public string? T { get; set; }  // "j", "p", "g", "w"
    [JsonPropertyName("w")] public int W { get; set; }
    [JsonPropertyName("h")] public int H { get; set; }
}

public class Tag
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("url")] public string? Url { get; set; }
    [JsonPropertyName("count")] public int Count { get; set; }
}

public class BookLite
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("media_id")] public string? MediaId { get; set; }
    [JsonPropertyName("english_title")] public string? EnglishTitle { get; set; }
    [JsonPropertyName("japanese_title")] public string? JapaneseTitle { get; set; }
    [JsonPropertyName("thumbnail")] public string? Thumbnail { get; set; }
    [JsonPropertyName("num_pages")] public int NumPages { get; set; }
    [JsonPropertyName("num_favorites")] public int NumFavorites { get; set; }
    [JsonPropertyName("tag_ids")] public List<int>? TagIds { get; set; }
    /// <summary>
    /// true = gallery bị hệ thống đánh dấu vi phạm, bị ẩn khỏi trang chủ mặc định.
    /// Không liên quan đến user blacklist. Gallery vẫn truy cập được qua ID.
    /// </summary>
    [JsonPropertyName("blacklisted")] public bool Blacklisted { get; set; }
}

public class SearchResult
{
    [JsonPropertyName("result")] public List<BookLite>? Result { get; set; }
    [JsonPropertyName("num_pages")] public int NumPages { get; set; }
    [JsonPropertyName("per_page")] public int PerPage { get; set; }
    [JsonPropertyName("total")] public int Total { get; set; }
}

public class RelatedResult
{
    [JsonPropertyName("result")] public List<Book>? Result { get; set; }
}
```

---

### 🐹 Go

```go
// nHentai API Client — Go 1.21+
package nhentai

import (
	"encoding/json"
	"fmt"
	"hash/fnv"
	"net/http"
	"net/url"
	"strconv"
)

const BaseURL = "https://nhentai.net/api/v2"

// Image type -> extension mapping (includes webp for thumbnails)
var imgExt = map[rune]string{'j': "jpg", 'p': "png", 'g': "gif", 'w': "webp"}

var imgServers = []int{1, 2, 3}
var thumbServers = []int{1, 2, 3, 4}

type Client struct {
	UserAgent string
	client    *http.Client
}

func NewClient(userAgent string) *Client {
	return &Client{UserAgent: userAgent, client: &http.Client{}}
}

func pickServer(servers []int, mediaID string) int {
	h := fnv.New32a()
	h.Write([]byte(mediaID))
	return servers[h.Sum32()%uint32(len(servers))]
}

func (c *Client) get(endpoint string, params map[string]string) (*http.Response, error) {
	u, _ := url.Parse(BaseURL + "/" + endpoint)
	q := u.Query()
	for k, v := range params {
		q.Set(k, v)
	}
	u.RawQuery = q.Encode()

	req, _ := http.NewRequest("GET", u.String(), nil)
	req.Header.Set("User-Agent", c.UserAgent)
	req.Header.Set("Accept", "application/json")
	return c.client.Do(req)
}

func (c *Client) getAndDecode(endpoint string, params map[string]string) (map[string]interface{}, error) {
	resp, err := c.get(endpoint, params)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

// ----- Book -----
func (c *Client) GetBook(id int) (map[string]interface{}, error) {
	return c.getAndDecode("galleries/"+strconv.Itoa(id), nil)
}
func (c *Client) GetRelated(id int) (map[string]interface{}, error) {
	return c.getAndDecode(fmt.Sprintf("galleries/%d/related", id), nil)
}
func (c *Client) GetRandom() (map[string]interface{}, error) {
	return c.getAndDecode("galleries/random", nil)
}

// ----- Listing -----
func (c *Client) GetHomepage(page int) (map[string]interface{}, error) {
	return c.getAndDecode("galleries", map[string]string{
		"page": strconv.Itoa(page), "per_page": "25",
	})
}
func (c *Client) GetPopular() ([]interface{}, error) {
	resp, err := c.get("galleries/popular", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var result []interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

// ----- Search -----
func (c *Client) Search(query string, page int, sort string) (map[string]interface{}, error) {
	return c.getAndDecode("search", map[string]string{
		"query": query, "page": strconv.Itoa(page), "sort": sort,
	})
}
func (c *Client) SearchTag(tagID int, page int, sort string) (map[string]interface{}, error) {
	return c.getAndDecode("galleries/tagged", map[string]string{
		"tag_id": strconv.Itoa(tagID), "page": strconv.Itoa(page), "sort": sort,
	})
}

// ----- Image URLs -----
func ImageURL(mediaID string, pageNum int, imgType rune) string {
	ext := imgExt[imgType]
	if ext == "" { ext = "jpg" }
	srv := pickServer(imgServers, mediaID)
	return fmt.Sprintf("https://i%d.nhentai.net/galleries/%s/%d.%s", srv, mediaID, pageNum, ext)
}

func ThumbURL(mediaID string, pageNum int, imgType rune) string {
	// Thumbnail thường là webp
	srv := pickServer(thumbServers, mediaID)
	return fmt.Sprintf("https://t%d.nhentai.net/galleries/%s/%dt.webp", srv, mediaID, pageNum)
}

func CoverURL(mediaID string, imgType rune) string {
	ext := imgExt[imgType]
	if ext == "" { ext = "jpg" }
	srv := pickServer(thumbServers, mediaID)
	return fmt.Sprintf("https://t%d.nhentai.net/galleries/%s/cover.%s", srv, mediaID, ext)
}

func GalleryThumbURL(mediaID string) string {
	srv := pickServer(thumbServers, mediaID)
	return fmt.Sprintf("https://t%d.nhentai.net/galleries/%s/thumb.webp", srv, mediaID)
}
```

---

### 🐘 PHP

```php
<?php
/**
 * nHentai API Client — PHP 8.1+
 * Yêu cầu: composer require guzzlehttp/guzzle
 */
namespace NHentai;

use GuzzleHttp\Client;

class NHentaiClient {
    private const BASE = 'https://nhentai.net/api/v2';
    private const IMG_EXT = ['j' => 'jpg', 'p' => 'png', 'g' => 'gif', 'w' => 'webp'];
    private const IMG_SERVERS = [1, 2, 3];
    private const THUMB_SERVERS = [1, 2, 3, 4];

    private Client $client;

    public function __construct(string $userAgent) {
        $this->client = new Client([
            'headers' => [
                'User-Agent' => $userAgent,
                'Accept'     => 'application/json',
            ]
        ]);
    }

    private static function pickServer(array $servers, string $mediaId): int {
        $hash = array_sum(array_map('ord', str_split((string)$mediaId)));
        return $servers[$hash % count($servers)];
    }

    private function get(string $endpoint, array $params = []): array {
        $url = self::BASE . '/' . $endpoint;
        $response = $this->client->get($url, ['query' => $params]);
        return json_decode($response->getBody(), true);
    }

    // ----- Book -----
    public function getBook(int $id): array {
        return $this->get("galleries/$id");
    }
    public function getRelated(int $id): array {
        return $this->get("galleries/$id/related");
    }
    public function getRandom(): array {
        return $this->get('galleries/random');
    }

    // ----- Listing -----
    public function getHomepage(int $page = 1): array {
        return $this->get('galleries', ['page' => $page, 'per_page' => 25]);
    }
    public function getPopular(): array {
        return $this->get('galleries/popular');
    }

    // ----- Search -----
    public function search(string $query, int $page = 1, string $sort = 'recent'): array {
        return $this->get('search', ['query' => $query, 'page' => $page, 'sort' => $sort]);
    }
    public function searchTag(int $tagId, int $page = 1, string $sort = 'recent'): array {
        return $this->get('galleries/tagged', ['tag_id' => $tagId, 'page' => $page, 'sort' => $sort]);
    }

    // ----- Image URLs -----
    public static function imageUrl(string $mediaId, int $pageNum, string $imgType): string {
        $ext = self::IMG_EXT[$imgType] ?? 'jpg';
        $srv = self::pickServer(self::IMG_SERVERS, $mediaId);
        return "https://i{$srv}.nhentai.net/galleries/{$mediaId}/{$pageNum}.{$ext}";
    }

    public static function thumbUrl(string $mediaId, int $pageNum, string $imgType): string {
        // Thumbnail thường là webp
        $srv = self::pickServer(self::THUMB_SERVERS, $mediaId);
        return "https://t{$srv}.nhentai.net/galleries/{$mediaId}/{$pageNum}t.webp";
    }

    public static function coverUrl(string $mediaId, string $imgType = 'j'): string {
        $ext = self::IMG_EXT[$imgType] ?? 'jpg';
        $srv = self::pickServer(self::THUMB_SERVERS, $mediaId);
        return "https://t{$srv}.nhentai.net/galleries/{$mediaId}/cover.{$ext}";
    }

    public static function galleryThumbUrl(string $mediaId): string {
        $srv = self::pickServer(self::THUMB_SERVERS, $mediaId);
        return "https://t{$srv}.nhentai.net/galleries/{$mediaId}/thumb.webp";
    }
}

// ===== USAGE =====
$api = new NHentaiClient('Mozilla/5.0 ...');
$book = $api->getBook(660253);
echo "📖 {$book['title']['pretty']}\n";
echo "   Pages: {$book['num_pages']}, Favs: {$book['num_favorites']}\n";

$popular = $api->getPopular();
echo "🔥 Popular: " . count($popular) . " galleries\n";

$random = $api->getRandom();
echo "🎲 Random: {$random['title']['pretty']}\n";

$results = $api->search('swimsuit', 1, 'popular');
echo "🔍 Found: " . count($results['result']) . " results\n";
```

---

### 🦀 Rust

```rust
// nHentai API Client — Rust (reqwest + serde)
// Cargo.toml: reqwest = { version = "0.12", features = ["json"] }
//             serde = { version = "1", features = ["derive"] }
//             serde_json = "1"
//             tokio = { version = "1", features = ["full"] }

use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT, ACCEPT};
use serde::Deserialize;
use std::collections::HashMap;

const BASE_URL: &str = "https://nhentai.net/api/v2";
const IMG_SERVERS: &[u32] = &[1, 2, 3];
const THUMB_SERVERS: &[u32] = &[1, 2, 3, 4];

fn pick_server(servers: &[u32], media_id: &str) -> u32 {
    let hash: u32 = media_id.chars().map(|c| c as u32).sum();
    servers[hash as usize % servers.len()]
}

fn img_ext(img_type: &str) -> &str {
    match img_type { "j" => "jpg", "p" => "png", "g" => "gif", "w" => "webp", _ => "jpg" }
}

#[derive(Debug, Deserialize)]
pub struct Book {
    pub id: i64,
    pub media_id: String,
    pub title: Title,
    pub images: Images,
    pub tags: Vec<Tag>,
    pub num_pages: i64,
    pub num_favorites: i64,
    pub scanlator: Option<String>,
    pub upload_date: i64,
}

#[derive(Debug, Deserialize)]
pub struct Title {
    pub english: Option<String>,
    pub japanese: Option<String>,
    pub pretty: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Images {
    pub pages: Vec<ImageInfo>,
    pub cover: ImageInfo,
    pub thumbnail: ImageInfo,
}

#[derive(Debug, Deserialize)]
pub struct ImageInfo {
    pub t: String,  // "j", "p", "g", "w"
    pub w: i64,
    pub h: i64,
}

#[derive(Debug, Deserialize)]
pub struct Tag {
    pub id: i64,
    #[serde(rename = "type")]
    pub tag_type: String,
    pub name: String,
    pub url: String,
    pub count: i64,
}

#[derive(Debug, Deserialize)]
pub struct BookLite {
    pub id: i64,
    pub media_id: String,
    pub english_title: Option<String>,
    pub japanese_title: Option<String>,
    pub thumbnail: Option<String>,
    pub num_pages: i64,
    pub num_favorites: i64,
    pub tag_ids: Vec<i64>,
    /// true = gallery bị hệ thống ẩn khỏi trang chủ (vi phạm chính sách)
    pub blacklisted: bool,
}

#[derive(Debug, Deserialize)]
pub struct SearchResult {
    pub result: Vec<serde_json::Value>,
    pub num_pages: i64,
    pub per_page: i64,
    #[serde(default)]
    pub total: Option<i64>,
}

pub struct NHentaiClient {
    client: reqwest::Client,
}

impl NHentaiClient {
    pub fn new(user_agent: &str) -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_str(user_agent).unwrap());
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));

        NHentaiClient {
            client: reqwest::Client::builder()
                .default_headers(headers)
                .build()
                .unwrap(),
        }
    }

    async fn get<T: serde::de::DeserializeOwned>(
        &self, endpoint: &str, params: HashMap<&str, String>
    ) -> Result<T, reqwest::Error> {
        let url = format!("{}/{}", BASE_URL, endpoint);
        self.client.get(&url).query(&params).send().await?.json().await
    }

    // ----- Book -----
    pub async fn get_book(&self, id: i64) -> Result<Book, reqwest::Error> {
        self.get(&format!("galleries/{}", id), HashMap::new()).await
    }
    pub async fn get_related(&self, id: i64) -> Result<SearchResult, reqwest::Error> {
        self.get(&format!("galleries/{}/related", id), HashMap::new()).await
    }
    pub async fn get_random(&self) -> Result<Book, reqwest::Error> {
        self.get("galleries/random", HashMap::new()).await
    }

    // ----- Listing -----
    pub async fn get_homepage(&self, page: i64) -> Result<SearchResult, reqwest::Error> {
        let mut params = HashMap::new();
        params.insert("page".into(), page.to_string());
        params.insert("per_page".into(), "25".into());
        self.get("galleries", params).await
    }
    pub async fn get_popular(&self) -> Result<Vec<BookLite>, reqwest::Error> {
        self.get("galleries/popular", HashMap::new()).await
    }

    // ----- Search -----
    pub async fn search(&self, query: &str, page: i64, sort: &str) -> Result<SearchResult, reqwest::Error> {
        let mut params = HashMap::new();
        params.insert("query".into(), query.into());
        params.insert("page".into(), page.to_string());
        params.insert("sort".into(), sort.into());
        self.get("search", params).await
    }

    // ----- Image URLs -----
    pub fn image_url(media_id: &str, page_num: i64, img_type: &str) -> String {
        let ext = img_ext(img_type);
        let srv = pick_server(IMG_SERVERS, media_id);
        format!("https://i{}.nhentai.net/galleries/{}/{}.{}", srv, media_id, page_num, ext)
    }

    pub fn thumb_url(media_id: &str, page_num: i64, _img_type: &str) -> String {
        // Thumbnail thường là webp
        let srv = pick_server(THUMB_SERVERS, media_id);
        format!("https://t{}.nhentai.net/galleries/{}/{}t.webp", srv, media_id, page_num)
    }

    pub fn cover_url(media_id: &str, img_type: &str) -> String {
        let ext = img_ext(img_type);
        let srv = pick_server(THUMB_SERVERS, media_id);
        format!("https://t{}.nhentai.net/galleries/{}/cover.{}", srv, media_id, ext)
    }

    pub fn gallery_thumb_url(media_id: &str) -> String {
        let srv = pick_server(THUMB_SERVERS, media_id);
        format!("https://t{}.nhentai.net/galleries/{}/thumb.webp", srv, media_id)
    }
}
```

---

### 💎 Ruby

```ruby
# nHentai API Client — Ruby 3.1+
# Yêu cầu: gem install httparty

require 'httparty'
require 'json'

class NHentaiClient
  include HTTParty
  base_uri 'https://nhentai.net/api/v2'

  IMG_EXT = { 'j' => 'jpg', 'p' => 'png', 'g' => 'gif', 'w' => 'webp' }.freeze
  IMG_SERVERS = [1, 2, 3].freeze
  THUMB_SERVERS = [1, 2, 3, 4].freeze

  def initialize(user_agent)
    @options = {
      headers: {
        'User-Agent' => user_agent,
        'Accept' => 'application/json'
      }
    }
  end

  def get(endpoint, params = {})
    opts = @options.dup
    opts[:query] = params unless params.empty?
    response = self.class.get("/#{endpoint}", opts)
    raise "HTTP #{response.code}" unless response.success?
    JSON.parse(response.body)
  end

  # ----- Book -----
  def get_book(id)        = get("galleries/#{id}")
  def get_related(id)     = get("galleries/#{id}/related")
  def get_random          = get('galleries/random')

  # ----- Listing -----
  def get_homepage(page = 1) = get('galleries', { page: page, per_page: 25 })
  def get_popular             = get('galleries/popular')

  # ----- Search -----
  def search(query, page = 1, sort = 'recent')
    get('search', { query: query, page: page, sort: sort })
  end
  def search_tag(tag_id, page = 1, sort = 'recent')
    get('galleries/tagged', { tag_id: tag_id, page: page, sort: sort })
  end

  # ----- Image URLs -----
  def self.pick_server(servers, media_id)
    hash = media_id.to_s.chars.sum(&:ord)
    servers[hash % servers.length]
  end

  def self.image_url(media_id, page_num, img_type)
    ext = IMG_EXT[img_type] || 'jpg'
    srv = pick_server(IMG_SERVERS, media_id)
    "https://i#{srv}.nhentai.net/galleries/#{media_id}/#{page_num}.#{ext}"
  end

  def self.thumb_url(media_id, page_num, _img_type = 'j')
    # Thumbnail thường là webp
    srv = pick_server(THUMB_SERVERS, media_id)
    "https://t#{srv}.nhentai.net/galleries/#{media_id}/#{page_num}t.webp"
  end

  def self.cover_url(media_id, img_type = 'j')
    ext = IMG_EXT[img_type] || 'jpg'
    srv = pick_server(THUMB_SERVERS, media_id)
    "https://t#{srv}.nhentai.net/galleries/#{media_id}/cover.#{ext}"
  end

  def self.gallery_thumb_url(media_id)
    srv = pick_server(THUMB_SERVERS, media_id)
    "https://t#{srv}.nhentai.net/galleries/#{media_id}/thumb.webp"
  end
end

# ===== USAGE =====
# api = NHentaiClient.new("Mozilla/5.0 ...")
# book = api.get_book(660253)
# puts "📖 #{book['title']['pretty']}"
# random = api.get_random
# puts "🎲 #{random['title']['pretty']}"
```

---

### 🍎 Swift

```swift
// nHentai API Client — Swift 5.9+
import Foundation

class NHentaiClient {
    private static let baseURL = "https://nhentai.net/api/v2"
    private let session: URLSession
    private let userAgent: String

    private static let imgExt: [Character: String] = [
        "j": "jpg", "p": "png", "g": "gif", "w": "webp"
    ]
    private static let imgServers = [1, 2, 3]
    private static let thumbServers = [1, 2, 3, 4]

    init(userAgent: String) {
        self.userAgent = userAgent
        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = [
            "User-Agent": userAgent,
            "Accept": "application/json"
        ]
        self.session = URLSession(configuration: config)
    }

    private static func pickServer(_ servers: [Int], _ mediaId: String) -> Int {
        let hash = mediaId.unicodeScalars.reduce(0) { $0 + Int($1.value) }
        return servers[hash % servers.count]
    }

    private func get(_ endpoint: String,
                     params: [String: String] = [:]) async throws -> Data {
        var components = URLComponents(string: "\(Self.baseURL)/\(endpoint)")!
        if !params.isEmpty {
            components.queryItems = params.map {
                URLQueryItem(name: $0.key, value: $0.value)
            }
        }
        let (data, response) = try await session.data(from: components.url!)
        guard let httpResp = response as? HTTPURLResponse,
              (200...299).contains(httpResp.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return data
    }

    // ----- Book -----
    func getBook(id: Int) async throws -> Data {
        try await get("galleries/\(id)")
    }
    func getRelated(id: Int) async throws -> Data {
        try await get("galleries/\(id)/related")
    }
    func getRandom() async throws -> Data {
        try await get("galleries/random")
    }

    // ----- Listing -----
    func getHomepage(page: Int = 1) async throws -> Data {
        try await get("galleries", params: ["page": "\(page)", "per_page": "25"])
    }
    func getPopular() async throws -> Data {
        try await get("galleries/popular")
    }

    // ----- Search -----
    func search(query: String, page: Int = 1,
                sort: String = "recent") async throws -> Data {
        try await get("search", params: [
            "query": query, "page": "\(page)", "sort": sort
        ])
    }
    func searchTag(tagId: Int, page: Int = 1,
                   sort: String = "recent") async throws -> Data {
        try await get("galleries/tagged", params: [
            "tag_id": "\(tagId)", "page": "\(page)", "sort": sort
        ])
    }

    // ----- Image URLs -----
    static func imageURL(mediaId: String, pageNum: Int,
                         imgType: Character) -> String {
        let ext = imgExt[imgType] ?? "jpg"
        let srv = pickServer(imgServers, mediaId)
        return "https://i\(srv).nhentai.net/galleries/\(mediaId)/\(pageNum).\(ext)"
    }

    static func thumbURL(mediaId: String, pageNum: Int,
                         imgType: Character = "j") -> String {
        // Thumbnail thường là webp
        let srv = pickServer(thumbServers, mediaId)
        return "https://t\(srv).nhentai.net/galleries/\(mediaId)/\(pageNum)t.webp"
    }

    static func coverURL(mediaId: String, imgType: Character = "j") -> String {
        let ext = imgExt[imgType] ?? "jpg"
        let srv = pickServer(thumbServers, mediaId)
        return "https://t\(srv).nhentai.net/galleries/\(mediaId)/cover.\(ext)"
    }

    static func galleryThumbURL(mediaId: String) -> String {
        let srv = pickServer(thumbServers, mediaId)
        return "https://t\(srv).nhentai.net/galleries/\(mediaId)/thumb.webp"
    }
}
```

---

### 🎯 Kotlin

```kotlin
// nHentai API Client — Kotlin (JVM)
// build.gradle.kts: implementation("io.ktor:ktor-client-core:2.3")
//                    implementation("io.ktor:ktor-client-cio:2.3")

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*

class NHentaiClient(private val userAgent: String) {
    companion object {
        const val BASE = "https://nhentai.net/api/v2"
        val IMG_EXT = mapOf('j' to "jpg", 'p' to "png", 'g' to "gif", 'w' to "webp")
        val IMG_SERVERS = listOf(1, 2, 3)
        val THUMB_SERVERS = listOf(1, 2, 3, 4)

        fun pickServer(servers: List<Int>, mediaId: String): Int {
            val hash = mediaId.sumOf { it.code }
            return servers[hash % servers.size]
        }

        fun imageUrl(mediaId: String, pageNum: Int, imgType: Char): String {
            val ext = IMG_EXT[imgType] ?: "jpg"
            val srv = pickServer(IMG_SERVERS, mediaId)
            return "https://i${srv}.nhentai.net/galleries/${mediaId}/${pageNum}.${ext}"
        }

        fun thumbUrl(mediaId: String, pageNum: Int, imgType: Char = 'j'): String {
            // Thumbnail thường là webp
            val srv = pickServer(THUMB_SERVERS, mediaId)
            return "https://t${srv}.nhentai.net/galleries/${mediaId}/${pageNum}t.webp"
        }

        fun coverUrl(mediaId: String, imgType: Char = 'j'): String {
            val ext = IMG_EXT[imgType] ?: "jpg"
            val srv = pickServer(THUMB_SERVERS, mediaId)
            return "https://t${srv}.nhentai.net/galleries/${mediaId}/cover.${ext}"
        }

        fun galleryThumbUrl(mediaId: String): String {
            val srv = pickServer(THUMB_SERVERS, mediaId)
            return "https://t${srv}.nhentai.net/galleries/${mediaId}/thumb.webp"
        }
    }

    private val client = HttpClient()

    private suspend fun get(endpoint: String,
                            params: Map<String, String> = emptyMap()): String {
        val response: HttpResponse = client.get("$BASE/$endpoint") {
            headers {
                append("User-Agent", userAgent)
                append("Accept", "application/json")
            }
            params.forEach { (k, v) -> parameter(k, v) }
        }
        return response.bodyAsText()
    }

    // ----- Book -----
    suspend fun getBook(id: Int) = get("galleries/$id")
    suspend fun getRelated(id: Int) = get("galleries/$id/related")
    suspend fun getRandom() = get("galleries/random")

    // ----- Listing -----
    suspend fun getHomepage(page: Int = 1) =
        get("galleries", mapOf("page" to page.toString(), "per_page" to "25"))
    suspend fun getPopular() = get("galleries/popular")

    // ----- Search -----
    suspend fun search(query: String, page: Int = 1, sort: String = "recent") =
        get("search", mapOf("query" to query, "page" to page.toString(), "sort" to sort))

    suspend fun searchTag(tagId: Int, page: Int = 1, sort: String = "recent") =
        get("galleries/tagged",
            mapOf("tag_id" to tagId.toString(), "page" to page.toString(), "sort" to sort))
}
```

---

### 🎯 Dart

```dart
// nHentai API Client — Dart 3.x
// pubspec.yaml: dependencies: http: ^1.2.0

import 'dart:convert';
import 'package:http/http.dart' as http;

class NHentaiClient {
  static const String baseUrl = 'https://nhentai.net/api/v2';
  static const Map<String, String> imgExt = {
    'j': 'jpg', 'p': 'png', 'g': 'gif', 'w': 'webp'
  };
  static const List<int> imgServers = [1, 2, 3];
  static const List<int> thumbServers = [1, 2, 3, 4];

  final String userAgent;

  NHentaiClient(this.userAgent);

  Map<String, String> get _headers => {
    'User-Agent': userAgent,
    'Accept': 'application/json',
  };

  static int _pickServer(List<int> servers, String mediaId) {
    final hash = mediaId.codeUnits.fold(0, (a, b) => a + b);
    return servers[hash % servers.length];
  }

  Future<dynamic> _get(String endpoint,
      {Map<String, String>? params}) async {
    final uri = Uri.parse('$baseUrl/$endpoint')
        .replace(queryParameters: params);
    final response = await http.get(uri, headers: _headers);
    if (response.statusCode != 200) {
      throw Exception('HTTP ${response.statusCode}');
    }
    return jsonDecode(response.body);
  }

  // ----- Book -----
  Future<dynamic> getBook(int id) => _get('galleries/$id');
  Future<dynamic> getRelated(int id) => _get('galleries/$id/related');
  Future<dynamic> getRandom() => _get('galleries/random');

  // ----- Listing -----
  Future<dynamic> getHomepage(int page) =>
      _get('galleries', params: {'page': '$page', 'per_page': '25'});
  Future<dynamic> getPopular() => _get('galleries/popular');

  // ----- Search -----
  Future<dynamic> search(String query,
          {int page = 1, String sort = 'recent'}) =>
      _get('search', params: {'query': query, 'page': '$page', 'sort': sort});

  Future<dynamic> searchTag(int tagId,
          {int page = 1, String sort = 'recent'}) =>
      _get('galleries/tagged',
          params: {'tag_id': '$tagId', 'page': '$page', 'sort': sort});

  // ----- Image URLs -----
  static String imageUrl(String mediaId, int pageNum, String imgType) {
    final ext = imgExt[imgType] ?? 'jpg';
    final srv = _pickServer(imgServers, mediaId);
    return 'https://i$srv.nhentai.net/galleries/$mediaId/$pageNum.$ext';
  }

  static String thumbUrl(String mediaId, int pageNum, String imgType) {
    // Thumbnail thường là webp
    final srv = _pickServer(thumbServers, mediaId);
    return 'https://t$srv.nhentai.net/galleries/$mediaId/${pageNum}t.webp';
  }

  static String coverUrl(String mediaId, String imgType) {
    final ext = imgExt[imgType] ?? 'jpg';
    final srv = _pickServer(thumbServers, mediaId);
    return 'https://t$srv.nhentai.net/galleries/$mediaId/cover.$ext';
  }

  static String galleryThumbUrl(String mediaId) {
    final srv = _pickServer(thumbServers, mediaId);
    return 'https://t$srv.nhentai.net/galleries/$mediaId/thumb.webp';
  }
}
```

---

### 🐚 cURL / CLI

```bash
#!/bin/bash
# nHentai API — cURL Examples
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# Trang chủ
curl -s -H "User-Agent: $UA" \
  "https://nhentai.net/api/v2/galleries?page=1&per_page=5" | jq .

# Popular
curl -s -H "User-Agent: $UA" \
  "https://nhentai.net/api/v2/galleries/popular" | jq .

# Random gallery
curl -s -H "User-Agent: $UA" \
  "https://nhentai.net/api/v2/galleries/random" | jq '{id, title: .title.pretty, pages: .num_pages}'

# Chi tiết gallery
curl -s -H "User-Agent: $UA" \
  "https://nhentai.net/api/v2/galleries/660253" | jq '{id, title: .title.pretty, pages: .num_pages, favs: .num_favorites}'

# Tìm kiếm
curl -s -H "User-Agent: $UA" \
  "https://nhentai.net/api/v2/search?query=swimsuit&page=1&sort=popular" | jq '{total_results: .result | length, num_pages}'

# Gallery liên quan
curl -s -H "User-Agent: $UA" \
  "https://nhentai.net/api/v2/galleries/161194/related" | jq '.result | length'

# Tải ảnh full-size
MEDIA_ID="4017583"
PAGE=1
curl -s -H "User-Agent: $UA" \
  "https://i1.nhentai.net/galleries/$MEDIA_ID/$PAGE.jpg" -o "page_$PAGE.jpg"

# Tải thumbnail (webp)
curl -s -H "User-Agent: $UA" \
  "https://t1.nhentai.net/galleries/$MEDIA_ID/1t.webp" -o "thumb_$PAGE.webp"
```

---

## Xử Lý Lỗi & Rate Limiting

### Mã Lỗi HTTP Thường Gặp

| Status | Ý Nghĩa | Giải Pháp |
|---|---|---|
| `200` | Thành công | — |
| `403` | Bị Cloudflare chặn | Thêm User-Agent thật, dùng session cookie `cf_clearance`, thêm delay |
| `404` | Không tìm thấy | Kiểm tra ID gallery/tag |
| `429` | Rate limit | Đọc header `Retry-After`, giảm tần suất, thêm delay 5-15 giây |
| `500` | Lỗi server | Query quá dài hoặc ký tự đặc biệt? Thử rút gọn. Nếu không, thử lại sau |
| `503` | Server bảo trì | Thử lại sau vài phút |

### ⚠️ Rate Limit Thực Tế

nHentai không công bố rate limit chính thức, nhưng qua thực nghiệm:

| Mức Độ | Tần Suất | Hậu Quả |
|---|---|---|
| **An toàn** | 1–2 req/s | Không bị giới hạn |
| **Cảnh báo** | 3–5 req/s | Có thể bị 429 tạm thời |
| **Nguy hiểm** | >30 req/phút liên tục | **Soft-block** — IP bị chặn vài phút đến vài giờ |
| **Quá tải** | >60 req/phút | **Hard-block** — Cloudflare chặn hoàn toàn, cần đổi IP |

> 💡 **Mẹo:** Khi bị 429, server trả về header `Retry-After` (số giây cần đợi). Luôn tôn trọng giá trị này.

### Best Practices Cho Scraping

```python
import time
import random

class SafeNHentaiClient(NHentaiClient):
    """Client có rate limiting & retry tự động với exponential backoff"""

    def _get(self, endpoint, params=None, retries=3):
        last_error = None
        for attempt in range(retries):
            try:
                # Delay ngẫu nhiên để tránh pattern detection
                time.sleep(random.uniform(1.0, 2.5))

                url = f"{self.BASE}/{endpoint}"
                resp = self.session.get(url, params=params, timeout=30)

                if resp.status_code == 429:
                    wait = int(resp.headers.get("Retry-After", 10))
                    print(f"⏳ Rate limited (429), waiting {wait}s...")
                    time.sleep(wait)
                    continue

                if resp.status_code == 403:
                    print(f"🚫 Cloudflare block (403) — cần cookie hoặc giảm tốc độ")
                    time.sleep(30)  # Đợi lâu hơn khi bị chặn
                    continue

                if resp.status_code == 503:
                    print(f"⚠️  Server maintenance (503), retrying in 15s...")
                    time.sleep(15)
                    continue

                if resp.status_code == 500:
                    print(f"⚠️  Server error (500) — có thể query quá dài hoặc lỗi tạm thời")
                    time.sleep(5)
                    continue

                resp.raise_for_status()
                return resp.json()

            except requests.exceptions.RequestException as e:
                last_error = e
                if attempt == retries - 1:
                    raise
                wait = 2 ** attempt + random.uniform(0, 1)
                print(f"🔄 Retry {attempt + 1}/{retries} in {wait:.1f}s: {e}")
                time.sleep(wait)

        raise last_error  # Exhausted all retries
```

---

## FAQ & Mẹo

### ❓ Làm sao để biết tag ID?

Dùng API search với tên tag:
```http
GET https://nhentai.net/api/v2/search?query=sole female
```
Kết quả trả về chứa `tag_ids` — dùng các ID này để query `/galleries/tagged`.

Hoặc đọc từ response `getBook()` — field `tags[]` chứa `id` và `name`.

### ❓ Tại sao bị 403 Forbidden?

Cloudflare protection. Cần:
1. **User-Agent thật** từ browser (quan trọng nhất)
2. Có thể cần thêm cookie `cf_clearance` từ browser session
3. Thêm delay giữa các request (1-3 giây)
4. Một số endpoint (như `/tags`, `/artists`) bị chặn mạnh hơn — dùng search thay thế

### ❓ Thumbnail có định dạng gì? Sao lúc `.jpg` lúc `.webp`?

- **Ảnh full-size gốc**: luôn theo `pages[].path` — `jpg`, `png`, hoặc `gif`
- **Thumbnail + Cover trên CDN**: nHentai tự động chuyển sang `.webp` để tối ưu, bất kể ảnh gốc là gì. Path trong response cũng phản ánh điều này (vd: `thumb.jpg.webp`, `thumb.webp`)
- **Cách an toàn nhất**: luôn thử `.webp` cho thumbnail, fallback về `.jpg` nếu 404

```python
# Pattern an toàn cho thumbnail
thumb_urls = [
    f"https://t1.nhentai.net/galleries/{media_id}/thumb.webp",  # Thử webp trước
    f"https://t1.nhentai.net/galleries/{media_id}/thumb.jpg",   # Fallback jpg
]
```

### ❓ Làm sao để lấy ảnh thumbnail nhanh?

Dùng thumbnail server `t{n}.nhentai.net` + `.webp`:
```python
# Thumbnail = nhẹ hơn nhiều, load nhanh hơn ảnh gốc
thumb_url = f"https://t1.nhentai.net/galleries/{media_id}/thumb.webp"
```

### ❓ API có cần authentication không?

**Không** — tất cả API đọc (GET) đều là public, không cần auth. Tuy nhiên Cloudflare có thể chặn nếu request quá nhanh hoặc không có User-Agent hợp lệ.

### ❓ Có API cho favorites, upload, login, comment không?

**Có nhưng không public** — các endpoint POST/PUT/DELETE yêu cầu:
1. **Cookie session** (`sessionid`) từ đăng nhập
2. **CSRF token** (`csrftoken` hoặc header `X-CSRFToken`)
3. **Referer header** khớp với origin

Cách lấy CSRF token:
1. Đăng nhập vào nhentai.net trên browser
2. F12 → Application → Cookies → copy `csrftoken`
3. Hoặc F12 → Network → tìm request POST bất kỳ → copy giá trị header `X-CSRFToken`

> ⚠️ **Lưu ý:** CSRF token phải đến từ cùng IP + User-Agent sẽ dùng với API. Token từ IP khác sẽ bị từ chối.

### ❓ `media_id` khác gì với gallery `id`?

- **Gallery `id`**: ID công khai dùng trên URL (`nhentai.net/g/660253/`)
- **`media_id`**: ID nội bộ dùng để build đường dẫn ảnh CDN (`galleries/4017583/1.jpg`)

Luôn lấy `media_id` từ API response, **không tự suy luận từ gallery id**. Hai ID này không có mối liên hệ toán học.

### ❓ `blacklisted: true` nghĩa là gì?

Đây là **flag của hệ thống**, không liên quan đến user blacklist của bạn:
- Gallery bị đánh dấu `blacklisted: true` khi vi phạm chính sách nội dung
- Nó bị ẩn khỏi trang chủ và kết quả search mặc định
- **Vẫn truy cập được** qua ID trực tiếp (`/g/{id}/`)
- Khi dùng API, bạn có thể lọc bỏ `blacklisted: true` nếu muốn kết quả "sạch"

### ❓ Tổng số gallery hiện tại?

~624,418 galleries (tính đến dữ liệu mới nhất), trải trên ~24,978 trang (25 galleries/trang).

### ❓ `per_page` có thể >25 không?

Không. Gửi `per_page=50` sẽ bị ignore — server luôn trả về tối đa 25 items. Đây là hard limit phía server.

---

## 📊 API Endpoint Tổng Hợp

| # | Endpoint (v2) | Endpoint (Legacy) | Response Type | Mô Tả |
|---|---|---|---|---|
| 1 | `GET /api/v2/galleries?page=&per_page=` | `GET /api/galleries/all?page=` | `SearchResult` | Trang chủ — danh sách mới nhất |
| 2 | `GET /api/v2/galleries/popular` | — | `BookLite[]` | 5 gallery hot nhất |
| 3 | `GET /api/v2/galleries/random` | — | `Book` | Gallery ngẫu nhiên (đầy đủ) |
| 4 | `GET /api/v2/galleries/{id}` | `GET /api/gallery/{id}` | `Book` | Chi tiết gallery |
| 5 | `GET /api/v2/galleries/{id}/related` | `GET /api/gallery/{id}/related` | `RelatedResult` | Gallery liên quan |
| 6 | `GET /api/v2/search?query=&page=&sort=` | `GET /api/galleries/search?query=&page=` | `SearchResult` | Tìm kiếm |
| 7 | `GET /api/v2/galleries/tagged?tag_id=&page=&sort=` | `GET /api/galleries/tagged?tag_id=&page=` | `SearchResult` | Tìm theo tag |
| 8 | `GET /api/v2/cdn` | — | `CdnConfig` | Cấu hình CDN |
| 9 | `GET /api/v2/tags` | — | *(hạn chế)* | Danh sách tags ⚠️ |
| 10 | `GET /api/v2/artists` | — | *(hạn chế)* | Danh sách artists ⚠️ |
| 11 | `GET /api/v2/characters` | — | *(hạn chế)* | Danh sách characters ⚠️ |
| 12 | `GET /api/v2/parodies` | — | *(hạn chế)* | Danh sách parodies ⚠️ |
| 13 | `GET /api/v2/groups` | — | *(hạn chế)* | Danh sách groups ⚠️ |

> ⚠️ = Endpoint thường bị Cloudflare chặn, không ổn định. Dùng search thay thế.

---

## 🔌 Tự Host Proxy Server (Node.js)

Nếu bị Cloudflare chặn từ IP server, bạn có thể chạy proxy trung gian:

```javascript
// nhentai-proxy-server.js — Node.js Express Proxy
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const API_BASE = 'https://nhentai.net/api/v2/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function proxyApi(subPath, res) {
  try {
    const response = await fetch(API_BASE + subPath, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    });
    if (!response.ok) return res.status(response.status).json({ error: `Upstream: ${response.status}` });
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Routes
app.get('/api/home', (req, res) => proxyApi(`galleries?page=${req.query.page || 1}&per_page=25`, res));
app.get('/api/popular', (req, res) => proxyApi('galleries/popular', res));
app.get('/api/random', (req, res) => proxyApi('galleries/random', res));
app.get('/api/search', (req, res) => proxyApi(`search?query=${encodeURIComponent(req.query.q || '')}&page=${req.query.page || 1}&sort=${req.query.sort || 'recent'}`, res));
app.get('/api/tagged', (req, res) => proxyApi(`galleries/tagged?tag_id=${req.query.tag_id}&page=${req.query.page || 1}&sort=${req.query.sort || 'recent'}`, res));
app.get('/api/book/:id', (req, res) => proxyApi(`galleries/${req.params.id}`, res));
app.get('/api/book/:id/related', (req, res) => proxyApi(`galleries/${req.params.id}/related`, res));

// Image proxy — supports webp & original formats
app.get('/api/image/*', async (req, res) => {
  try {
    const imgPath = req.params[0];
    const response = await fetch(`https://i1.nhentai.net/${imgPath}`, { headers: { 'User-Agent': UA } });
    if (!response.ok) return res.status(response.status).end();
    res.set({
      'Content-Type': response.headers.get('content-type') || 'image/webp',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (err) { res.status(500).end(); }
});

// Thumbnail proxy
app.get('/api/thumb/*', async (req, res) => {
  try {
    const thumbPath = req.params[0];
    const response = await fetch(`https://t1.nhentai.net/${thumbPath}`, { headers: { 'User-Agent': UA } });
    if (!response.ok) return res.status(response.status).end();
    res.set({
      'Content-Type': response.headers.get('content-type') || 'image/webp',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (err) { res.status(500).end(); }
});

app.listen(PORT, () => console.log(`📚 NHentai Proxy running at http://localhost:${PORT}`));
```

---

## 📝 Ghi Chú

- **API có thể thay đổi** — nHentai đôi khi cập nhật API format. Luôn kiểm tra `https://nhentai.net/api/v2/docs` để có thông tin mới nhất.
- **Tôn trọng rate limit** — Không spam request. Thêm delay 1-3 giây giữa các request. Soft-block ở ~30 req/phút.
- **User-Agent là bắt buộc** — Thiếu User-Agent = request bị từ chối ngay lập tức.
- **HTTPS only** — Tất cả API endpoint yêu cầu HTTPS.
- **Thumbnail = WebP** — Thumbnail trên CDN thường được serve dạng `.webp` để tối ưu. Code mẫu đã được cập nhật để xử lý việc này.
- **Video/Stream** — Một số gallery có video (hiếm), format có thể khác với mô tả trên.

---

> 📚 **Tài liệu được tổng hợp từ:** Source code NHentaiAPI.NET (C#), nhentai-web-reader (Node.js), dữ liệu thực tế từ nhentai.net, và API response embedded data.
>
> 🔧 **Đóng góp:** Nếu phát hiện endpoint mới hoặc thay đổi API, vui lòng cập nhật tài liệu này.
