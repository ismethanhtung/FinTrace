# Task Backlog (Ưu tiên theo mức ảnh hưởng)

## Trạng thái hiện tại (2026-04-09)

- [x] T3 - RSS 500 (`/api/news`, `/api/general-news`, `/api/market-news`) đã chuyển sang `fetch` + parser nội bộ + timeout/retry + log field chuẩn.
- [x] T6 - Endpoint lỗi `[unenv] https.get is not implemented yet` đã xử lý cho nhánh News; route realtime DNSE giữ `runtime = "nodejs"` để tương thích OpenNext build.
- [x] T1 - Fix flash màu sai ở Left Sidebar: fallback đổi sang `amber` khi chưa đủ dữ liệu, không còn mặc định xanh/đỏ; đã thêm unit test `src/lib/stockTone.test.ts`.
- [x] T4/T5 (một phần) - `useDnseBoardStream` đã thêm batching update 120ms + giảm log debug để giảm re-render/lag ở `/board` và sidebar.
- [ ] T2 - Cần thêm metric init/reconnect cho OrderBook để triệt loading nhấp nháy.
- [ ] T4/T5 (phần còn lại) - Cần profile thêm render table `/board` theo thao tác Theme/Language ở tab `SECTOR`.

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

tiếp theo:

Stock Order Book -> có chuyện gì với nó vậy?
50.00
481,800
481,800
29,400
↑
Spread: 50.00 (0.000%)
01:25:32 PM
0.00
1,296,700
1,296,700

tại sao lại chỉ có 1 nhỉ? có khi nào là do cái chọn size bị sai không?
kiểm tra lại nhé. giống như bên /board thì ít cũng có 3 cái rồi, buy 3 cái sell 3 cái, tuy có tuỳ cái có 3 có cái có 1, nhưng ở đây hiển thị bị thiếu.

2. khi user mới vào trang /board hoặc reload trang này, sẽ bị trường hợp tất cả các ô nhảy màu - toàn bộ full tất cả các ô nhảy màu. rất có thể vì lúc mới vào chưa có data/data cũ, cập nhật 1 phát là toàn bộ data mới -> nhảy hết.
   tuy nhiên thì như vậy sẽ cho thấy sự thiếu chuyên nghiệp. tất cả những cái khác đều tốt, chỉ có ở đây hơi có vấn đề nhỏ. tìm cách nhé.

3. ở leftbar, giá cho màu gốc đi, khỏi xanh đỏ. chỉ giá thôi nhé, còn màu chữ, % thì như cũ.
