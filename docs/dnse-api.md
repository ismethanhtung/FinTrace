tài liệu về DNSE api

DNSE API Platform

📄
Copy page
▾
Giới thiệu
Chào mừng khách hàng và đối tác đến với tài liệu LightSpeed API của DNSE cung cấp. Dịch vụ OpenAPI mang đến trải nghiệm đầu tư toàn diện, linh hoạt và hiện đại với những lợi thế vượt trội:

Chủ động trong việc xây dựng hành trình đầu tư: Từ theo dõi biến động thị trường, đưa ra quyết định đến đặt lệnh – mọi thao tác đều có thể được lập trình và quản lý chủ động bởi người dùng.
Nguồn dữ liệu thị trường đa dạng: Cung cấp đầy đủ từ độ sâu thị trường, biến động giá thị trường, thông tin OHLC, các chỉ số indices và nhiều loại dữ liệu khác.
Tốc độ xử lý vượt trội: Cập nhật realtime thông tin biến động tài sản, sổ lệnh giao dịch.
Khả năng mở rộng và tích hợp đa nền tảng: Xây dựng ứng dụng giao dịch chủ động đơn giản cho cá nhân đến hệ thống phân tích và nền tảng giao dịch phức tạp dành cho tổ chức.
Đối tượng sử dụng
Nhà đầu tư cá nhân muốn số hóa chiến lược và quản lý danh mục realtime.
Doanh nghiệp Công nghệ Tài chính muốn tích hợp dữ liệu thị trường và giao dịch vào sản phẩm.
Đối tác Tổ chức Tài chính cần giám sát danh mục và xử lý số lượng lệnh lớn hay mở rộng dịch vụ tích hợp.
Nhà phát triển công nghệ xây dựng giao dịch chủ động, dashboard hoặc công cụ phân tích.
Sơ đồ hệ thống
Locale Dropdown

Mô hình đa tầng bảo mật
Locale Dropdown

Sau khi đăng ký thành công, khách hàng sẽ nhận được bộ chuỗi bảo mật bao gồm: API Key, API secret.

API Key

API Key được cung cấp sau khi đăng ký sử dụng OpenAPI, đây là khóa định danh duy nhất, đóng vai trò nhận diện và xác minh danh tính khi kết nối với hệ thống.
API Key phải được giữ bí mật và chỉ dùng cho mục đích gọi API. Khách hàng có thể chủ động tạo mới hoặc thu hồi bất kỳ lúc nào.
Khi tạo mới hoặc hủy API Key, bộ khóa cũ sẽ lập tức vô hiệu lực, giảm thiểu rủi ro khi bị lộ hoặc không còn nhu cầu sử dụng.
API Secret

API Secret là một chuỗi ký tự mật dùng để xác minh và bảo vệ API, được sử dụng để sinh chữ ký số Signature cần thiết cho hầu hết các REST API.
API Key và API Secret là cặp khóa luôn đi cùng nhau, có thể hiểu tương tự như tên người dùng và mật khẩu.
API Secret chỉ hiển thị duy nhất một lần khi đăng ký thành công để bảo mật cho tài khoản. Khách hàng cần chủ động lưu lại và quản lý thông tin này.
Phương thức xác thực lớp thứ 2 (2FA)

Bên cạnh API Key và API Secret, hệ thống áp dụng thêm lớp xác thực thứ hai (2FA) với giao dịch đặt lệnh.

Tại mỗi thời điểm, chỉ một phương thức xác thực lớp thứ hai được kích hoạt và là phương thức duy nhất được hệ thống chấp nhận khi thực hiện xác thực OTP.
Khách hàng lựa chọn và có thể thay đổi giữa Smart OTP hoặc Email OTP.
Việc kết hợp API Key, API Secret và xác thực lớp thứ hai đảm bảo rằng chỉ các yêu cầu được thực hiện bởi đúng chủ tài khoản, đáp ứng đầy đủ điều kiện xác thực mới được hệ thống chấp nhận và xử lý.

