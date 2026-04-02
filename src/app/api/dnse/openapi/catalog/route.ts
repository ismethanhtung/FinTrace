import { NextResponse } from "next/server";
import {
    DNSE_MARKET_WS_CHANNEL_TEMPLATES,
    DNSE_PRESET_OPERATIONS,
    DNSE_PRIVATE_WS_CHANNELS,
    DNSE_UNDOCUMENTED_SAMPLE_NOTES,
} from "../../../../../lib/dnse/openapiCatalog";

export const runtime = "nodejs";

export async function GET() {
    return NextResponse.json({
        ok: true,
        data: {
            restOperations: DNSE_PRESET_OPERATIONS,
            websocket: {
                baseUrl: "wss://ws-openapi.dnse.com.vn/v1/stream",
                encoding: ["json", "msgpack"],
                channelTemplates: DNSE_MARKET_WS_CHANNEL_TEMPLATES,
                privateChannels: DNSE_PRIVATE_WS_CHANNELS,
            },
            notes: DNSE_UNDOCUMENTED_SAMPLE_NOTES,
        },
    });
}
