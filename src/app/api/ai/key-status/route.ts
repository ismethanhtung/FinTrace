import { NextResponse } from 'next/server';
import { getGroqApiKey } from '../../../../lib/getGroqKey';
import { getOpenRouterApiKey } from '../../../../lib/getOpenRouterKey';
import { getHuggingFaceKey } from '../../../../lib/getHuggingFaceKey';
import { getAuthenticatedUser } from '../../../../lib/auth/server';
import { hasUserAiKey } from '../../../../lib/server/repositories/userAiKeysRepo';

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

  const auth = await getAuthenticatedUser();
  if (auth) {
    try {
      if (await hasUserAiKey(auth.userId, 'openrouter')) {
        status.openrouter = true;
      }
    } catch {}
    try {
      if (await hasUserAiKey(auth.userId, 'groq')) {
        status.groq = true;
      }
    } catch {}
    try {
      if (await hasUserAiKey(auth.userId, 'huggingface')) {
        status.huggingface = true;
      }
    } catch {}
  }

  return NextResponse.json(status, { status: 200 });
}