Lưu ý
Các chuỗi bảo mật DNSE đã cung cấp trên là thông tin nhạy cảm cần được bảo mật nghiêm ngặt. Tuyệt đối không chia sẻ hoặc tiết lộ cho bất kỳ cá nhân hay tổ chức nào không thuộc phạm vi được ủy quyền sử dụng. Việc bảo mật tốt giúp ngăn chặn các rủi ro về truy cập trái phép và bảo vệ tài khoản.

Xác thực

📄
Copy page
▾
Bước xác thực thứ 1
Trong giao tiếp giữa ứng dụng của Người dùng và hệ thống DNSE, việc xác minh danh tính và bảo vệ tính toàn vẹn của dữ liệu là yêu cầu bắt buộc. Hầu hết các RESTful API cần kèm theo đủ hai thông tin là API Key và Signature (chữ ký số) trong Headers để hệ thống xác thực và cho phép xử lý yêu cầu.

API Key
API Key là khóa định danh duy nhất được cấp cho từng tài khoản khi đăng ký sử dụng LightSpeed API.
Trong mỗi request, API Key là thành phần bắt buộc để nhận diện ứng dụng và áp dụng cơ chế phân quyền, giới hạn truy cập.
API Key cần được quản lý cẩn trọng và tránh chia sẻ công khai. Người dùng có thể chủ động tạo mới hoặc thu hồi API Key trong trường hợp nghi ngờ lộ thông tin hoặc không còn nhu cầu sử dụng.
Trường hợp bị rò rỉ, các yêu cầu trái phép sẽ không được chấp nhận nếu không có Signature hợp lệ đi kèm.
Signature
Signature chữ ký số là lớp bảo mật bổ sung để xác nhận tính chính xác và toàn vẹn của từng yêu cầu, tránh giả mạo hay sửa đổi giữa đường truyền.
Được tạo bằng các thành phần: API Secret, Path, Timestamp, Nonce, Query params (nếu có). Tất cả đưa vào thuật toán hashing (HMAC SHA256) theo quy tắc hệ thống cung cấp để sinh ra Signature.
Nếu Signature bị sai hoặc không được gửi kèm theo, yêu cầu sẽ bị từ chối ngay lập tức.
Ví dụ Headers:

{
"method": "GET",
"path": "/accounts",
"headers": {
"x-api-key": "lB58g6iWzyrNx2EhwwQXeYeoAnkzlaXkJWi", // APIKey được cấp khi đăng ký dịch vụ
"x-signature": "96299733e5b56aaa6c91a8f88b472c9721fde161e0d89df8c", // Chữ ký số theo thuật toán HMAC SHA256
"date":"Fri, 16 Jan 2026 07:11:30 +0000" // Thời gian tạo yêu cầu (UTC)
},
}

DNSE cung cấp SDKs tự động tạo Signature cho mỗi Request giúp giảm độ phức tạp và hạn chế lỗi xác thực khi tích hợp. Tham khảo tại đây.

Bước xác thực thứ 2
Nếu API Key đóng vai trò là lớp bảo mật thứ nhất, thì Trading Token là lớp bảo mật thứ 2 đối với giao dịch đặt lệnh theo cơ chế 2FA – Two Factor Authentication.

Trading Token được cung cấp sau khi người dùng hoàn tất xác thực OTP, và là thông tin bắt buộc phải được truyền kèm trong các API đặt lệnh.

Ví dụ trong Headers

{
"method": "POST",
"path": "/accounts/orders",
"headers": {
"x-api-key": "lB58g6iWzyrNx2EhwwQXeYeoAnkzlaXkJWi", // APIkey được cấp khi đăng ký dịch vụ
"x-signature": "fjsdhfryt6aaa6c91a8f88b472c9721fde161e0d89df8c", // Chữ ký số theo thuật toán HMAC SHA256
"trading-token": "7ceef658-9f01-414e-8b3e-faa77bb9061e", // Token đặt lệnh  
 "date": "Fri, 16 Jan 2026 07:11:30 +0000" // Thời gian tạo yêu cầu (UTC)
},
}

