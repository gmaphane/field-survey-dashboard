import { NextRequest, NextResponse } from 'next/server';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

type BoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type BuildingElement = {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function parseBoundingBox(param: string | null): BoundingBox | null {
  if (!param) return null;

  const values = param.split(',').map((value) => parseFloat(value.trim()));
  if (values.length !== 4 || values.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [south, west, north, east] = values;

  if (south >= north || west >= east) {
    return null;
  }

  return { south, west, north, east };
}

function buildOverpassQuery({ south, west, north, east }: BoundingBox): string {
  return `
[out:json][timeout:25];
(
  way["building"](${south},${west},${north},${east});
  relation["building"](${south},${west},${north},${east});
  node["building"](${south},${west},${north},${east});
);
out center tags;`;
}

function toBuildingCentroids(elements: BuildingElement[]) {
  return elements
    .map((element) => {
      if (element.center) {
        return {
          id: element.id,
          lat: element.center.lat,
          lon: element.center.lon,
          tags: element.tags ?? {},
        };
      }

      if (typeof element.lat === 'number' && typeof element.lon === 'number') {
        return {
          id: element.id,
          lat: element.lat,
          lon: element.lon,
          tags: element.tags ?? {},
        };
      }

      return null;
    })
    .filter((value) => value !== null);
}

export async function GET(request: NextRequest) {
  const bboxParam = request.nextUrl.searchParams.get('bbox');
  const bbox = parseBoundingBox(bboxParam);

  if (!bbox) {
    return NextResponse.json(
      { error: 'Missing or invalid bbox parameter. Expected south,west,north,east.' },
      { status: 400 }
    );
  }

  try {
    const query = buildOverpassQuery(bbox);

    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json(
        { error: `Overpass API error: ${response.status} ${response.statusText}`, details: message },
        { status: response.status }
      );
    }

    const data = await response.json();
    const buildings = toBuildingCentroids(data.elements ?? []);

    return NextResponse.json(
      { buildings },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=21600',
        },
      }
    );
  } catch (error: any) {
    console.error('OSM building fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch building footprints from OSM.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
