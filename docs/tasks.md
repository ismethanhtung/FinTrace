# Task Backlog (Ưu tiên theo mức ảnh hưởng)

## Trạng thái hiện tại (2026-04-09)

- [x] T3 - RSS 500 (`/api/news`, `/api/general-news`, `/api/market-news`) đã chuyển sang `fetch` + parser nội bộ + timeout/retry + log field chuẩn.
- [x] T6 - Endpoint lỗi `[unenv] https.get is not implemented yet` đã xử lý cho nhánh News; route realtime DNSE giữ `runtime = "nodejs"` để tương thích OpenNext build.
- [x] T1 - Fix flash màu sai ở Left Sidebar: fallback đổi sang `amber` khi chưa đủ dữ liệu, không còn mặc định xanh/đỏ; đã thêm unit test `src/lib/stockTone.test.ts`.
- [x] T4/T5 (một phần) - `useDnseBoardStream` đã thêm batching update 120ms + giảm log debug để giảm re-render/lag ở `/board` và sidebar.
- [ ] T2 - Cần thêm metric init/reconnect cho OrderBook để triệt loading nhấp nháy.
- [ ] T4/T5 (phần còn lại) - Cần profile thêm render table `/board` theo thao tác Theme/Language ở tab `SECTOR`.

## Nhóm task mới: Auth + User Data (2026-04-09)

- [x] TASK-056 - Auth foundation (Google + MongoDB)
- [x] TASK-057 - User data schema + repositories
- [x] TASK-058 - User API contract v1
- [x] TASK-059 - Frontend auth + settings migration
- [x] TASK-060 - Favorites/pin integration (v1)
- [x] TASK-061 - Security hardening + observability
- [x] TASK-062 - Tests + docs finalization

## T1 - Fix flash màu sai ở Left Sidebar khi reload

- Mức độ: High
- Hiện trạng: Giá thực tế màu đỏ nhưng khi reload hiển thị xanh 1 nhịp rồi mới đổi đúng.
- Nghi ngờ nguyên nhân:
    - State mặc định đang hardcode xanh trước khi có dữ liệu thật.
    - Render đầu dùng dữ liệu cũ/chưa normalize delta.
- Việc cần làm:
    1. Tìm điểm set màu mặc định ở Left Sidebar.
    2. Đổi logic sang `neutral` trước khi có tick đầu tiên.
    3. Chỉ set xanh/đỏ khi có đủ giá hiện tại và giá tham chiếu.
    4. Thêm test unit cho hàm map màu.
- Done khi:
    - Reload không còn flash xanh sai màu.
    - Không có hồi quy ở dark/light mode.

## T2 - Giảm cảm giác "loading liên tục" ở Order Book trang `/`

- Mức độ: High
- Hiện trạng: Vừa vào trang thấy loading nhiều lần (loaded2 xuất hiện liên tục).
- Nghi ngờ nguyên nhân:
    - Gọi API/ws trùng vòng đời mount.
    - Reconnect không debounce.
- Việc cần làm:
    1. Log rõ số lần init data source khi mount.
    2. Gộp các trigger fetch trùng.
    3. Thêm debounce/reconnect backoff cho ws.
    4. Chỉ hiện loading skeleton ở lần đầu, lần sau dùng soft refresh.
- Done khi:
    - Mỗi lần vào trang chỉ thấy loading hợp lý (1 lần chính).
    - Không còn nhấp nháy trạng thái loaded.

### Tiến độ

- [x] Hoàn tất một phần: OrderBook chỉ hiển thị loading cứng ở lần snapshot đầu, các lần resync dùng soft refresh để tránh nhấp nháy.
- [ ] Cần bổ sung logging đếm số lần `loadSnapshot()` + số lần reconnect để chốt triệt để nguyên nhân "loaded2".

## T3 - Fix lỗi `Latest News · BTC` (RSS 500)

- Mức độ: Critical
- Hiện trạng: `Failed to load news via RSS` / `News API Error: 500`.
- Nghi ngờ nguyên nhân:
    - Route đang dùng API Node (`https.get`) không tương thích runtime Cloudflare.
    - Nguồn RSS timeout/blocked.
- Việc cần làm:
    1. Audit toàn bộ route news dùng Node HTTP API.
    2. Chuyển sang `fetch` Web API cho runtime Cloudflare.
    3. Bọc timeout + retry + fallback response hợp lệ.
    4. Thêm logging field: source URL, status, timeout.
- Done khi:
    - Rightbar News load ổn định, không còn 500 hàng loạt.
    - Nếu nguồn lỗi vẫn trả fallback có thông báo thân thiện.

### Tiến độ

- [x] Hoàn tất: dùng `fetchRssFeed()` mới (timeout + retry).
- [x] Hoàn tất: log lỗi có field `url/status/timedOut`.
- [x] Hoàn tất: message fallback thân thiện khi RSS lỗi.

## T4 - Tối ưu tốc độ hiển thị dữ liệu giá ở Left Sidebar

- Mức độ: High
- Hiện trạng: Giá lên chậm, chưa rõ do nguồn dữ liệu hay render.
- Việc cần làm:
    1. Đo latency theo mốc: nhận data -> parse -> setState -> paint.
    2. Tránh re-render toàn sidebar khi chỉ 1 symbol đổi.
    3. Memoize row, normalize update theo batch 100-200ms.
    4. So sánh delay trước/sau bằng số liệu.
