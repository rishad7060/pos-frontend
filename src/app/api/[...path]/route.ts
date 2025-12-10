// Next.js API route proxy - forwards all /api/* requests to the backend
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
) {
  try {
    const { path } = await params;
    const pathString = path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${API_BASE_URL}/api/${pathString}${searchParams ? `?${searchParams}` : ''}`;

    // Forward all headers from the original request
    const headers: HeadersInit = {};
    
    // Forward authorization header if present
    let authHeader = request.headers.get('authorization');
    
    // If no auth header, try to get token from cookie
    if (!authHeader) {
      const cookies = request.cookies;
      const token = cookies.get('authToken')?.value;
      if (token) {
        authHeader = `Bearer ${token}`;
      }
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Forward content-type header if present
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    // Forward cookies if present
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.text();
      } catch {
        body = undefined;
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    const data = await response.text();
    
    // Try to parse as JSON, if fails return as text
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'text/plain',
        },
      });
    }

    return NextResponse.json(jsonData, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'PROXY_ERROR',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

