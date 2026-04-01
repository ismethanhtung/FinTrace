# DNSE Public Market Data Rules (Security First)

## Mục tiêu

Tích hợp DNSE chỉ để hiển thị dữ liệu thị trường công khai theo thời gian thực cho người dùng cuối.
Không tích hợp bất kỳ luồng nào có thể truy cập dữ liệu tài khoản cá nhân hoặc đặt lệnh.

## Nguồn dữ liệu WebSocket công khai (theo `docs/dnse-api.md`)

Base URL:
- `wss://ws-openapi.dnse.com.vn`

Nhóm dữ liệu market stream có thể dùng:
- `Security Definition`: giá tham chiếu/trần/sàn và trạng thái mã
- `Trade`: giá khớp gần nhất, khối lượng, tổng GTGD/KLGD
- `Trade Extra`: như Trade + chiều mua/bán chủ động, giá khớp trung bình
- `Quote`: độ sâu thị trường (bid/offer, tổng chào mua/chào bán)
- `OHLC`: nến realtime cho stock/derivative/index
- `Expected Price`: giá/khối lượng dự khớp ATO/ATC

## Security Rules bắt buộc

1. Không lưu hoặc hard-code `API Key`, `API Secret`, `Trading Token` trong frontend.
2. Không dùng biến `NEXT_PUBLIC_*` cho bất kỳ secret nào.
3. Không gọi endpoint đặt lệnh hoặc endpoint tài khoản từ ứng dụng hiển thị market data.
4. Chỉ cho phép các luồng dữ liệu public market data; chặn mọi route liên quan giao dịch.
5. Nếu phải dùng credential cho upstream service, chỉ đặt server-side (runtime secret manager/env private).
6. Không log secrets/token vào console, file log, analytics, hoặc error payload.
7. Mọi thay đổi tích hợp DNSE phải qua review với checklist: "public-only, no trading scope".

## Non-goals (không làm)

- Không triển khai chức năng đặt lệnh.
- Không truy vấn số dư, danh mục, lịch sử giao dịch cá nhân.
- Không yêu cầu người dùng nhập API secret vào UI.

## Ghi chú vận hành WebSocket

- Kết nối có hiệu lực tối đa 8 giờ.
- Server gửi `PING` mỗi 3 phút; client phải trả `PONG` đúng hạn để giữ kết nối.
- Mã chứng khoán cần dùng chữ in hoa.
