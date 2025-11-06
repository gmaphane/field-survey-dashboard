'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, useMap, Pane } from 'react-leaflet';
import type { BuildingCentroid, VillageTargets, EnumeratorInfo } from '@/types';
import L, { type PathOptions } from 'leaflet';

// Helper function to calculate distance between two GPS points (in meters)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const median = (sortedValues: number[]): number => {
  if (sortedValues.length === 0) return 0;
  const mid = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 0) {
    return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
  }
  return sortedValues[mid];
};

// Remove obvious spatial outliers using a robust MAD threshold
function removeOutliers<T extends { lat: number; lon: number }>(coords: T[]): T[] {
  if (coords.length < 4) return coords; // Need at least 4 points for meaningful outlier detection

  // Calculate center point
  const centerLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const centerLon = coords.reduce((sum, c) => sum + c.lon, 0) / coords.length;

  // Calculate distances from center
  const distances = coords.map(point => ({
    point,
    distance: getDistance(centerLat, centerLon, point.lat, point.lon)
  }));

  // Sort by distance for consistent trimming
  distances.sort((a, b) => a.distance - b.distance);
  const distanceValues = distances.map((entry) => entry.distance);

  const medianDistance = median(distanceValues);
  const deviationValues = distanceValues.map((distance) => Math.abs(distance - medianDistance)).sort((a, b) => a - b);
  const mad = median(deviationValues);
  const scaledMad = mad * 1.4826; // Convert MAD to a standard deviation analog

  // Allow a generous radius around the median cluster
  const adaptiveThreshold = scaledMad > 0
    ? medianDistance + 3 * scaledMad
    : medianDistance + Math.max(50, medianDistance * 0.15);

  const filtered = distances.filter((entry) => entry.distance <= adaptiveThreshold);

  // Ensure we keep the bulk of the cluster even if the threshold is very tight
  const minimumKeep = Math.min(coords.length, Math.max(3, Math.ceil(coords.length * 0.6)));
  const safeFiltered = filtered.length >= minimumKeep
    ? filtered
    : distances.slice(0, minimumKeep);

  return safeFiltered.map(({ point }) => point);
}

type LatLngPoint = { lat: number; lon: number };

type HexGap = {
  polygon: [number, number][];
  centroid: [number, number];
  buildingCount: number;
  householdCount: number;
  expectedSamples: number | null;
  achievedRatio: number | null;
  coverageRatio: number | null;
  shortfall: number;
  spotType: 'hotspot' | 'coldspot';
};

type HexBinEntry = {
  q: number;
  r: number;
  x: number;
  y: number;
  buildingCount: number;
  householdCount: number;
};

function calculateBoundingBox(points: LatLngPoint[]): { south: number; west: number; north: number; east: number } | null {
  if (points.length === 0) return null;

  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);

  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lons);
  const east = Math.max(...lons);

  if (!Number.isFinite(south) || !Number.isFinite(north) || !Number.isFinite(west) || !Number.isFinite(east)) {
    return null;
  }

  return { south, west, north, east };
}

function expandBoundingBox(
  bbox: { south: number; west: number; north: number; east: number },
  paddingMeters: number
) {
  const latCenter = (bbox.north + bbox.south) / 2;
  const latPadding = paddingMeters / 111_320;
  const lonPadding = paddingMeters / (111_320 * Math.cos((latCenter * Math.PI) / 180) || 1e-6);

  return {
    south: Math.max(-90, bbox.south - latPadding),
    north: Math.min(90, bbox.north + latPadding),
    west: Math.max(-180, bbox.west - lonPadding),
    east: Math.min(180, bbox.east + lonPadding),
  };
}

function formatBoundingBox(bbox: { south: number; west: number; north: number; east: number }) {
  return [bbox.south, bbox.west, bbox.north, bbox.east].map((value) => value.toFixed(6)).join(',');
}

