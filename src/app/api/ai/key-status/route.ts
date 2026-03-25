import { NextResponse } from 'next/server';
import { getGroqApiKey } from '../../../../lib/getGroqKey';
import { getOpenRouterApiKey } from '../../../../lib/getOpenRouterKey';
import { getHuggingFaceKey } from '../../../../lib/getHuggingFaceKey';

export const runtime = 'nodejs';

type KeyStatus = {
  openrouter: boolean;
  groq: boolean;
  huggingface: boolean;
};

export async function GET() {
  const status: KeyStatus = {
    openrouter: false,
    groq: false,
    huggingface: false,
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

  try {
    const key = await getHuggingFaceKey();
    status.huggingface = Boolean(key?.trim());
  } catch {
    status.huggingface = false;
  }

  return NextResponse.json(status, { status: 200 });
}
