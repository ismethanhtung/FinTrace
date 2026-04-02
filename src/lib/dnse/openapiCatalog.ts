export type DnseInputField = {
    key: string;
    label: string;
    required?: boolean;
    type?: "string" | "number" | "boolean" | "json";
    placeholder?: string;
    description?: string;
};

export type DnsePresetOperation = {
    key: string;
    group: "Account" | "Order" | "Market Data" | "Auth";
    name: string;
    description: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    pathTemplate: string;
    requiresTradingToken?: boolean;
    pathFields?: DnseInputField[];
    queryFields?: DnseInputField[];
    bodyFields?: DnseInputField[];
    samplePath?: Record<string, string>;
    sampleQuery?: Record<string, string | number | boolean>;
    sampleBody?: Record<string, unknown>;
};

export const DNSE_PRESET_OPERATIONS: DnsePresetOperation[] = [
    {
        key: "getAccounts",
        group: "Account",
        name: "Get Accounts",
        description: "Lấy danh sách tài khoản.",
        method: "GET",
        pathTemplate: "/accounts",
    },
    {
        key: "getBalances",
        group: "Account",
        name: "Get Balances",
        description: "Lấy số dư theo accountNo.",
        method: "GET",
        pathTemplate: "/accounts/{accountNo}/balances",
        pathFields: [{ key: "accountNo", label: "Account No", required: true }],
        samplePath: { accountNo: "0001000115" },
    },
    {
        key: "getLoanPackages",
        group: "Account",
        name: "Get Loan Packages",
        description: "Lấy danh sách gói vay ký quỹ.",
        method: "GET",
        pathTemplate: "/accounts/{accountNo}/loan-packages",
        pathFields: [{ key: "accountNo", label: "Account No", required: true }],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
            { key: "symbol", label: "Symbol", placeholder: "HPG" },
        ],
        samplePath: { accountNo: "0001000115" },
        sampleQuery: { marketType: "STOCK", symbol: "HPG" },
    },
    {
        key: "getPositions",
        group: "Account",
        name: "Get Positions",
        description: "Lấy vị thế theo accountNo + marketType.",
        method: "GET",
        pathTemplate: "/accounts/{accountNo}/positions",
        pathFields: [{ key: "accountNo", label: "Account No", required: true }],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
        ],
        samplePath: { accountNo: "0001000115" },
        sampleQuery: { marketType: "DERIVATIVE" },
    },
    {
        key: "getPositionById",
        group: "Account",
        name: "Get Position By ID",
        description: "Lấy chi tiết vị thế theo positionId.",
        method: "GET",
        pathTemplate: "/accounts/positions/{positionId}",
        pathFields: [{ key: "positionId", label: "Position ID", required: true }],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
        ],
        samplePath: { positionId: "12345" },
        sampleQuery: { marketType: "DERIVATIVE" },
    },
    {
        key: "closePosition",
        group: "Account",
        name: "Close Position",
        description: "Đóng vị thế phái sinh.",
        method: "POST",
        pathTemplate: "/accounts/{accountNo}/positions/{positionId}/close",
        requiresTradingToken: true,
        pathFields: [
            { key: "accountNo", label: "Account No", required: true },
            { key: "positionId", label: "Position ID", required: true },
        ],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "DERIVATIVE",
            },
        ],
        bodyFields: [
            {
                key: "closeType",
                label: "Close Type",
                required: false,
                placeholder: "optional",
            },
            {
                key: "quantity",
                label: "Quantity",
                type: "number",
                required: false,
            },
        ],
        samplePath: { accountNo: "0001000115", positionId: "12345" },
        sampleQuery: { marketType: "DERIVATIVE" },
        sampleBody: {},
    },
    {
        key: "getOrders",
        group: "Order",
        name: "Get Orders",
        description: "Lấy danh sách lệnh hiện tại.",
        method: "GET",
        pathTemplate: "/accounts/{accountNo}/orders",
        pathFields: [{ key: "accountNo", label: "Account No", required: true }],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
            {
                key: "orderCategory",
                label: "Order Category",
                placeholder: "NORMAL",
            },
        ],
        samplePath: { accountNo: "0001000115" },
        sampleQuery: { marketType: "STOCK", orderCategory: "NORMAL" },
    },
    {
        key: "getOrderDetail",
        group: "Order",
        name: "Get Order Detail",
        description: "Lấy chi tiết lệnh.",
        method: "GET",
        pathTemplate: "/accounts/{accountNo}/orders/{orderId}",
        pathFields: [
            { key: "accountNo", label: "Account No", required: true },
            { key: "orderId", label: "Order ID", required: true },
        ],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
            {
                key: "orderCategory",
                label: "Order Category",
                placeholder: "NORMAL",
            },
        ],
        samplePath: { accountNo: "0001000115", orderId: "801" },
        sampleQuery: { marketType: "STOCK", orderCategory: "NORMAL" },
    },
    {
        key: "getOrderHistory",
        group: "Order",
        name: "Get Order History",
        description: "Lấy lịch sử lệnh theo khoảng thời gian.",
        method: "GET",
        pathTemplate: "/accounts/{accountNo}/orders/history",
        pathFields: [{ key: "accountNo", label: "Account No", required: true }],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
            {
                key: "orderCategory",
                label: "Order Category",
                placeholder: "NORMAL",
            },
            { key: "from", label: "From", placeholder: "2025-12-01" },
            { key: "to", label: "To", placeholder: "2025-12-09" },
            {
                key: "pageSize",
                label: "Page Size",
                type: "number",
                placeholder: "20",
            },
            {
                key: "pageIndex",
                label: "Page Index",
                type: "number",
                placeholder: "1",
            },
        ],
        samplePath: { accountNo: "0001000115" },
        sampleQuery: {
            marketType: "STOCK",
            orderCategory: "NORMAL",
            from: "2025-12-01",
            to: "2025-12-09",
            pageSize: 20,
            pageIndex: 1,
        },
    },
    {
        key: "postOrder",
        group: "Order",
        name: "Post Order",
        description: "Đặt lệnh mới.",
        method: "POST",
        pathTemplate: "/accounts/orders",
        requiresTradingToken: true,
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
            {
                key: "orderCategory",
                label: "Order Category",
                placeholder: "NORMAL",
            },
        ],
        bodyFields: [
            { key: "accountNo", label: "Account No", required: true },
            { key: "symbol", label: "Symbol", required: true },
            { key: "side", label: "Side", required: true, placeholder: "BUY | SELL" },
            {
                key: "orderType",
                label: "Order Type",
                required: true,
                placeholder: "LO | ATO | ATC ...",
            },
            { key: "price", label: "Price", type: "number", required: false },
            { key: "quantity", label: "Quantity", type: "number", required: true },
            {
                key: "loanPackageId",
                label: "Loan Package ID",
                type: "number",
                required: false,
            },
        ],
        sampleQuery: { marketType: "STOCK", orderCategory: "NORMAL" },
        sampleBody: {
            accountNo: "0001000115",
            symbol: "HPG",
            side: "BUY",
            orderType: "LO",
            price: 25950,
            quantity: 100,
            loanPackageId: 2396,
        },
    },
    {
        key: "putOrder",
        group: "Order",
        name: "Put Order",
        description: "Sửa lệnh.",
        method: "PUT",
        pathTemplate: "/accounts/{accountNo}/orders/{orderId}",
        requiresTradingToken: true,
        pathFields: [
            { key: "accountNo", label: "Account No", required: true },
            { key: "orderId", label: "Order ID", required: true },
        ],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
            {
                key: "orderCategory",
                label: "Order Category",
                placeholder: "NORMAL",
            },
        ],
        bodyFields: [
            { key: "price", label: "Price", type: "number", required: true },
            { key: "quantity", label: "Quantity", type: "number", required: true },
        ],
        samplePath: { accountNo: "0001000115", orderId: "511" },
        sampleQuery: { marketType: "STOCK", orderCategory: "NORMAL" },
        sampleBody: { price: 12500, quantity: 100 },
    },
    {
        key: "cancelOrder",
        group: "Order",
        name: "Cancel Order",
        description: "Hủy lệnh.",
        method: "DELETE",
        pathTemplate: "/accounts/{accountNo}/orders/{orderId}",
        requiresTradingToken: true,
        pathFields: [
            { key: "accountNo", label: "Account No", required: true },
            { key: "orderId", label: "Order ID", required: true },
        ],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
            {
                key: "orderCategory",
                label: "Order Category",
                placeholder: "NORMAL",
            },
        ],
        samplePath: { accountNo: "0001000115", orderId: "801" },
        sampleQuery: { marketType: "STOCK", orderCategory: "NORMAL" },
    },
    {
        key: "getPpse",
        group: "Order",
        name: "Get PPSE",
        description: "Lấy PPSE theo accountNo/symbol/price/loanPackageId.",
        method: "GET",
        pathTemplate: "/accounts/{accountNo}/ppse",
        pathFields: [{ key: "accountNo", label: "Account No", required: true }],
        queryFields: [
            {
                key: "marketType",
                label: "Market Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE",
            },
            { key: "symbol", label: "Symbol", required: true, placeholder: "HPG" },
            { key: "price", label: "Price", required: true, type: "number" },
            {
                key: "loanPackageId",
                label: "Loan Package ID",
                required: true,
                type: "number",
            },
        ],
        samplePath: { accountNo: "0001000115" },
        sampleQuery: {
            marketType: "STOCK",
            symbol: "HPG",
            price: 26450,
            loanPackageId: 2396,
        },
    },
    {
        key: "getSecurityDefinition",
        group: "Market Data",
        name: "Get Security Definition",
        description: "Lấy thông tin cơ bản mã (REST).",
        method: "GET",
        pathTemplate: "/price/{symbol}/secdef",
        pathFields: [{ key: "symbol", label: "Symbol", required: true, placeholder: "HPG" }],
        queryFields: [{ key: "boardId", label: "Board ID", placeholder: "G1" }],
        samplePath: { symbol: "HPG" },
        sampleQuery: { boardId: "G1" },
    },
    {
        key: "getTrades",
        group: "Market Data",
        name: "Get Trades",
        description: "Lấy danh sách lịch sử khớp lệnh của mã.",
        method: "GET",
        pathTemplate: "/price/{symbol}/trades",
        pathFields: [{ key: "symbol", label: "Symbol", required: true, placeholder: "HPG" }],
        queryFields: [
            { key: "boardId", label: "Board ID", placeholder: "G1" },
            { key: "from", label: "From", placeholder: "2026-04-01T09:00:00Z" },
            { key: "to", label: "To", placeholder: "2026-04-01T15:00:00Z" },
            { key: "limit", label: "Limit", type: "number", placeholder: "100" },
            { key: "order", label: "Order", placeholder: "asc | desc" },
            { key: "nextPageToken", label: "Next Page Token" },
        ],
        samplePath: { symbol: "HPG" },
        sampleQuery: {
            boardId: "G1",
            limit: 100,
            order: "desc",
        },
    },
    {
        key: "getLatestTrade",
        group: "Market Data",
        name: "Get Latest Trade",
        description: "Lấy giao dịch khớp gần nhất.",
        method: "GET",
        pathTemplate: "/price/{symbol}/trades/latest",
        pathFields: [{ key: "symbol", label: "Symbol", required: true, placeholder: "HPG" }],
        queryFields: [{ key: "boardId", label: "Board ID", placeholder: "G1" }],
        samplePath: { symbol: "HPG" },
        sampleQuery: { boardId: "G1" },
    },
    {
        key: "getInstruments",
        group: "Market Data",
        name: "Get Instruments",
        description: "Lấy danh sách mã theo filter instruments.",
        method: "GET",
        pathTemplate: "/instruments",
        queryFields: [
            { key: "symbol", label: "Symbols", placeholder: "SSI,SHS,ACB" },
            { key: "marketId", label: "Market ID", placeholder: "6" },
            {
                key: "securityGroupId",
                label: "Security Group ID",
                placeholder: "7",
            },
            { key: "indexName", label: "Index Name", placeholder: "VN30" },
            { key: "limit", label: "Limit", type: "number", placeholder: "100" },
            { key: "page", label: "Page", type: "number", placeholder: "1" },
        ],
        sampleQuery: {
            symbol: "SSI,SHS,ACB",
            limit: 100,
            page: 1,
        },
    },
    {
        key: "getOhlc",
        group: "Market Data",
        name: "Get OHLC",
        description: "Lấy nến OHLC (REST).",
        method: "GET",
        pathTemplate: "/price/ohlc",
        queryFields: [
            {
                key: "type",
                label: "Type",
                required: true,
                placeholder: "STOCK | DERIVATIVE | INDEX",
            },
            { key: "symbol", label: "Symbol", required: true, placeholder: "HPG" },
            { key: "resolution", label: "Resolution", required: true, placeholder: "1" },
            { key: "from", label: "From (unix)", type: "number", required: true },
            { key: "to", label: "To (unix)", type: "number", required: true },
        ],
        sampleQuery: {
            type: "STOCK",
            symbol: "HPG",
            resolution: "1",
            from: 1735689600,
            to: 1735776000,
        },
    },
    {
        key: "sendEmailOtp",
        group: "Auth",
        name: "Send Email OTP",
        description: "Gửi mã OTP về email đã đăng ký.",
        method: "POST",
        pathTemplate: "/registration/send-email-otp",
        sampleBody: {},
    },
    {
        key: "createTradingToken",
        group: "Auth",
        name: "Create Trading Token",
        description: "Xác thực OTP để lấy trading token.",
        method: "POST",
        pathTemplate: "/registration/trading-token",
        bodyFields: [
            { key: "otpType", label: "OTP Type", required: true, placeholder: "email_otp | smart_otp" },
            { key: "passcode", label: "Passcode", required: true, placeholder: "123456" },
        ],
        sampleBody: {
            otpType: "email_otp",
            passcode: "123456",
        },
    },
];

export const DNSE_MARKET_WS_CHANNEL_TEMPLATES = [
    "security_definition.{board}.json",
    "tick.{board}.json",
    "tick_extra.{board}.json",
    "top_price.{board}.json",
    "expected_price.{board}.json",
    "ohlc.{resolution}.json",
    "market_index.{marketIndex}.json",
] as const;

export const DNSE_PRIVATE_WS_CHANNELS = [
    "orders",
    "positions",
    "account",
] as const;

export const DNSE_UNDOCUMENTED_SAMPLE_NOTES = [
    "Sample `cancel_deal.js` trong SDK đang gọi `closeDeal(...)` nhưng method này chưa có trong DNSEClient hiện tại.",
    "Nếu cần test endpoint ngoài preset, dùng Custom REST mode để gọi path/method bất kỳ.",
] as const;

export function getDnsePresetOperation(
    key: string,
): DnsePresetOperation | undefined {
    return DNSE_PRESET_OPERATIONS.find((op) => op.key === key);
}
