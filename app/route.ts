import { NextResponse } from 'next/server';

// Handle stray POSTs (e.g., from server actions over proxy) at app root
export async function POST() {
  return new NextResponse(null, { status: 204 });
}


