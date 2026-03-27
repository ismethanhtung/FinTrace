import { NextResponse } from 'next/server';

export type ApiErrorShape = {
  providerId: string;
  status: number;
  error: string;
  code?: string;
  details?: string;
};

export function apiError(payload: ApiErrorShape) {
  return NextResponse.json(
    {
      providerId: payload.providerId,
      error: payload.error,
      code: payload.code,
      details: payload.details,
    },
    { status: payload.status },
  );
}