Phương thức OTP
OpenAPI hiện hỗ trợ hai phương thức Email OTP hoặc Smart OTP để xác thực và tạo Trading Token. Tại mỗi thời điểm, chỉ một phương thức OTP duy nhất được hoạt động.

Email OTP
Mã OTP được gửi về địa chỉ email mà người dùng đã đăng ký, có hiệu lực trong 2 phút.
Ưu điểm:
Quản lý linh hoạt, có thể tự động hóa trong quy trình xác thực, mang lại trải nghiệm liền mạch cho người dùng khi xây dựng hệ thống giao dịch qua OpenAPI.
Hạn chế:
Thời gian nhận email phụ thuộc vào bên thứ 3.
Tham khảo Endpoint Gửi Email OTP

Smart OTP
Mã OTP được lấy trực tiếp trên ứng dụng DNSE đã đăng ký SmartOTP, có hiệu lực trong 30 giây.

Ưu điểm:

Mã luôn có sẵn trên ứng dụng và chỉ sinh trên thiết bị đã đăng ký.
Độ bảo mật cao do, giảm thiểu nguy cơ giả mạo hoặc truy cập trái phép.
Hạn chế:

Người dùng cần thao tác thủ công vào ứng dụng để lấy mã khi cần thực hiện xác thực.
Hướng dẫn:

Tại app EntradeX by DNSE trên thiết bị di động, người dùng chọn mục SmartOTP từ menu, chọn Lấy mã OTP cho thiết bị khác.
Locale Dropdown

Xác thực OTP
Để lấy Trading Token, người dùng thực hiện gửi yêu cầu đến Endpoint xác thực OTP., trong đó:

{
"method": "POST",
"path": "/openapi/registration/trading-token",
"headers": {
"x-api-key": "lB58g6iWzyrNx2EhwwQXeYeoAnkzlaXkJWi", // APIkey được cấp khi đăng ký dịch vụ
"signature": "fjsdhfryt6aaa6c91a8f88b472c9721fde161e0d89df8c", // Chữ ký số theo thuật toán HMAC SHA256
"date":"Fri, 16 Jan 2026 07:11:30 +0000", // Thời gian tạo yêu cầu (UTC)  
 "Content-Type": "application/json"
},
"body": {
"otpType": "email_otp", // Phương thức OTP đang sử dụng (email_otp hoặc smart_otp)
"passcode": "1234" // Mã OTP tương ứng phương thức
}
}

Tại một thời điểm, tài khoản chỉ được đăng ký sử dụng duy nhất 1 phương thức và cần truyền đúng trường tương ứng smart-otp hoặc email-otp. Trường hợp tài khoản đăng ký sử dụng Smart OTP nhưng truyền lên email-otp (hoặc ngược lại) yêu cầu gửi đến hệ thống sẽ bị từ chối.

Nếu thông tin hợp lệ, hệ thống sẽ trả về Trading Token có hiệu lực trong 8 giờ. Người dùng có thể thực hiện nhiều giao dịch liên tiếp mà không cần xác thực lại OTP. Khi Trading Token hết hiệu lực, người dùng cần thực hiện lại bước xác thực OTP để tạo token mới.

Enums Dữ liệu thị trường

📄
Copy page
▾
BoardId
Định danh bảng giao dịch

Enums Code Enums (BoardID) Mô tả
0 BOARD_ID_UNSPECIFIED Không xác định
1 BOARD_ID_AL Tất cả bảng
2 BOARD_ID_G1 Lô chẵn
4 BOARD_ID_G3 Board phiên sau giờ (PLO)
5 BOARD_ID_G4 Lô lẻ
9 BOARD_ID_T1 Thỏa thuận lô chẵn 9h-14h45
11 BOARD_ID_T3 Thỏa thuận lô chẵn 14h45-15h
12 BOARD_ID_T4 Thỏa thuận lô lẻ 9h-14h45
13 BOARD_ID_T6 Thỏa thuận lô lẻ 14h45-15h
MarketId
Mã thị trường

