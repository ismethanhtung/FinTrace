export interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  volume24h: string;
  sparkline: number[];
}

export const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 64231.50,
    change: 1240.20,
    changePercent: 1.96,
    marketCap: '$1.2T',
    volume24h: '$35.2B',
    sparkline: [62000, 62500, 61800, 63000, 63500, 64231],
  },
  {
    id: '2',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3452.12,
    change: -45.30,
    changePercent: -1.29,
    marketCap: '$415B',
    volume24h: '$12.8B',
    sparkline: [3500, 3550, 3520, 3480, 3460, 3452],
  },
  {
    id: '3',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 189.45,
    change: 2.15,
    changePercent: 1.15,
    marketCap: '$2.9T',
    volume24h: '$8.2B',
    sparkline: [185, 186, 187, 188, 189, 189.45],
  },
  {
    id: '4',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    price: 875.20,
    change: 15.40,
    changePercent: 1.79,
    marketCap: '$2.1T',
    volume24h: '$22.5B',
    sparkline: [850, 860, 855, 865, 870, 875],
  },
  {
    id: '5',
    symbol: 'SOL',
    name: 'Solana',
    price: 145.67,
    change: 8.20,
    changePercent: 5.96,
    marketCap: '$64B',
    volume24h: '$4.2B',
    sparkline: [130, 135, 132, 140, 142, 145.67],
  },
  {
    id: '6',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 175.22,
    change: -3.10,
    changePercent: -1.74,
    marketCap: '$550B',
    volume24h: '$15.1B',
    sparkline: [180, 178, 179, 177, 176, 175.22],
  },
];

export const CHART_DATA = [
  { time: '09:00', value: 62100 },
  { time: '10:00', value: 62400 },
  { time: '11:00', value: 62200 },
  { time: '12:00', value: 62800 },
  { time: '13:00', value: 63100 },
  { time: '14:00', value: 62900 },
  { time: '15:00', value: 63500 },
  { time: '16:00', value: 64231 },
];
