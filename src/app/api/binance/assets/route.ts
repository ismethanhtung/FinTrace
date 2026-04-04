import { NextResponse } from "next/server";

const BINANCE_ASSET_CATALOG_URL =
    "https://www.binance.com/bapi/asset/v2/public/asset/asset/get-all-asset";
const REVALIDATE_SECONDS = 60 * 60 * 6;

type BinanceAssetCatalogResponse = {
    code?: string;
    data?: BinanceAssetCatalogRow[];
};

type BinanceAssetCatalogRow = {
    id?: string;
    assetCode?: string;
    assetName?: string;
    unit?: string;
    commissionRate?: number;
    freeAuditWithdrawAmt?: number;
    freeUserChargeAmount?: number;
    createTime?: number;
    test?: number;
    gas?: number;
    isLegalMoney?: boolean;
    reconciliationAmount?: number;
    seqNum?: string;
    chineseName?: string;
    cnLink?: string;
    enLink?: string;
    logoUrl?: string;
    fullLogoUrl?: string;
    supportMarket?: string[] | null;
    feeReferenceAsset?: string;
    feeRate?: number | null;
    feeDigit?: number;
    assetDigit?: number;
    trading?: boolean;
    tags?: string[] | null;
    plateType?: string;
    etf?: boolean;
    isLedgerOnly?: boolean;
    delisted?: boolean;
    preDelist?: boolean;
    pdTradeDeadline?: number | null;
    pdDepositDeadline?: number | null;
    pdAnnounceUrl?: string | null;
    tagBits?: string;
    oldAssetCode?: string | null;
    newAssetCode?: string | null;
    swapTag?: string;
    swapAnnounceUrl?: string | null;
};

type BinanceAssetCatalogPayload = {
    id: string;
    assetCode: string;
    assetName: string;
    unit: string;
    commissionRate: number;
    freeAuditWithdrawAmt: number;
    chineseName: string;
    cnLink: string;
    enLink: string;
    createTime: number;
    test: number;
    gas: number;
    isLegalMoney: boolean;
    reconciliationAmount: number;
    seqNum: string;
    logoUrl: string;
    fullLogoUrl: string;
    supportMarket: string[] | null;
    feeReferenceAsset: string;
    feeRate: number | null;
    feeDigit: number;
    assetDigit: number;
    trading: boolean;
    tags: string[];
    plateType: string;
    etf: boolean;
    isLedgerOnly: boolean;
    delisted: boolean;
    preDelist: boolean;
    tagBits: string;
    freeUserChargeAmount: number;
    pdTradeDeadline: number | null;
    pdDepositDeadline: number | null;
    pdAnnounceUrl: string | null;
    oldAssetCode: string | null;
    newAssetCode: string | null;
    swapTag: string;
    swapAnnounceUrl: string | null;
};

function cleanTagList(tags: string[] | null | undefined): string[] {
    if (!Array.isArray(tags)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const rawTag of tags) {
        if (typeof rawTag !== "string") continue;
        const value = rawTag.trim();
        if (!value) continue;
        const key = value.toUpperCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(value);
    }
    return out;
}

function toPayload(
    rows: BinanceAssetCatalogRow[] | undefined,
): BinanceAssetCatalogPayload[] {
    if (!Array.isArray(rows)) return [];

    return rows
        .filter((row) => Boolean(row.assetCode))
        .map((row) => ({
            id: String(row.id ?? ""),
            assetCode: String(row.assetCode ?? "").trim().toUpperCase(),
            assetName: String(row.assetName ?? "").trim(),
            unit: String(row.unit ?? "").trim(),
            commissionRate: Number(row.commissionRate ?? 0),
            freeAuditWithdrawAmt: Number(row.freeAuditWithdrawAmt ?? 0),
            chineseName: String(row.chineseName ?? "").trim(),
            cnLink: String(row.cnLink ?? "").trim(),
            enLink: String(row.enLink ?? "").trim(),
            createTime: Number.isFinite(row.createTime)
                ? Number(row.createTime)
                : 0,
            test: Number.isFinite(row.test) ? Number(row.test) : 0,
            gas: Number(row.gas ?? 0),
            isLegalMoney: Boolean(row.isLegalMoney),
            reconciliationAmount: Number(row.reconciliationAmount ?? 0),
            seqNum: String(row.seqNum ?? "").trim(),
            logoUrl: String(row.logoUrl ?? "").trim(),
            fullLogoUrl: String(row.fullLogoUrl ?? "").trim(),
            supportMarket: Array.isArray(row.supportMarket)
                ? row.supportMarket
                      .map((v) => String(v ?? "").trim())
                      .filter(Boolean)
                : null,
            feeReferenceAsset: String(row.feeReferenceAsset ?? "").trim(),
            feeRate:
                row.feeRate == null || Number.isNaN(Number(row.feeRate))
                    ? null
                    : Number(row.feeRate),
            feeDigit: Number.isFinite(row.feeDigit) ? Number(row.feeDigit) : 0,
            assetDigit: Number.isFinite(row.assetDigit)
                ? Number(row.assetDigit)
                : 0,
            trading: Boolean(row.trading),
            tags: cleanTagList(row.tags),
            plateType: String(row.plateType ?? "").trim().toUpperCase(),
            etf: Boolean(row.etf),
            isLedgerOnly: Boolean(row.isLedgerOnly),
            delisted: Boolean(row.delisted),
            preDelist: Boolean(row.preDelist),
            tagBits: String(row.tagBits ?? "").trim(),
            freeUserChargeAmount: Number(row.freeUserChargeAmount ?? 0),
            pdTradeDeadline:
                row.pdTradeDeadline == null
                    ? null
                    : Number(row.pdTradeDeadline),
            pdDepositDeadline:
                row.pdDepositDeadline == null
                    ? null
                    : Number(row.pdDepositDeadline),
            pdAnnounceUrl:
                row.pdAnnounceUrl == null ? null : String(row.pdAnnounceUrl),
            oldAssetCode:
                row.oldAssetCode == null ? null : String(row.oldAssetCode),
            newAssetCode:
                row.newAssetCode == null ? null : String(row.newAssetCode),
            swapTag: String(row.swapTag ?? "").trim(),
            swapAnnounceUrl:
                row.swapAnnounceUrl == null
                    ? null
                    : String(row.swapAnnounceUrl),
        }));
}

export async function GET() {
    try {
        const response = await fetch(BINANCE_ASSET_CATALOG_URL, {
            headers: {
                Accept: "application/json",
            },
            next: { revalidate: REVALIDATE_SECONDS },
        });

        if (!response.ok) {
            throw new Error(`Binance asset catalog API error: ${response.status}`);
        }

        const json = (await response.json()) as BinanceAssetCatalogResponse;
        const data = toPayload(json.data);

        return NextResponse.json(data, {
            headers: {
                "Cache-Control": `s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS}`,
            },
        });
    } catch (error) {
        console.error(
            "[binanceAssetsRoute] Failed to fetch Binance asset catalog:",
            error,
        );
        return NextResponse.json(
            { error: "Failed to load Binance asset catalog" },
            { status: 502 },
        );
    }
}
