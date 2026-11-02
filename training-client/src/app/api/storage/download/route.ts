import { NextRequest } from 'next/server';

const API_URL = process.env.API_URL!;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

    const params = request.nextUrl.searchParams.toString();

    const upstream = await fetch(
      `${API_URL}/storage/download?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      },
    );

    if (!upstream.ok) {
      return new Response(await upstream.text(), {
        status: upstream.status,
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') || 'application/pdf',
        'Content-Disposition':
          upstream.headers.get('content-disposition') || 'inline',
        'Content-Length':
          upstream.headers.get('content-length') || '',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Unable to retrieve file.', {
      status: 500,
    });
  }
}