function detectHexGaps(
  householdCoords: LatLngPoint[],
  buildingCoords: LatLngPoint[],
  options: {
    hexRadiusMeters?: number;
    minBuildings?: number;
    coverageRatioThreshold?: number;
    expectedSamples?: number;
    minExpectedPerCell?: number;
    expectedShortfallTolerance?: number;
    hotspotBuildingThreshold?: number;
    maxSamplesInGap?: number;
  } = {}
): HexGap[] {
  if (buildingCoords.length === 0) return [];

  const {
    hexRadiusMeters = 300,
    minBuildings = 4,
    coverageRatioThreshold = 0.65,
    expectedSamples,
    minExpectedPerCell = 1,
    expectedShortfallTolerance = 1,
    hotspotBuildingThreshold,
    maxSamplesInGap,
  } = options;

  const hotspotThreshold = hotspotBuildingThreshold ?? Math.max(minBuildings * 2, 8);
  const maxHouseholdsAllowed =
    typeof maxSamplesInGap === 'number'
      ? Math.max(0, maxSamplesInGap)
      : Math.max(1, Math.round(minBuildings / 2));

  const allPoints = [...buildingCoords, ...householdCoords];
  const boundingBox = calculateBoundingBox(allPoints);

  if (!boundingBox) return [];

  const centerLat = (boundingBox.north + boundingBox.south) / 2;
  const centerLon = (boundingBox.east + boundingBox.west) / 2;
  const metersPerDegLat = 111_320;
  const metersPerDegLon = Math.max(1e-6, metersPerDegLat * Math.cos((centerLat * Math.PI) / 180));

  const projectPoint = (point: LatLngPoint) => ({
    lat: point.lat,
    lon: point.lon,
    x: (point.lon - centerLon) * metersPerDegLon,
    y: (point.lat - centerLat) * metersPerDegLat,
  });

  type ProjectedPoint = ReturnType<typeof projectPoint> & { q?: number; r?: number };

  const pointToAxial = (x: number, y: number) => {
    const q = (Math.sqrt(3) / 3 * x - (1 / 3) * y) / hexRadiusMeters;
    const r = (2 / 3) * y / hexRadiusMeters;
    return { q, r };
  };

  const roundAxial = (q: number, r: number) => {
    let x = q;
    let z = r;
    let y = -x - z;

    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    const xDiff = Math.abs(rx - x);
    const yDiff = Math.abs(ry - y);
    const zDiff = Math.abs(rz - z);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    return { q: rx, r: rz };
  };

  const hexToPoint = (q: number, r: number) => ({
    x: hexRadiusMeters * Math.sqrt(3) * (q + r / 2),
    y: hexRadiusMeters * 1.5 * r,
  });

  const toLatLon = (x: number, y: number): [number, number] => [
    y / metersPerDegLat + centerLat,
    x / metersPerDegLon + centerLon,
  ];

  const addPointToMap = (
    point: ProjectedPoint,
    map: globalThis.Map<string, HexBinEntry>,
    field: 'buildingCount' | 'householdCount'
  ) => {
    const axial = pointToAxial(point.x, point.y);
    const rounded = roundAxial(axial.q, axial.r);
    const key = `${rounded.q},${rounded.r}`;

    if (!map.has(key)) {
      const centerPoint = hexToPoint(rounded.q, rounded.r);
      map.set(key, {
        q: rounded.q,
        r: rounded.r,
        x: centerPoint.x,
        y: centerPoint.y,
        buildingCount: 0,
        householdCount: 0,
      });
    }

    const entry = map.get(key)!;
    entry[field] += 1;
  };

  const densityMap = new globalThis.Map<string, HexBinEntry>();

  buildingCoords.map(projectPoint).forEach((point) => addPointToMap(point, densityMap, 'buildingCount'));
  householdCoords.map(projectPoint).forEach((point) => addPointToMap(point, densityMap, 'householdCount'));

  const expectedPerBuilding = expectedSamples && expectedSamples > 0 && buildingCoords.length > 0
    ? expectedSamples / buildingCoords.length
    : null;

  const results: HexGap[] = [];

  densityMap.forEach(({ q, r, x, y, buildingCount, householdCount }) => {
    if (buildingCount < minBuildings) return;

    const expectedInCell = expectedPerBuilding !== null ? expectedPerBuilding * buildingCount : null;
    const coverageRatio = buildingCount > 0 ? householdCount / buildingCount : null;
    const achievedRatio = expectedInCell && expectedInCell > 0 ? householdCount / expectedInCell : null;

    const observedShortfall = expectedInCell !== null
      ? expectedInCell - householdCount
      : buildingCount - householdCount;
    const shortfall = Math.max(0, Math.round(observedShortfall));

    const meetsExpectation = expectedInCell !== null ? expectedInCell >= minExpectedPerCell : true;

    let isGap = false;

    if (expectedInCell !== null && meetsExpectation) {
      const ratioTooLow = achievedRatio !== null && achievedRatio < coverageRatioThreshold;
      const expectedShortfall = observedShortfall >= expectedShortfallTolerance;
      const noCoverage = householdCount === 0 && expectedInCell > 0;
      isGap = ratioTooLow || expectedShortfall || noCoverage;
    } else if (expectedInCell === null) {
      const noCoverage = householdCount === 0;
      const ratioTooLow = coverageRatio !== null && coverageRatio < coverageRatioThreshold;
      const bigShortfall = shortfall >= Math.max(1, Math.round(minBuildings / 2));
      isGap = (noCoverage && buildingCount >= minBuildings) || ratioTooLow || bigShortfall;
    }

    if (!isGap) return;

    if (householdCount > maxHouseholdsAllowed) return;
    const zeroHouseholds = householdCount === 0;
    const highDensity = buildingCount >= hotspotThreshold;
    const spotType: HexGap['spotType'] =
      zeroHouseholds && highDensity ? 'hotspot' : 'coldspot';

    const polygon: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (2 * Math.PI * (i + 0.5)) / 6; // pointy-top orientation
      const cornerX = x + hexRadiusMeters * Math.cos(angle);
      const cornerY = y + hexRadiusMeters * Math.sin(angle);
      polygon.push(toLatLon(cornerX, cornerY));
    }

    results.push({
      polygon,
      centroid: toLatLon(x, y),
      buildingCount,
      householdCount,
      expectedSamples: expectedInCell,
      achievedRatio,
      coverageRatio,
      shortfall,
      spotType,
    });
  });

  return results;
}