Enums Code Enums (MarketID) Mô tả
0 MARKET_ID_UNSPECIFIED Không xác định
3 MARKET_ID_DVX Phái sinh sàn HNX
4 MARKET_ID_HCX Trái phiếu doanh nghiệp sàn HNX
6 MARKET_ID_STO Cổ phiếu sàn HOSE
7 MARKET_ID_STX Cổ phiếu sàn HNX
8 MARKET_ID_UPX Cổ phiếu sàn Upcom
productGrpID
Nhóm sản phẩm theo thị trường

Enums Code Enums (ProductGrpID) Mô tả
0 PRODUCT_GRP_ID_UNSPECIFIED Không xác định
3 PRODUCT_GRP_ID_FBX Hợp đồng tương lai Trái phiếu
4 PRODUCT_GRP_ID_FIO Hợp đồng tương lai Chỉ số
5 PRODUCT_GRP_ID_HCX Trái phiếu Doanh nghiệp HNX
7 PRODUCT_GRP_ID_STO Cổ phiếu sàn HOSE
8 PRODUCT_GRP_ID_STX Cổ phiếu sàn HNX
9 PRODUCT_GRP_ID_UPX Cổ phiếu sàn Upcom
securityGroupId
Định danh nhóm chứng khoán

Enums Code Enums (SecurityGroupID) Mô tả
0 SECURITY_GROUP_ID_UNSPECIFIED Không xác định
1 SECURITY_GROUP_ID_BS Trái phiếu doanh nghiệp
2 SECURITY_GROUP_ID_EF Quỹ ETF
3 SECURITY_GROUP_ID_EW Chứng quyền
4 SECURITY_GROUP_ID_FU Hợp đồng tương lai
6 SECURITY_GROUP_ID_SR Quyền mua
7 SECURITY_GROUP_ID_ST Cổ phiếu
securityStatus
Trạng thái của mã chứng khoán

Enums Code Enums (securityStatus) Mô tả
1 SI_SECURITY_STATUS_HALT Ngừng giao dịch
2 SI_SECURITY_STATUS_NO_HALT Không ngừng giao dịch
side
Chiều xác định mua/bán chủ động

Enums Code Enums (side) Mô tả
0 SIDE_UNSPECIFIED Không xác định
1 SIDE_BUY Mua chủ động
2 SIDE_SELL Bán chủ động
symbolAdminStatusCode
Trạng thái quản lý hành chính mã chứng khoán

Enums Code Enums (SymbolAdminStatusCode) Mô tả
0 SYMBOL_ADMIN_STATUS_CODE_UNSPECIFIED Không xác định
1 SYMBOL_ADMIN_STATUS_CODE_CR Kiểm soát và hạn chế giao dịch
2 SYMBOL_ADMIN_STATUS_CODE_CTR Kiểm soát
3 SYMBOL_ADMIN_STATUS_CODE_NRM Bình thường
4 SYMBOL_ADMIN_STATUS_CODE_RES Hạn chế giao dịch
5 SYMBOL_ADMIN_STATUS_CODE_WFR Cảnh báo do vi phạm BCTC
6 SYMBOL_ADMIN_STATUS_CODE_WID Cảnh báo do vi phạm CBTT
7 SYMBOL_ADMIN_STATUS_CODE_WOV Cảnh báo vi phạm khác
symbolTradingMethodStatusCode
Trạng thái cơ chế giao dịch mã chứng khoán

Enums Code Enums (SymbolTradingMethodStatusCode) Mô tả
0 SYMBOL_TRADING_METHOD_STATUS_CODE_UNSPECIFIED Không xác định
1 SYMBOL_TRADING_METHOD_STATUS_CODE_NRM Bình thường
2 SYMBOL_TRADING_METHOD_STATUS_CODE_NWE Niêm yết mới biên độ đặc biệt
3 SYMBOL_TRADING_METHOD_STATUS_CODE_NWN Niêm yết mới biên độ thường
4 SYMBOL_TRADING_METHOD_STATUS_CODE_SLS Giao dịch đặc biệt sau halt
5 SYMBOL_TRADING_METHOD_STATUS_CODE_SNE Giao dịch đặc biệt
symbolTradingSanctionStatusCode
Tình trạng giao dịch của mã chứng khoán

