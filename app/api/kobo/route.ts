import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serverUrl = searchParams.get('server');
  const formId = searchParams.get('formId');
  const token = searchParams.get('token');

  if (!serverUrl || !formId || !token) {
    return NextResponse.json(
      { error: 'Missing required parameters: server, formId, token' },
      { status: 400 }
    );
  }

  try {
    const url = `${serverUrl.replace(/\/$/, '')}/api/v2/assets/${formId}/data.json?format=json`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let details: unknown = null;

      if (contentType?.includes('application/json')) {
        try {
          details = await response.json();
        } catch (parseError) {
          details = `Unable to parse JSON error: ${String(parseError)}`;
        }
      } else {
        try {
          details = await response.text();
        } catch (textError) {
          details = `Unable to read error response: ${String(textError)}`;
        }
      }

      return NextResponse.json(
        {
          error: `KoBoToolbox API Error: ${response.status} ${response.statusText}`,
          details,
          requestUrl: url,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data from KoBoToolbox' },
      { status: 500 }
    );
  }
}

// Enable CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