interface MapProps {
  villageTargets: VillageTargets;
  selectedVillage?: {district: string, village: string} | null;
  showGaps?: boolean;
  showBuildings?: boolean;
  userLocation?: {lat: number, lon: number} | null;
  selectedEnumerator?: string | null;
  allEnumerators?: globalThis.Map<string, EnumeratorInfo>;
  villageEnumerators?: EnumeratorInfo[];
}

function MapUpdater({ villageTargets, selectedVillage, selectedEnumerator }: { villageTargets: VillageTargets, selectedVillage?: {district: string, village: string} | null, selectedEnumerator?: string | null }) {
  const map = useMap();

  useEffect(() => {
    // If a specific village is selected, zoom to focus on main cluster
    if (selectedVillage) {
      const villageData = villageTargets[selectedVillage.district]?.[selectedVillage.village];

      if (villageData && villageData.households.length > 0) {
        // If filtering by enumerator, only include that enumerator's points
        let householdsToZoom = villageData.households;
        if (selectedEnumerator) {
          householdsToZoom = villageData.households.filter(h => h.enumeratorId === selectedEnumerator);
        }

        if (selectedEnumerator && householdsToZoom.length === 0) {
          // Enumerator selected but no GPS points; keep current view until data arrives.
          return;
        }

        if (householdsToZoom.length > 0) {
          let mainCluster = householdsToZoom;

          if (!selectedEnumerator && householdsToZoom.length > 4) {
            const filtered = removeOutliers(householdsToZoom);
            if (filtered.length > 1) {
              mainCluster = filtered;
            }
          }

          if (mainCluster.length > 0) {
            const coords: [number, number][] = mainCluster.map(h => [h.lat, h.lon]);
            const bounds = L.latLngBounds(coords);
            // Zoom to main cluster with more generous padding and zoom level
            const padding: [number, number] = [120, 120];
            const maxZoom = 15; // Zoom level that shows the village area clearly
            map.fitBounds(bounds, { padding, maxZoom });
            return;
          }
        }
      }
    }

    // Otherwise, show all points (with outlier removal)
    const allHouseholds: { lat: number; lon: number }[] = [];

    Object.values(villageTargets).forEach((district) => {
      Object.values(district).forEach((village) => {
        village.households.forEach((household) => {
          allHouseholds.push({ lat: household.lat, lon: household.lon });
        });
      });
    });

    if (allHouseholds.length > 0) {
      // Remove outliers from the global view as well
      const filteredForGlobal = allHouseholds.length > 4
        ? removeOutliers(allHouseholds)
        : allHouseholds;

      if (filteredForGlobal.length > 0) {
        const coords: [number, number][] = filteredForGlobal.map(h => [h.lat, h.lon]);
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        // Fallback to default view
        map.setView([-22.3285, 24.6849], 6);
      }
    } else {
      // Default view (Botswana)
      map.setView([-22.3285, 24.6849], 6);
    }
  }, [villageTargets, selectedVillage, selectedEnumerator, map]);

  return null;
}