- Done khi:
    - Delay cảm nhận giảm rõ rệt.
    - Có số đo latency trước/sau trong PR note.

### Tiến độ

- [x] Hoàn tất một phần: stream update được batch 120ms để tránh setState dày đặc.
- [ ] Chưa có benchmark trước/sau bằng số đo định lượng (ms/FPS).

## T5 - Fix lag nặng trang `/board` khi chọn HOSE/HNX/UPCOM/Sector stocks

- Mức độ: Critical
- Hiện trạng: Sau khi chọn `Sector stocks`, đổi ngôn ngữ/theme bị chậm rõ rệt.
- Nghi ngờ nguyên nhân:
    - Dataset lớn + sort/filter chạy trên main thread mỗi lần render.
    - Không virtualize list hoặc memo selector chưa đúng.
- Việc cần làm:
    1. Profile React render và JS CPU time ở thao tác filter.
    2. Đưa sort/filter nặng sang memo selector ổn định input.
    3. Virtualize table/list nếu số dòng lớn.
    4. Tách state UI (theme/lang) khỏi state data nặng.
- Done khi:
    - Chuyển theme/ngôn ngữ không còn bị đơ sau khi chọn Sector.
    - FPS và thời gian phản hồi đạt mức chấp nhận được.

### Tiến độ

- [x] Hoàn tất một phần: giảm tần suất update stream nên giảm áp lực render table.
- [ ] Chưa profile chi tiết riêng cho thao tác đổi theme/lang ở tab `SECTOR`.

## T6 - Xử lý các endpoint còn lỗi `[unenv] https.get is not implemented yet`

- Mức độ: Critical
- Hiện trạng: Ví dụ `/api/market-news` trả:
    - `"details": "Error: [unenv] https.get is not implemented yet!"`
- Việc cần làm:
    1. Quét toàn repo các chỗ dùng `https.get`, `https.request`, `http.*`, `ws`.
    2. Chuyển sang Web-standard API (`fetch`, native `WebSocket`, `crypto.subtle`).
    3. Xác nhận runtime từng route (`nodejs`/`edge`) tương thích OpenNext + Pages.
    4. Kiểm tra lại trên production Pages domain.
- Done khi:
    - Không còn lỗi unenv trong logs production.
    - Các endpoint realtime/news hoạt động ổn định.

### Tiến độ

- [x] Hoàn tất cho cụm News API.
- [x] Route SSE DNSE đã đổi sang native `WebSocket` (không dùng package `ws`) và giữ `runtime = "nodejs"` để không vỡ OpenNext build.
- [ ] Cần theo dõi logs production thêm để xác nhận không còn unenv ở endpoint ngoài cụm News.

## Ghi chú triển khai

- Luôn test bằng domain Pages production sau deploy.
- Theo dõi `Real-time Logs` cho các route: `/api/news`, `/api/market-news`, `/api/dnse/realtime/stream`.
- Với bug realtime, luôn capture payload SSE `event: error` để debug vòng sau.

## Task mới (2026-04-09 chiều)

- [x] Sửa Stock Order Book chỉ hiện 1 mức:
    - Root cause: depth stock đang ưu tiên hoàn toàn stream nên mất các mức còn lại từ snapshot; thêm nữa bị grouping bucket làm gộp mức.
    - Fix: merge `stream + snapshot` theo price và ép stock grouping cố định để không gộp sai.
- [x] Sửa `/board` flash toàn bộ ô khi vừa load/reload:
    - Root cause: đợt update lớn đầu tiên (cache -> live) gây highlight hàng loạt.
    - Fix: thêm bulk-flash guard, bỏ qua hiệu ứng khi số ô đổi vượt ngưỡng lớn.
- [x] Left Sidebar: giá về màu gốc:
    - Giá luôn `text-main`; giữ nguyên màu symbol và `%/change`.

1. 55,000
   ↑
   Spread: -54,745.00 (-99.900%)
   01:38:25 PM

Stock Order Book

Price
Qty (CP)
Total
55,100
7,100
35,100
55,000
3,300
28,000
54,900
7,200
24,700
56.00
7,100
17,500
55.00
10,400
10,400
55,000
↑
Spread: -54,745.00 (-99.900%)
01:38:49 PM
54,800
1,200
1,200
54,700
3,500
4,700
54,600
11,100
15,800
54.00
15,800
31,600

-> Chênh lệch: -54,745.00 (-99.900%)
cái chênh lệch này có vẻ hơi lạ nhỉ? không biết có vấn đề gì không, kiểm tra giúp tôi nhé.

2.  về cái bulk-flash, có ổn không? có sợ rằng nó vô tình làm mất lúc thị trường biến động nhất không?
    bạn hãy suy nghĩ cẩn thận nhé.

3.  cũng ở trang /board - các data trong khung nhảy thì được load rất nhanh, reload trang cái là thấy luôn, nhưng data ở mấy cái minichart thì hơi lâu, tuy vẫn nhanh nhưng so với các data bên dưới thì chậm hơn khá rõ. vậy data bên dưới tại sao lại nhanh như vậy, có thể áp dụng cho cái trên không? nếu được hãy áp dụng luôn cho các minichart bên trên nhé.
