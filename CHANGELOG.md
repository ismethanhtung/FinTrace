# FinTrace Changelog

All notable changes to the FinTrace project will be documented in this file.

## [Unreleased]
### Added
- **Real Market Flow Intelligence (Flow Tab):** Replaced all pseudo-data with 100% verified real-time data from Binance Futures public APIs.
  - **Dòng tiền Taker:** Phân tách khối lượng mua/bán từ lệnh thị trường (Taker Buy/Sell Ratio).
  - **Nợ Ký Quỹ (Open Interest):** Theo dõi gia tăng/giảm thiểu nợ ký quỹ thực tế.
  - **Tỷ lệ Long/Short:** API truy xuất trực tiếp tỷ lệ vị thế của các tài khoản trên Binance Futures.
  - **Order Distribution:** Algorithmically categorizes the last 1000 trades into Large/Medium/Small buckets using dynamic percentile calculation.
- **Enhanced Flow Dashboard Layout:** Redesigned the Flow panel with a high-density 2-column grid layout, allowing simultaneous viewing of Flow Donuts, Data Tables, and Sentiment Area charts.
- **AI Executive Report (Summary Tab):** A new module embedded directly in the Summary panel...

### Changed
- **Removed Fake Technical Oscillators:** Deleted mocked data such as static RSI and MACD. Replaced with exact mathematically calculated 24h real-time metrics including "Est. VWAP", "Volatility Spread %", "Distance to 24H High", and "Distance to 24H Low".
- **Enhanced Chat News Linking:** Instead of heavily styled buttons, AI-generated news citations now render as subtle, highly professional underlined inline links with a miniature external-link arrow icon.
- **RSS News Pipeline:** Upgraded `/api/news` backend scraper to not only extract headlines but also deeply parse, detoxify (Regex clean), and inject the 'description' snippet from Google RSS bodies, granting the AI true reading-comprehension context.

### Fixed
- **Deleted `newsService.ts` Module:** Fixed a Next.js compilation crash caused by accidentally clearing the `newsService.ts` module by fully regenerating its source code.

## [Previous Milestones]
- **Market Data Websockets:** Hooked up Binance API Streams for live order books, 1s tick trades, and K-line historical charts.
- **Workspace Architecture:** Established a dense, Terminal-like structural workspace with dynamically resizable dock panels.
- **Client-Side AI:** Established connection with OpenRouter AI supporting multi-turn saving, streaming, and infinite storage.
