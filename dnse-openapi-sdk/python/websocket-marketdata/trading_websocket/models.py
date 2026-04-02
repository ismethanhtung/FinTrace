"""Data models for market data and private channel updates.

This module provides typed data models for all message types:
- Market data: Trade, Quote, OHLC, ExpectedPrice, TradeExtra, SecurityDefinition
- Private channels: Order, Position, AccountUpdate

All models support parsing from both abbreviated (MessagePack) and full (JSON) field names.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple


def parse_timestamp(v: Any) -> Optional[float]:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, dict):
        seconds = v.get("Seconds", v.get("seconds", 0))
        nanos = v.get("Nanos", v.get("nanos", 0))
        return float(seconds) + float(nanos) * 1e-9
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def proto_timestamp_to_str(v: Any) -> str:
    if isinstance(v, dict):
        seconds = v.get("Seconds", v.get("seconds", 0))
        nanos = v.get("Nanos", v.get("nanos", 0))
        dt = datetime.fromtimestamp(seconds + nanos / 1_000_000_000, tz=timezone.utc)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    else:
        return None


@dataclass
class PriceLevel:
    price: float
    quantity: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PriceLevel":
        return cls(
            price=data.get("price"),
            quantity=data.get("qtty")
        )


@dataclass
class Trade:
    marketId: int
    boardId: int
    isin: str
    symbol: str
    price: float
    quantity: int
    totalVolumeTraded: int
    grossTradeAmount: float
    highestPrice: float
    lowestPrice: float
    openPrice: float
    tradingSessionId: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Trade":
        return cls(
            marketId=data.get("market_id"),
            boardId=data.get("board_id"),
            isin=data.get("isin"),
            symbol=data.get("symbol"),
            price=data.get("match_price"),
            quantity=data.get("match_qtty"),
            totalVolumeTraded=data.get("total_volume_traded"),
            grossTradeAmount=data.get("gross_trade_amount"),
            highestPrice=data.get("highest_price"),
            lowestPrice=data.get("lowest_price"),
            openPrice=data.get("open_price"),
            tradingSessionId=data.get("trading_session_id"),
        )


@dataclass
class TradeExtra:
    marketId: int
    boardId: int
    isin: str
    symbol: str
    price: float
    quantity: int
    side: int
    avgPrice: float
    totalVolumeTraded: int
    grossTradeAmount: float
    highestPrice: float
    lowestPrice: float
    openPrice: float
    tradingSessionId: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TradeExtra":
        return cls(
            marketId=data.get("market_id"),
            boardId=data.get("board_id"),
            isin=data.get("isin"),
            symbol=data.get("symbol"),
            price=data.get("match_price"),
            quantity=data.get("match_qtty"),
            side=data.get("side",),
            avgPrice=data.get("avg_price"),
            totalVolumeTraded=data.get("total_volume_traded"),
            grossTradeAmount=data.get("gross_trade_amount"),
            highestPrice=data.get("highest_price"),
            lowestPrice=data.get("lowest_price"),
            openPrice=data.get("open_price"),
            tradingSessionId=data.get("trading_session_id"),
        )


@dataclass
class MarketIndex:
    index_name: str
    changed_ratio: float
    changed_value: float

    fluctuation_steadiness_issue_count: int
    fluctuation_down_issue_count: int
    fluctuation_up_issue_count: int
    fluctuation_lower_limit_issue_count: int
    fluctuation_upper_limit_issue_count: int

    fluctuation_down_issue_volume: int
    fluctuation_up_issue_volume: int
    fluctuation_steadiness_issue_volume: int

    currency_code: str
    index_type_code: str

    lowest_value_indexes: float
    highest_value_indexes: float
    prior_value_indexes: float
    value_indexes: float

    contauct_acc_trd_val: float
    contauct_acc_trd_vol: int
    blk_trd_acc_trd_val: float
    blk_trd_acc_trd_vol: int

    gross_trade_amount: float
    total_volume_traded: int

    market_index_class: int
    market_id: int
    trading_session_id: int

    transact_time: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MarketIndex":
        return cls(
            index_name=data.get("index_name"),
            changed_ratio=data.get("changed_ratio"),
            changed_value=data.get("changed_value"),
            fluctuation_steadiness_issue_count=data.get("fluctuation_steadiness_issue_count"),
            fluctuation_down_issue_count=data.get("fluctuation_down_issue_count"),
            fluctuation_up_issue_count=data.get("fluctuation_up_issue_count"),
            fluctuation_lower_limit_issue_count=data.get("fluctuation_lower_limit_issue_count"),
            fluctuation_upper_limit_issue_count=data.get("fluctuation_upper_limit_issue_count"),
            fluctuation_down_issue_volume=data.get("fluctuation_down_issue_volume"),
            fluctuation_up_issue_volume=data.get("fluctuation_up_issue_volume"),
            fluctuation_steadiness_issue_volume=data.get("fluctuation_steadiness_issue_volume"),
            currency_code=data.get("currency_code"),
            index_type_code=data.get("index_type_code"),
            lowest_value_indexes=data.get("lowest_value_indexes"),
            highest_value_indexes=data.get("highest_value_indexes"),
            prior_value_indexes=data.get("prior_value_indexes"),
            value_indexes=data.get("value_indexes"),
            contauct_acc_trd_val=data.get("contauct_acc_trd_val"),
            contauct_acc_trd_vol=data.get("contauct_acc_trd_vol"),
            blk_trd_acc_trd_val=data.get("blk_trd_acc_trd_val"),
            blk_trd_acc_trd_vol=data.get("blk_trd_acc_trd_vol"),
            gross_trade_amount=data.get("gross_trade_amount"),
            total_volume_traded=data.get("total_volume_traded"),
            market_index_class=data.get("market_index_class"),
            market_id=data.get("market_id"),
            trading_session_id=data.get("trading_session_id"),
            transact_time=proto_timestamp_to_str(data.get("transact_time")),
        )


@dataclass
class ExpectedPrice:
    marketId: int
    boardId: int
    isin: str
    symbol: str
    closePrice: float
    expectedTradePrice: float
    expectedTradeQuantity: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExpectedPrice":
        return cls(
            marketId=data.get("market_id"),
            boardId=data.get("board_id"),
            isin=data.get("isin"),
            symbol=data.get("symbol"),
            closePrice=data.get("close_price"),
            expectedTradePrice=data.get("expected_trade_price"),
            expectedTradeQuantity=data.get("expected_trade_quantity")
        )


@dataclass
class SecurityDefinition:
    marketId: int
    boardId: int
    symbol: str
    isin: str
    productGrpId: int
    securityGroupId: int
    basicPrice: float
    ceilingPrice: float
    floorPrice: float
    openInterestQuantity: int
    securityStatus: int
    symbolAdminStatusCode: int
    symbolTradingMethodStatusCode: int
    symbolTradingSanctionStatusCode: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SecurityDefinition":
        return cls(
            symbol=data.get("symbol"),
            marketId=data.get("market_id"),
            boardId=data.get("board_id"),
            isin=data.get("isin"),
            productGrpId=data.get("product_grp_id"),
            securityGroupId=data.get("security_group_id"),
            basicPrice=data.get("basic_price",),
            ceilingPrice=data.get("ceiling_price"),
            floorPrice=data.get("floor_price",),
            openInterestQuantity=data.get("open_interest_quantity"),
            securityStatus=data.get("security_status"),
            symbolAdminStatusCode=data.get("symbol_admin_status_code"),
            symbolTradingMethodStatusCode=data.get("symbol_trading_method_status_code"),
            symbolTradingSanctionStatusCode=data.get("symbol_trading_sanction_status_code")
        )


@dataclass
class Quote:
    marketId: int
    boardId: int
    symbol: str
    isin: str
    bid: List[PriceLevel]
    offer: List[PriceLevel]
    totalOfferQtty: float
    totalBidQtty: float

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Quote":
        # Parse bids array
        bids_data = data.get("bid") or []
        bids = [PriceLevel.from_dict(level) for level in bids_data]

        # Parse asks array
        offer_data = data.get("offer") or []
        offers = [PriceLevel.from_dict(level) for level in offer_data]

        return cls(
            symbol=data.get("symbol"),
            marketId=data.get("market_id"),
            boardId=data.get("board_id"),
            isin=data.get("isin", ""),
            bid=bids,
            offer=offers,
            totalOfferQtty=data.get("total_offer_qtty"),
            totalBidQtty=data.get("total_bid_qtty"),
        )

    @property
    def best_bid(self) -> Optional[Tuple[float, int]]:
        if not self.bid:
            return None
        return self.bid[0].price, self.bid[0].quantity

    @property
    def best_ask(self) -> Optional[Tuple[float, int]]:
        if not self.offer:
            return None
        return self.offer[0].price, self.offer[0].quantity

    @property
    def spread(self) -> Optional[float]:
        bid = self.best_bid
        offer = self.best_ask
        if bid and offer:
            return offer[0] - bid[0]
        return None


@dataclass
class Ohlc:
    symbol: str
    resolution: int
    open: float
    high: float
    low: float
    close: float
    volume: int
    time: int
    lastUpdated: int
    type: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Ohlc":
        # Helper function to round to 2 decimal places (standard rounding)
        def round_value(value) -> float:
            if value is None:
                return 0.0
            return round(float(value), 2)

        return cls(
            symbol=data.get("symbol"),
            resolution=data.get("resolution"),
            open=round_value(data.get("open")),
            high=round_value(data.get("high")),
            low=round_value(data.get("low")),
            close=round_value(data.get("close")),
            volume=data.get("volume"),
            time=data.get("time"),
            type=data.get("type"),
            lastUpdated=data.get("lastUpdated")
        )


@dataclass
class Order:
    order_id: str
    symbol: str
    side: str
    order_type: str
    status: str
    quantity: int
    filled_quantity: int
    price: Optional[Decimal]
    average_fill_price: Optional[Decimal]
    timestamp: datetime

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Order":
        return cls(
            order_id=data.get("oid") or data.get("order_id"),
            symbol=data.get("S") or data.get("symbol"),
            side=data.get("sd") or data.get("side"),
            order_type=data.get("ot") or data.get("order_type"),
            status=data.get("st") or data.get("status"),
            quantity=data.get("q") or data.get("quantity"),
            filled_quantity=data.get("fq") or data.get("filled_quantity"),
            price=Decimal(str(data["p"])) if (data.get("p") or data.get("price")) else None,
            average_fill_price=Decimal(str(data["ap"])) if (data.get("ap") or data.get("average_fill_price")) else None,
            timestamp=datetime.fromtimestamp((data.get("t") or data.get("timestamp")) / 1000)
        )


@dataclass
class Position:
    symbol: str
    quantity: int
    average_price: Decimal
    market_value: Decimal
    cost_basis: Decimal
    unrealized_pl: Decimal
    unrealized_pl_percent: Decimal
    timestamp: datetime

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Position":
        """Parse position from message data.

        Args:
            data: Raw message dict with either abbreviated or full field names

        Returns:
            Position instance

        Example:
            >>> Position.from_dict({"S": "AAPL", "q": 100, "ap": "150.00", ...})
        """
        return cls(
            symbol=data.get("S") or data.get("symbol"),
            quantity=data.get("q") or data.get("quantity"),
            average_price=Decimal(str(data.get("ap") or data.get("average_price"))),
            market_value=Decimal(str(data.get("mv") or data.get("market_value"))),
            cost_basis=Decimal(str(data.get("cb") or data.get("cost_basis"))),
            unrealized_pl=Decimal(str(data.get("upl") or data.get("unrealized_pl"))),
            unrealized_pl_percent=Decimal(str(data.get("uplp") or data.get("unrealized_pl_percent"))),
            timestamp=datetime.fromtimestamp((data.get("t") or data.get("timestamp")) / 1000)
        )


@dataclass
class AccountUpdate:
    cash: Decimal
    buying_power: Decimal
    portfolio_value: Decimal
    equity: Decimal
    timestamp: datetime

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AccountUpdate":
        """Parse account update from message data.

        Args:
            data: Raw message dict with either abbreviated or full field names

        Returns:
            AccountUpdate instance

        Example:
            >>> AccountUpdate.from_dict({"c": "10000.00", "bp": "20000.00", ...})
        """
        return cls(
            cash=Decimal(str(data.get("c") or data.get("cash"))),
            buying_power=Decimal(str(data.get("bp") or data.get("buying_power"))),
            portfolio_value=Decimal(str(data.get("pv") or data.get("portfolio_value"))),
            equity=Decimal(str(data.get("eq") or data.get("equity"))),
            timestamp=datetime.fromtimestamp((data.get("t") or data.get("timestamp")) / 1000)
        )