Enums Code Enums (SymbolTradingSanctionStatusCode) Mô tả
0 SYMBOL_TRADING_SANCTION_STATUS_CODE_UNSPECIFIED Không xác định
1 SYMBOL_TRADING_SANCTION_STATUS_CODE_NRM Bình thường
2 SYMBOL_TRADING_SANCTION_STATUS_CODE_SUS Tạm ngừng
3 SYMBOL_TRADING_SANCTION_STATUS_CODE_DTL Hủy niêm yết chuyển sàn
4 SYMBOL_TRADING_SANCTION_STATUS_CODE_TFR Ngưng giao dịch do hạn chế
tradingSessionID
Mã phiên giao dịch (theo từng mã)

Enums Code Enums (tradingSessionId) Mô tả
0 TRADING_SESSION_ID_UNSPECIFIED Không xác định
1 TRADING_SESSION_ID_01 Load lệnh đầu ngày
2 TRADING_SESSION_ID_10 ATO
5 TRADING_SESSION_ID_21 Sau halt
6 TRADING_SESSION_ID_30 ATC
7 TRADING_SESSION_ID_40 Phiên liên tục
12 TRADING_SESSION_ID_80 PCA mã halt
14 TRADING_SESSION_ID_99 Đóng bảng
resolution
Khung thời gian nến

Enums (resolutio) Mô tả
1 1 phút
3 3 phút
5 5 phút
15 15 phút
30 30 phút
1H 1 giờ
1D 1 ngày

Thông tin kết nối chung
Base URL: wss://ws-openapi.dnse.com.vn
DNSE cung cấp sẵn bộ SDK đã phân tách theo từng loại dữ liệu để khách hàng có thể sẵn sử dụng. Chi tiết xem sample SDKs tại đây.
Định dạng dữ liệu trong SDKs:
msgpack: Tốc độ xử lý nhanh, tiết kiệm băng thông
json: Phổ biến và dễ đọc trong quá trình phát triển
Cơ chế kết nối:
Tất cả mã chứng khoán phải ở định dạng chữ in hoa. VD: ACB, HPG, 41I1G2000.
Một kết nối WebSocket có hiệu lực tối đa 8 giờ, WebSocket Server sẽ chủ động ngắt kết nối sau thời gian này.
Cơ chế để các clients duy trì kết nối ổn định tới WebSocket server DNSE:
WebSocket Server sẽ định kỳ gửi 1 PING message sau mỗi 3 phút.
Mỗi PING message được gửi từ WebSocket đều yêu cầu nhận PONG message phản hồi từ các client trong thời gian tối đa là 1 phút kể từ lúc Server gửi PING. Nếu quá thời hạn 1 phút này, Server sẽ chủ động ngắt kết nối với Client không đáp ứng.
Client được phép gửi PONG message ngay cả khi không nhận được PING từ Server, để chủ động duy trì kết nối. Cách này giúp client giữ kết nối trong các trường hợp PING message bị miss do network issue hoặc các gián đoạn tạm thời khác.
Ví

Các loại dữ liệu thị trường
Thông tin mã chứng khoán (Security Definition)
Cung cấp thông tin về giá trần sàn tham chiếu và trạng thái của mã chứng khoán trong ngày giao dịch. Dữ liệu được hệ thống gửi một lần duy nhất vào 8h sáng đầu ngày giao dịch.

VD Payload nhận được

