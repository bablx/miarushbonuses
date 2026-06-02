import { NextResponse } from 'next/server';
import mia from '../../../public/mia.png';

export const runtime = 'edge';

export async function GET() {
  const response = await fetch(mia.src);
  const imageBuffer = await response.arrayBuffer();
  
  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'inline; filename="icon.png"',
    },
  });
}