export default function Map({ villageTargets, selectedVillage, showGaps = true, showBuildings = true, userLocation = null, selectedEnumerator = null, allEnumerators, villageEnumerators = [] }: MapProps) {
  const getMarkerColor = (percentage: number) => {
    if (percentage >= 100) return '#2B2539'; // slate - completed villages
    if (percentage >= 80) return '#F59E0B'; // bright orange - high progress but incomplete
    if (percentage >= 50) return '#F97316'; // bright orange/red - medium progress
    return '#EF4444'; // bright red - low progress
  };

  const selectedVillageData = selectedVillage
    ? villageTargets[selectedVillage.district]?.[selectedVillage.village]
    : undefined;

  const [buildingPoints, setBuildingPoints] = useState<BuildingCentroid[]>([]);
  const buildingCache = useRef<Map<string, { bboxKey: string; buildings: BuildingCentroid[] }>>(
    new globalThis.Map()
  );
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [buildingError, setBuildingError] = useState<string | null>(null);

  const selectedVillageKey = selectedVillage ? `${selectedVillage.district}-${selectedVillage.village}` : null;

  const selectedHouseholds = useMemo<LatLngPoint[]>(() => {
    if (!selectedVillageData || selectedVillageData.households.length === 0) return [];

    const filtered = removeOutliers(selectedVillageData.households);
    const householdsToUse = filtered.length > 0 ? filtered : selectedVillageData.households;

    return householdsToUse.map(household => ({ lat: household.lat, lon: household.lon }));
  }, [selectedVillageData]);

  useEffect(() => {
    if (!selectedVillage || !selectedVillageKey) {
      setBuildingPoints([]);
      setBuildingError(null);
      return;
    }

    if (selectedHouseholds.length === 0) {
      setBuildingPoints([]);
      setBuildingError(null);
      return;
    }

    const boundingBox = calculateBoundingBox(selectedHouseholds);
    if (!boundingBox) {
      setBuildingPoints([]);
      setBuildingError(null);
      return;
    }

    const expandedBoundingBox = expandBoundingBox(boundingBox, 800);
    const bboxKey = formatBoundingBox(expandedBoundingBox);
    const cached = buildingCache.current.get(selectedVillageKey);

    if (cached && cached.bboxKey === bboxKey) {
      setBuildingPoints(cached.buildings);
      setBuildingError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingBuildings(true);
    setBuildingError(null);

    fetch(`/api/osm-buildings?bbox=${bboxKey}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          let message = 'Failed to load building footprints.';
          try {
            const body = await response.json();
            message = body.error || message;
          } catch {
            message = `${message} (${response.status})`;
          }
          throw new Error(message);
        }
        return response.json();
      })
      .then((body) => {
        const buildings: BuildingCentroid[] = Array.isArray(body.buildings) ? body.buildings : [];
        setBuildingPoints(buildings);
        buildingCache.current.set(selectedVillageKey, { bboxKey, buildings });
      })
      .catch((error: any) => {
        if (error.name === 'AbortError') return;
        console.error('Building footprint fetch failed:', error);
        setBuildingPoints([]);
        setBuildingError(error.message || 'Unable to load building data.');
      })
      .finally(() => {
        setIsLoadingBuildings(false);
      });

    return () => controller.abort();
  }, [selectedVillageKey, selectedVillage, selectedHouseholds]);

  // Calculate spatial gaps for selected village using hex bins
  const hexGaps = useMemo(() => {
    if (!selectedVillage || !selectedVillageData) return [];
    if (selectedHouseholds.length === 0) return [];
    if (buildingPoints.length === 0) return [];

    const targetSamples = selectedVillageData.expected ?? selectedVillageData.actual ?? 0;
    if (targetSamples <= 0) return [];

    return detectHexGaps(selectedHouseholds, buildingPoints, {
      hexRadiusMeters: 90,
      minBuildings: 4,
      coverageRatioThreshold: 0.7,
      expectedSamples: targetSamples,
      minExpectedPerCell: 0.9,
      expectedShortfallTolerance: 1,
      hotspotBuildingThreshold: 10,
      maxSamplesInGap: 2,
    });
  }, [selectedVillage, selectedVillageData, selectedHouseholds, buildingPoints]);

  const allHouseholds: Array<{
    lat: number;
    lon: number;
    village: string;
    district: string;
    percentage: number;
    actual: number;
    expected: number;
    enumeratorId?: string;
    enumeratorName?: string;
    enumeratorColor?: string;
    isSelectedVillage?: boolean;
  }> = [];

  Object.entries(villageTargets).forEach(([district, villages]) => {
    Object.entries(villages).forEach(([villageName, villageData]) => {
      // Check if this is the selected village
      const isSelectedVillage = selectedVillage &&
        selectedVillage.district === district &&
        selectedVillage.village === villageName;

      const shouldBypassOutliers = Boolean(selectedEnumerator && isSelectedVillage);

      const householdsForVillage = (() => {
        if (villageData.households.length === 0) {
          return [] as typeof villageData.households;
        }
        if (shouldBypassOutliers) {
          return villageData.households;
        }
        const filtered = removeOutliers(villageData.households);
        return filtered.length > 0 ? filtered : villageData.households;
      })();

      householdsForVillage.forEach((household) => {
        // If we have a village selected with enumerator filter
        if (selectedVillage && selectedEnumerator) {
          // Only show points from the selected village that match the enumerator
          if (isSelectedVillage) {
            if (household.enumeratorId !== selectedEnumerator) {
              return; // Skip this household - wrong enumerator
            }
          } else {
            return; // Skip households from other villages when filtering
          }
        }

        // Get color from allEnumerators map
        const enumeratorColor = household.enumeratorId && allEnumerators
          ? allEnumerators.get(household.enumeratorId)?.color
          : undefined;

        allHouseholds.push({
          lat: household.lat,
          lon: household.lon,
          village: villageName,
          district,
          percentage: villageData.percentage,
          actual: villageData.actual,
          expected: villageData.expected,
          enumeratorId: household.enumeratorId,
          enumeratorName: household.enumeratorName,
          enumeratorColor,
          isSelectedVillage: isSelectedVillage || false,
        });
      });
    });
  });

  const gapStyles: Record<HexGap['spotType'], PathOptions> = {
    hotspot: {
      color: '#D79898',
      fillColor: '#EFC8C8',
      fillOpacity: 0.28,
      weight: 1.4,
      dashArray: '4,6',
      pane: 'hexPane',
    },
    coldspot: {
      color: '#7BA19A',
      fillColor: '#BED3CC',
      fillOpacity: 0.26,
      weight: 1.2,
      dashArray: '6,6',
      pane: 'hexPane',
    },
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[-22.3285, 24.6849]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater villageTargets={villageTargets} selectedVillage={selectedVillage} selectedEnumerator={selectedEnumerator} />

        {/* Render spatial gaps as semi-transparent hexagons below other overlays */}
        {showGaps && (
        <Pane name="hexPane" style={{ zIndex: 350 }}>
          {hexGaps.map((gap, index) => {
            const expectedSamples =
              gap.expectedSamples !== null ? Math.max(1, Math.round(gap.expectedSamples)) : null;
            const achievedPercent =
              gap.achievedRatio !== null
                ? Math.max(0, Math.min(100, Math.round(gap.achievedRatio * 100)))
                : gap.coverageRatio !== null
                  ? Math.max(0, Math.min(100, Math.round(gap.coverageRatio * 100)))
                  : null;
            const buildingLabel = gap.buildingCount === 1 ? 'building' : 'buildings';
            const sampleLabel = gap.householdCount === 1 ? 'sample' : 'samples';
            const title =
              gap.spotType === 'hotspot'
                ? '🔥 Hotspot: High-density buildings without surveys'
                : '🧊 Cold Spot: Buildings still unvisited';
            const advisory =
              gap.spotType === 'hotspot'
                ? 'High building concentration detected with no completed surveys. Prioritise this area.'
                : 'No surveys recorded yet—schedule an initial visit.';

            return (
              <Polygon
                key={`gap-${index}`}
                positions={gap.polygon}
                pathOptions={{ ...gapStyles[gap.spotType] }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold text-danger mb-1">{title}</div>
                    <div className="text-foreground/70">
                      {gap.householdCount} {sampleLabel} logged for {gap.buildingCount} {buildingLabel}
                    </div>
                    {expectedSamples !== null ? (
                      <div className="text-foreground/70">
                        Target: {expectedSamples} sample{expectedSamples === 1 ? '' : 's'}
                      </div>
                    ) : null}
                    <div className="text-xs text-foreground/60 mt-1 leading-relaxed">
                      {achievedPercent !== null && (
                        <>
                          Coverage: {achievedPercent}%
                          {' · '}
                        </>
                      )}
                      Shortfall: {gap.shortfall}
                      <br />
                      {advisory}
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}
        </Pane>
        )}

        {/* Render building centroids for the focused village */}
        {showBuildings && selectedVillage && buildingPoints.map((building) => (
          <CircleMarker
            key={`building-${building.id}`}
            center={[building.lat, building.lon]}
            radius={3}
            pathOptions={{
                color: '#7B6767',
                weight: 0.4,
                fillColor: '#D8CBC4',
                fillOpacity: 0.45,
              }}
            />
          ))}

        {/* Render GPS markers */}
        {allHouseholds.map((household, index) => {
          // Use enumerator color for selected village markers, otherwise use progress color
          const markerColor = household.isSelectedVillage && household.enumeratorColor
            ? household.enumeratorColor
            : getMarkerColor(household.percentage);

          return (
            <CircleMarker
              key={`marker-${index}`}
              center={[household.lat, household.lon]}
              radius={8}
              pathOptions={{
                fillColor: markerColor,
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-base text-foreground mb-1">
                    {household.village}, {household.district}
                  </div>
                  <div className="text-foreground/70">
                    Progress: {household.actual}/{household.expected} ({household.percentage}%)
                  </div>
                  {household.enumeratorName && (
                    <div className="text-foreground/70 mt-1 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: household.enumeratorColor }}
                      />
                      Enumerator: {household.enumeratorName}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* User Location Marker */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lon]}
            radius={12}
            fillColor="#3B82F6"
            color="#fff"
            weight={3}
            opacity={1}
            fillOpacity={0.7}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold text-base text-foreground mb-1">
                  📍 Your Location
                </div>
                <div className="text-foreground/70 text-xs">
                  Lat: {userLocation.lat.toFixed(5)}<br />
                  Lon: {userLocation.lon.toFixed(5)}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {selectedVillage && isLoadingBuildings && (
        <div className="pointer-events-none absolute left-4 top-4 rounded bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow">
          Loading nearby building footprints…
        </div>
      )}

      {selectedVillage && !isLoadingBuildings && buildingError && (
        <div className="pointer-events-none absolute left-4 top-4 rounded bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow">
          Building layer unavailable: {buildingError}
        </div>
      )}

      {/* Enumerator Legend - only show village-specific enumerators */}
      {selectedVillage && villageEnumerators && villageEnumerators.length > 0 && (
        <div className="absolute right-4 top-4 rounded-lg bg-white/95 px-4 py-3 shadow-lg backdrop-blur max-w-xs">
          <div className="text-xs font-semibold text-foreground/80 mb-2 uppercase tracking-wide">
            Enumerators in {selectedVillage.village}
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {villageEnumerators
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((enumerator) => (
                <div
                  key={enumerator.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: enumerator.color }}
                  />
                  <span className="text-foreground/90 truncate font-medium">
                    {enumerator.name}
                  </span>
                  <span className="text-foreground/60 text-[10px] ml-auto">
                    ({enumerator.submissionCount})
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