{
"marketId":"3", // Mã thị trường niêm yết mã chứng khoán
"boardId":"2", // Mã bảng giao dịch
"isin":"VN41I1G20009", // Mã định danh quốc tế
"symbol":"41I1G2000", // Mã chứng khoán
"productGrpId":"4", // Nhóm sản phẩm theo thị trường
"securityGroupId":"4", // Nhóm chứng khoán
"basicPrice":2066.6, // Giá tham chiếu ngày giao dịch
"ceilingPrice":2211.2, // Giá trần ngày giao dịch
"floorPrice":1922.0, // Giá sàn ngày giao dịch
"openInterestQuantity": "24473", // Khối lượng hợp đồng phái sinh mở qua đêm
"securityStatus":"0", // Trạng thái giao dịch của mã chứng khoán
"symbolAdminStatusCode":"3", // Trạng thái quản lý hành chính mã chứng khoán
"symbolTradingMethodStatusCode":"1", // Trạng thái cơ chế giao dịch mã chứng khoán
"symbolTradingSanctionStatusCode":"1" // Tình trạng giao dịch của mã chứng khoán
}

Dữ liệu khớp lệnh (Trade & Trade Extra)
DNSE cung cấp dữ liệu khớp lệnh của một mã chứng khoán qua 2 Function khác nhau: Trade và Trade Extra. Trade Extra có thêm một số thông tin mà DNSE tự tổng hợp thêm (mua bán chủ động, giá khớp trung bình), nếu người dùng không có nhu cầu lấy các thông tin này thì có thể dùng function Trade đơn thuần để tối ưu hơn về tốc độ nhận dữ liệu.

VD Payload nhận được Function Trade

{
"marketId": "3", // Mã thị trường niêm yết mã chứng khoán
"boardId": "2", // Mã bảng giao dịch
"isin": "VN41I1G20009", // Mã định danh quốc tế
"symbol": "41I1G2000", // Mã chứng khoán
"price": 1999.8, // Giá khớp gần nhất
"quantity": 3.0, // Khối lượng khớp gần nhất
"totalVolumeTraded": 84164, // Tổng khối lượng khớp trong ngày
"grossTradeAmount": 16817.93009, // Tổng giá trị giao dịch trong ngày
"highestPrice": 2009.6, // Giá khớp cao nhất trong ngày
"lowestPrice": 1988.8, // Giá khớp thấp nhất trong ngày
"openPrice": 2005.6, // Giá mở cửa
"tradingSessionId": 7 // Mã phiên giao dịch hiện tại
}

VD Payload nhận được Function Trade Extra

{
"marketId": 3, // Mã thị trường niêm yết mã chứng khoán
"boardId": 2, // Mã bảng giao dịch
"isin": "VN41I1G20009", // Mã định danh quốc tế
"symbol": "41I1G2000", // Mã chứng khoán
"price": 1994.0, // Giá khớp gần nhất
"quantity": 1.0, // Khối lượng khớp gần nhất
"side": 0, // Chiều mua, bán chủ động
"avgPrice": 1997.654, // Giá khớp trung bình
"totalVolumeTraded": 104264, // Tổng khối lượng khớp trong ngày
"grossTradeAmount": 20828.33542, // Tổng giá trị giao dịch trong ngày
"highestPrice": 2009.6, // Giá khớp cao nhất trong ngày
"lowestPrice": 1988.8, // Giá khớp thấp nhất trong ngày
"openPrice": 2005.6, // Giá mở cửa
"tradingSessionId": 7 // Mã phiên giao dịch hiện tại
}

Độ sâu thị trường (Quote)
Cung cấp thông tin giá chào mua và chào bán tốt nhất của mã chứng khoán tại bảng giao dịch cụ thể, cập nhật theo thời gian thực trong phiên giao dịch.

Sàn HOSE hỗ trợ 3 mức giá.
Sàn HNX, UPCOM hỗ trợ 10 mức giá.
VD Payload nhận được

