import { NextResponse } from 'next/server';
import { getGroqApiKey } from '../../../../lib/getGroqKey';
import { getOpenRouterApiKey } from '../../../../lib/getOpenRouterKey';

export const runtime = 'nodejs';

type KeyStatus = {
  openrouter: boolean;
  groq: boolean;
};

export async function GET() {
  const status: KeyStatus = {
    openrouter: false,
    groq: false,
  };

  try {
    const key = await getOpenRouterApiKey();
    status.openrouter = Boolean(key?.trim());
  } catch {
    status.openrouter = false;
  }

  try {
    const key = await getGroqApiKey();
    status.groq = Boolean(key?.trim());
  } catch {
    status.groq = false;
  }

  return NextResponse.json(status, { status: 200 });
}
