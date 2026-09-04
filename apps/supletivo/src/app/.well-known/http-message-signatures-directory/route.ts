import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

const JWKS = {
  keys: [
    {
      kty: 'OKP',
      crv: 'Ed25519',
      x: 'UyKhqDygBx2HqqBB_isUzvgz4Qfzzz3kTxAP-QIpxqU',
      kid: 'LvxIKIGSHek7sBRDwZtbkLA5pf-fb5wG1KnPU57n3Ek',
    },
  ],
};

export async function GET() {
  return NextResponse.json(JWKS, {
    status: 200,
    headers: {
      'Content-Type': 'application/http-message-signatures-directory+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