{
"marketId": "6", // Mã thị trường niêm yết mã chứng khoán
"boardId": "2", // Mã bảng giao dịch
"isin": "VN000000HPG4", // Mã định danh quốc tế
"symbol": "HPG", // Mã chứng khoán
"bid": [
{
"price": 28.3, // Giá chào mua cao nhất
"quantity": 13330.0 // Tổng khối lượng chào mua tại mức giá này
},
{
"price": 28.25, // Mức giá chào mua tiếp theo
"quantity": 40830.0 // Tổng khối lượng chào mua tại mức giá này
},
{
"price": 28.2, // Mức giá chào mua thấp hơn
"quantity": 50490.0 // Tổng khối lượng chào mua tại mức giá này
}
],
"offer": [
{
"price": 28.35, // Giá chào bán thấp nhất
"quantity": 12660.0 // Tổng khối lượng chào bán tại mức giá tương ứng
},
{
"price": 28.4, // Mức giá chào bán tiếp theo
"quantity": 27530.0 // Tổng khối lượng chào bán tại mức giá tương ứng
},
{
"price": 28.45, // Mức giá chào bán cao hơn
"quantity": 26710.0 // Tổng khối lượng chào bán tại mức giá tương ứng
}
],
"totalOfferQtty": 922230, // Tổng khối lượng chào bán
"totalBidQtty": 643750 // Tổng khối lượng chào mua
}

OHLC
Cung cấp thông tin nến theo khung thời gian thực (open, high, low, close, volume) cho Cổ phiếu (stock), Phái sinh (derivative) và Chỉ số thị trường (index). Áp dụng cho nhiều khung thời gian (resolution).

VD Payload nhận được

Cổ phiếu

{
"time": "1757992500", // Thời gian nến
"open": 30.4, // Giá mở cửa
"high": 30.4, // Giá cao nhất trong nến
"low": 30.25, // Giá thấp nhất trong nến
"close": 30.3, // Giá đóng cửa
"volume": "1398200", // Khối lượng giao dịch
"symbol": "HPG", // Mã chứng khoán
"resolution": "15", // Khung thời gian nến
"lastUpdated": "1757993014", // Thời gian cập nhật lần cuối
"type": "STOCK" // Loại nhóm thị trường
}

Phái sinh

{
"time":"1757991840", // Thời gian nến
"open":1881.2, // Giá mở cửa
"high":1881.2, // Giá cao nhất trong nến
"low":1881.0, // Giá thấp nhất trong nến
"close":1881.2, // Giá đóng cửa
"volume":"12", // Khối lượng giao dịch
"symbol":"VN30F1M", // Mã chứng khoán
"resolution": "1", // Khung thời gian nến
"lastUpdated":"1757991844", // Thời gian cập nhật lần cuối
"type":"DERIVATIVE" // Loại nhóm thị trường
}

Chỉ số index

{
"time": "1757988000", // Thời gian nến
"open": 1696.87, // Giá mở cửa
"high": 1696.87, // Giá cao nhất trong nến
"low": 1686.02, // Giá thấp nhất trong nến
"close": 1686.31, // Giá đóng cửa
"volume": "435873728", // Khối lượng giao dịch
"symbol": "VNINDEX", // Mã chứng khoán
"resolution": "1D", // Khung thời gian nến
"lastUpdated": "1757993070", // Thời gian cập nhật lần cuối
"type": "INDEX" // Loại nhóm thị trường
}

Giá khớp dự kiến (Expected Price)
Cung cấp thông tin giá đóng cửa, giá khớp dự kiến và khối lượng khớp dự kiến của mã chứng khoán trong các phiên giao dịch khớp lệnh định kỳ ATO và ATC.

VD Payload nhận được

{
"marketId": "3", // Mã thị trường niêm yết mã chứng khoán
"boardId": "2", // Mã bảng giao dịch
"symbol": "41I1G1000", // Mã chứng khoán
"ISIN": "VN41I1G10000", // Mã định danh quốc tế
"closePrice": 28.45, // Giá đóng cửa
"expectedTradePrice": 28.45, // Giá dự khớp tại thời điểm xác định
"expectedTradeQuantity": "133780" // Khối lượng dự khớp tại thời điểm xác định
}
