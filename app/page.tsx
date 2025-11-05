'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  RefreshCw,
  MapPin,
  Calendar,
  Award,
  Target,
  CheckCircle2,
  Navigation,
  Clock,
  ListChecks,
} from 'lucide-react';
import Papa from 'papaparse';
import type { VillageTargets, KoBoSubmission } from '@/types';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const DISTRICT_KEYS = ['district', 'District', '_district', 'grp_general/landscape', 'landscape'];
const VILLAGE_KEYS = ['village', 'Village', '_village', 'grp_general/village'];
const TIMESTAMP_KEYS = [
  '_submission_time',
  'end',
  '_updated_at',
  '_last_updated',
  '__last_update',
  'submission_time',
  'start',
  'meta/instanceID',
];
const FILLABLE_FIELD_EXCLUDES = new Set(
  [
    '_attachments',
    '_chunk',
    '_id',
    '_notes',
    '_status',
    '_status_string',
    '_submitted_by',
    '_uuid',
    '_version',
    '_tags',
    '_validation_status',
    '_last_edit_date',
    '__version__',
    '_xform_id_string',
    '_duration',
    '_submission_time',
    '_updated_at',
    '_last_updated',
    '__last_update',
    '_geolocation',
    'end',
    'start',
    'today',
    'deviceid',
    'subscriberid',
    'simid',
    'meta',
    'formhub/uuid',
    'instanceID',
    'meta/instanceID',
    'meta/instanceName',
    'meta/deprecatedID',
  ].map((key) => key.toLowerCase())
);

const normalizeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

const extractSubmissionValue = (submission: KoBoSubmission, keys: string[]): string => {
  for (const key of keys) {
    const raw = (submission as any)[key];
    if (raw !== undefined && raw !== null && raw !== '') {
      return normalizeString(raw);
    }
  }
  return '';
};

const extractLatestTimestamp = (submission: KoBoSubmission): Date | null => {
  let latest: Date | null = null;

  for (const key of TIMESTAMP_KEYS) {
    const raw = (submission as any)[key];
    if (!raw) continue;

    const candidate = new Date(raw);
    if (Number.isNaN(candidate.getTime())) continue;

    if (!latest || candidate > latest) {
      latest = candidate;
    }
  }

  return latest;
};

const computeFieldFillRate = (submission: KoBoSubmission): number | null => {
  const stack: Array<{ value: any; path: string }> = [{ value: submission, path: '' }];
  let totalFields = 0;
  let filledFields = 0;

  const shouldTrack = (keyPath: string, value: any): boolean => {
    if (!keyPath) return false;
    const lowerKey = keyPath.toLowerCase();
    if (FILLABLE_FIELD_EXCLUDES.has(lowerKey)) return false;

    if (lowerKey.startsWith('_') && !lowerKey.startsWith('_gps') && !lowerKey.startsWith('_location')) {
      return false;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const remainingKeys = Object.keys(value);
      if (
        remainingKeys.length > 0 &&
        remainingKeys.every((innerKey) => {
          const combined = `${lowerKey}/${innerKey.toLowerCase()}`;
          return (
            FILLABLE_FIELD_EXCLUDES.has(innerKey.toLowerCase()) || FILLABLE_FIELD_EXCLUDES.has(combined)
          );
        })
      ) {
        return false;
      }
    }

    return true;
  };

  while (stack.length > 0) {
    const { value, path } = stack.pop()!;

    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        stack.push({ value: item, path: path ? `${path}[${index}]` : `[${index}]` });
      });
      continue;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, child]) => {
        const nextPath = path ? `${path}/${key}` : key;
        stack.push({ value: child, path: nextPath });
      });
      continue;
    }

    if (shouldTrack(path, value)) {
      totalFields += 1;
      const trimmed =
        typeof value === 'string'
          ? value.trim()
          : typeof value === 'number'
            ? value
            : typeof value === 'boolean'
              ? value
              : value;
      if (
        trimmed !== '' &&
        trimmed !== null &&
        trimmed !== undefined &&
        !(typeof trimmed === 'number' && Number.isNaN(trimmed))
      ) {
        filledFields += 1;
      }
    }
  }

  if (totalFields === 0) return null;
  return Math.round((filledFields / totalFields) * 100);
};

export default function Dashboard() {
  const [villageTargets, setVillageTargets] = useState<VillageTargets>({});
  const [surveyData, setSurveyData] = useState<KoBoSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config] = useState({
    serverUrl: 'https://eu.kobotoolbox.org',
    formId: 'aYaMawNU6Sssr59N46giCi',
    apiToken: '7101ae5c9f20b2a50134798b08264072c14afaff',
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState<{district: string, village: string} | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [showGaps, setShowGaps] = useState(false);
  const [showBuildings, setShowBuildings] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showWhereNext, setShowWhereNext] = useState(false);

  // Auto-load CSV and connect on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Fetch CSV from public folder
        const response = await fetch('/village-targets.csv');
        const csvText = await response.text();

        // Parse CSV
        Papa.parse<Record<string, any>>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('CSV loaded:', results.data.length, 'villages');
            processVillageTargets(results.data);
            setIsInitialLoad(false);
          },
          error: (parseError: Error) => {
            console.error('CSV parse error:', parseError);
            setError(`Error loading village targets: ${parseError.message}`);
            setIsLoading(false);
          },
        });
      } catch (error: any) {
        console.error('CSV fetch error:', error);
        setError(`Error loading village targets: ${error.message}`);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-connect to KoBoToolbox after CSV loads
  useEffect(() => {
    if (!isInitialLoad && !hasAttemptedAutoConnect && Object.keys(villageTargets).length > 0) {
      console.log('Auto-connecting to KoBoToolbox...');
      setHasAttemptedAutoConnect(true);
      fetchSurveyData();
    }
  }, [isInitialLoad, hasAttemptedAutoConnect, villageTargets]);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalExpected = 0;
    let totalActual = 0;
    let completedVillages = 0;
    let totalVillages = 0;

    Object.values(villageTargets).forEach((district) => {
      Object.values(district).forEach((village) => {
        totalExpected += village.expected;
        totalActual += village.actual;
        totalVillages++;
        if (village.percentage >= 100) completedVillages++;
      });
    });

    const overallProgress = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;

    return {
      overallProgress,
      totalSubmissions: totalActual,
      completedVillages,
      totalVillages,
      totalExpected,
    };
  }, [villageTargets]);

  // Get sorted villages with active surveys (has at least 1 submission)
  const activeVillages = useMemo(() => {
    const villages: Array<{
      district: string;
      districtDisplay: string;
      village: string;
      villageDisplay: string;
      data: any;
    }> = [];

    Object.entries(villageTargets).forEach(([district, villageList]) => {
      Object.entries(villageList).forEach(([village, data]) => {
        if (data.actual > 0) { // Only show villages with active surveys
          villages.push({
            district,
            districtDisplay: data.district,
            village,
            villageDisplay: data.village,
            data,
          });
        }
      });
    });

    // Sort by progress percentage (descending) - leading village at top
    return villages.sort((a, b) => b.data.percentage - a.data.percentage);
  }, [villageTargets]);

  // Process village targets from CSV
  const processVillageTargets = (data: any[]) => {
    const targets: VillageTargets = {};

    data.forEach((row) => {
      const district = row.District || row.district;
      const village = row.Village || row.village;
      const expected = parseInt(row['Optimal Sample (HH)'] || row.optimal_sample || 0);
      const optimalDays = parseFloat(row['Optimal Days'] || row.optimal_days || 0);

      if (district && village && expected > 0) {
        // Normalize to lowercase for case-insensitive matching
        const districtKey = district.toLowerCase();
        const villageKey = village.toLowerCase();

        if (!targets[districtKey]) {
          targets[districtKey] = {};
        }
        targets[districtKey][villageKey] = {
          district: district, // Keep original capitalization for display
          village: village,
          expected,
          optimalDays,
          actual: 0,
          percentage: 0,
          households: [],
        };
      }
    });

    setVillageTargets(targets);
  };

  // Fetch survey data from KoBoToolbox
  const fetchSurveyData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = `/api/kobo?server=${encodeURIComponent(config.serverUrl)}&formId=${encodeURIComponent(config.formId)}&token=${encodeURIComponent(config.apiToken)}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let message = `API Error: ${response.status} ${response.statusText}`;

        if (contentType?.includes('application/json')) {
          try {
            const errorBody = await response.json();
            message = errorBody.error || message;
          } catch (parseError: any) {
            console.warn('Failed to parse KoBo error JSON:', parseError);
          }
        } else {
          try {
            const textBody = await response.text();
            if (textBody) {
              message = textBody;
            }
          } catch (readError: any) {
            console.warn('Failed to read KoBo error response:', readError);
          }
        }

        throw new Error(message);
      }

      const data = await response.json();
      const submissions = data.results || [];

      console.log('Fetched submissions:', submissions.length);

      setSurveyData(submissions);
      processSubmissions(submissions);
      setIsConnected(true);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Fetch error:', error);
      setError(`Failed to fetch data: ${error.message}`);
      setIsLoading(false);
      setIsConnected(false);
    }
  };

  // Process submissions and match to villages
  const processSubmissions = (submissions: KoBoSubmission[]) => {
    const updatedTargets = JSON.parse(JSON.stringify(villageTargets));

    // Reset counts
    Object.values(updatedTargets).forEach((district: any) => {
      Object.values(district).forEach((village: any) => {
        village.actual = 0;
        village.households = [];
      });
    });

    // Process each submission
    submissions.forEach((submission) => {
      const gps = submission._gps || submission.gps || submission._geolocation;
      let lat: number | undefined, lon: number | undefined;

      if (typeof gps === 'string') {
        const coords = gps.split(' ');
        lat = parseFloat(coords[0]);
        lon = parseFloat(coords[1]);
      } else if (Array.isArray(gps)) {
        lat = parseFloat(gps[0] as any);
        lon = parseFloat(gps[1] as any);
      } else if (gps && typeof gps === 'object') {
        lat = parseFloat((gps as any).latitude || (gps as any).lat);
        lon = parseFloat((gps as any).longitude || (gps as any).lon || (gps as any).lng);
      }

      const district = submission.district ||
                       submission.District ||
                       submission._district ||
                       submission['grp_general/landscape'] ||
                       submission.landscape;

      const village = submission.village ||
                      submission.Village ||
                      submission._village ||
                      submission['grp_general/village'];

      const districtKey = district ? district.toLowerCase() : '';
      const villageKey = village ? village.toLowerCase() : '';

      if (districtKey && villageKey && updatedTargets[districtKey]?.[villageKey]) {
        updatedTargets[districtKey][villageKey].actual++;

        if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
          updatedTargets[districtKey][villageKey].households.push({
            lat,
            lon,
            data: submission,
          });
        }
      }
    });

    // Calculate percentages
    Object.values(updatedTargets).forEach((district: any) => {
      Object.values(district).forEach((village: any) => {
        village.percentage = Math.min(100, Math.round((village.actual / village.expected) * 100));
      });
    });

    setVillageTargets(updatedTargets);
  };

  // Handle village card click to zoom map
  const handleVillageClick = (district: string, village: string) => {
    setSelectedVillage({ district, village });
    setMapKey(prev => prev + 1); // Force map re-render to zoom
  };

  // Get emoji based on progress
  const getProgressEmoji = (percentage: number) => {
    if (percentage >= 100) return '🎉';
    if (percentage >= 80) return '🚀';
    if (percentage >= 50) return '💪';
    return '🌱';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-primary';
    if (percentage >= 50) return 'bg-secondary';
    return 'bg-danger';
  };

  const selectedVillageData = selectedVillage
    ? villageTargets[selectedVillage.district]?.[selectedVillage.village] ?? null
    : null;

  const selectedVillageQuality = useMemo(() => {
    if (!selectedVillage || !selectedVillageData) return null;

    const actual = selectedVillageData.actual;
    const expected = selectedVillageData.expected;
    const householdsWithGps = selectedVillageData.households.length;

    const rawCompleteness = expected > 0 ? (actual / expected) * 100 : null;
    const dataCompleteness = rawCompleteness !== null ? Math.round(rawCompleteness) : null;
    const gpsCompleteness =
      actual > 0 ? Math.round((householdsWithGps / actual) * 100) : actual === 0 ? null : 0;
    const remainingSamples = Math.max(expected - actual, 0);
    const missingGps = Math.max(actual - householdsWithGps, 0);

    const selectedDistrictKey = selectedVillage.district;
    const selectedVillageKey = selectedVillage.village;

    const matchingSubmissions = surveyData.filter((submission) => {
      const districtKey = extractSubmissionValue(submission, DISTRICT_KEYS);
      const villageKey = extractSubmissionValue(submission, VILLAGE_KEYS);
      return districtKey === selectedDistrictKey && villageKey === selectedVillageKey;
    });

    let latestSubmission: Date | null = null;
    let fillRates: number[] = [];
    matchingSubmissions.forEach((submission) => {
      const candidate = extractLatestTimestamp(submission);
      if (candidate && (!latestSubmission || candidate > latestSubmission)) {
        latestSubmission = candidate;
      }

      const fill = computeFieldFillRate(submission);
      if (fill !== null && !Number.isNaN(fill)) {
        fillRates.push(fill);
      }
    });

    const averageFieldCompletion =
      fillRates.length > 0 ? Math.round(fillRates.reduce((a, b) => a + b, 0) / fillRates.length) : null;

    const daysSinceLastSubmission = latestSubmission
      ? Math.max(
          0,
          Math.floor((Date.now() - (latestSubmission as Date).getTime()) / (1000 * 60 * 60 * 24))
        )
      : null;

    const formatStatus = (value: number | null) => {
      if (value === null) {
        return { label: 'No data', tone: 'bg-muted text-foreground/60' };
      }
      if (value >= 90) {
        return { label: 'On track', tone: 'bg-secondary/50 text-brand-slate' };
      }
      if (value >= 70) {
        return { label: 'Monitor', tone: 'bg-brand-chartreuse/70 text-brand-slate' };
      }
      return { label: 'Needs attention', tone: 'bg-brand-coral/70 text-brand-slate' };
    };

    const recencyStatus = (() => {
      if (daysSinceLastSubmission === null) {
        return { label: 'No submissions yet', tone: 'bg-brand-coral/70 text-brand-slate' };
      }
      if (daysSinceLastSubmission <= 3) {
        return { label: 'Up to date', tone: 'bg-secondary/50 text-brand-slate' };
      }
      if (daysSinceLastSubmission <= 7) {
        return { label: 'Check-in soon', tone: 'bg-brand-chartreuse/70 text-brand-slate' };
      }
      return { label: 'Needs follow-up', tone: 'bg-brand-coral/70 text-brand-slate' };
    })();

    const latestSubmissionLabel = latestSubmission
      ? (latestSubmission as Date).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'No submissions yet';

    return {
      meta: {
        village: selectedVillageData.village,
        district: selectedVillageData.district,
      },
      actual,
      expected,
      remainingSamples,
      householdsWithGps,
      missingGps,
      dataCompleteness,
      gpsCompleteness,
      averageFieldCompletion,
      daysSinceLastSubmission,
      latestSubmissionLabel,
      submissionCount: matchingSubmissions.length,
      statuses: {
        completeness: formatStatus(
          rawCompleteness !== null ? Math.min(100, Math.round(rawCompleteness)) : null
        ),
        gps: formatStatus(gpsCompleteness !== null ? Math.min(100, gpsCompleteness) : null),
        fieldQuality: formatStatus(averageFieldCompletion),
        recency: recencyStatus,
      },
    };
  }, [selectedVillage, selectedVillageData, surveyData]);

  // Geolocation handler
  const handleWhereNext = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setShowWhereNext(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        setUserLocation({ lat: userLat, lon: userLon });
        setIsLocating(false);

        // Find the nearest village with incomplete sampling
        let nearestVillage: { district: string; village: string; distance: number; completion: number } | null = null;
        let minDistance = Infinity;

        Object.entries(villageTargets).forEach(([district, villages]) => {
          Object.entries(villages).forEach(([villageName, data]) => {
            const percentage = data.expected > 0 ? (data.actual / data.expected) * 100 : 0;

            // Only consider villages that aren't complete
            if (percentage < 100) {
              data.households.forEach((household) => {
                const distance = Math.sqrt(
                  Math.pow(household.lat - userLat, 2) + Math.pow(household.lon - userLon, 2)
                );

                if (distance < minDistance) {
                  minDistance = distance;
                  nearestVillage = { district, village: villageName, distance, completion: Math.round(percentage) };
                }
              });
            }
          });
        });

        if (nearestVillage !== null) {
          const nearest = nearestVillage as { district: string; village: string; distance: number; completion: number };
          setSelectedVillage({ district: nearest.district, village: nearest.village });
          setMapKey(prev => prev + 1); // Force map to recenter

          alert(
            `Nearest incomplete village: ${nearest.village}, ${nearest.district}\n` +
            `Current completion: ${nearest.completion}%\n` +
            `Distance: ~${(minDistance * 111).toFixed(1)} km`
          );
        } else {
          alert('All villages are fully sampled! Great work!');
        }
      },
      (error) => {
        setIsLocating(false);
        console.error('Geolocation error:', error);
        alert(`Unable to get your location: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Simple Header */}
      <header className="bg-brand-oatmeal border-b border-brand-umber/30 shadow-[0_12px_24px_-16px_rgba(43,37,57,0.25)] backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-wide uppercase">Socio-Economic Baseline Survey 2025</h1>
            <p className="text-sm text-foreground/70">
              {stats.totalSubmissions} / {stats.totalExpected} samples collected ({stats.overallProgress}%)
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle switches */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGaps}
                  onChange={(e) => setShowGaps(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-foreground/80">Spatial Gaps</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBuildings}
                  onChange={(e) => setShowBuildings(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-foreground/80">Buildings</span>
              </label>
            </div>

            <button
              onClick={handleWhereNext}
              disabled={isLocating}
              className="flex items-center gap-2 px-4 py-2 bg-brand-slate text-white rounded-full shadow-[0_12px_24px_-18px_rgba(43,37,57,0.4)] hover:shadow-[0_16px_32px_-18px_rgba(43,37,57,0.45)] hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
              {isLocating ? 'Locating...' : 'Where Next?'}
            </button>

            <button
              onClick={fetchSurveyData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-[0_12px_24px_-18px_rgba(43,37,57,0.4)] hover:shadow-[0_16px_32px_-18px_rgba(43,37,57,0.45)] hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Map + Village Cards */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Map - 70% width */}
        <div className="w-[70%] p-6 flex flex-col space-y-3 h-full">
          {selectedVillageQuality && (
            <div className="rounded-2xl border border-brand-umber/25 bg-white/80 p-4 shadow-[0_18px_30px_-24px_rgba(43,37,57,0.3)] backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-foreground/60">
                    Data Quality Snapshot
                  </p>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedVillageQuality.meta.village}
                    <span className="text-xs text-foreground/60"> • {selectedVillageQuality.meta.district}</span>
                  </h3>
                </div>
                <div className="text-[10px] text-foreground/60">
                  {selectedVillageQuality.submissionCount} matched submission
                  {selectedVillageQuality.submissionCount === 1 ? '' : 's'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-brand-umber/20 bg-brand-oatmeal/60 p-3 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Data Completeness
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded-full ${selectedVillageQuality.statuses.completeness.tone}`}
                    >
                      {selectedVillageQuality.statuses.completeness.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {selectedVillageQuality.dataCompleteness !== null
                      ? `${selectedVillageQuality.dataCompleteness}%`
                      : '—'}
                  </div>
                  <p className="mt-1.5 text-[11px] text-foreground/70">
                    {selectedVillageQuality.actual} of {selectedVillageQuality.expected} expected samples
                    {selectedVillageQuality.remainingSamples > 0
                      ? ` • ${selectedVillageQuality.remainingSamples} remaining`
                      : ' • Target met'}
                  </p>
                </div>

                <div className="rounded-xl border border-brand-umber/20 bg-brand-oatmeal/60 p-3 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                      <ListChecks className="w-3.5 h-3.5 text-brand-slate" />
                      Form Field Completion
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded-full ${selectedVillageQuality.statuses.fieldQuality.tone}`}
                    >
                      {selectedVillageQuality.statuses.fieldQuality.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {selectedVillageQuality.averageFieldCompletion !== null
                      ? `${selectedVillageQuality.averageFieldCompletion}%`
                      : '—'}
                  </div>
                  <p className="mt-1.5 text-[11px] text-foreground/70">
                    Average share of required form fields completed per submission.
                    {selectedVillageQuality.averageFieldCompletion === null
                      ? ' Awaiting submissions.'
                      : ''}
                  </p>
                  {selectedVillageQuality.submissionCount > 0 && (
                    <p className="mt-1 text-[10px] text-foreground/60">
                      Based on {selectedVillageQuality.submissionCount} submission
                      {selectedVillageQuality.submissionCount === 1 ? '' : 's'}.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-brand-umber/20 bg-brand-oatmeal/60 p-3 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                      <Navigation className="w-3.5 h-3.5 text-primary" />
                      GPS Coverage
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded-full ${selectedVillageQuality.statuses.gps.tone}`}
                    >
                      {selectedVillageQuality.statuses.gps.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {selectedVillageQuality.gpsCompleteness !== null
                      ? `${selectedVillageQuality.gpsCompleteness}%`
                      : '—'}
                  </div>
                  <p className="mt-1.5 text-[11px] text-foreground/70">
                    {selectedVillageQuality.householdsWithGps} geo-tagged submission
                    {selectedVillageQuality.householdsWithGps === 1 ? '' : 's'}
                    {selectedVillageQuality.missingGps > 0
                      ? ` • ${selectedVillageQuality.missingGps} missing GPS`
                      : ''}
                  </p>
                </div>

                <div className="rounded-xl border border-brand-umber/20 bg-brand-oatmeal/60 p-3 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                      <Clock className="w-3.5 h-3.5 text-secondary" />
                      Recent Activity
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded-full ${selectedVillageQuality.statuses.recency.tone}`}
                    >
                      {selectedVillageQuality.statuses.recency.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {selectedVillageQuality.daysSinceLastSubmission === null
                      ? '—'
                      : selectedVillageQuality.daysSinceLastSubmission === 0
                        ? 'Today'
                        : `${selectedVillageQuality.daysSinceLastSubmission}d`}
                  </div>
                  <p className="mt-1.5 text-[11px] text-foreground/70">
                    {selectedVillageQuality.daysSinceLastSubmission === null
                      ? 'No submissions recorded yet'
                      : selectedVillageQuality.daysSinceLastSubmission === 0
                        ? 'Submissions recorded today'
                        : `${selectedVillageQuality.daysSinceLastSubmission} day(s) since last submission`}
                  </p>
                  <p className="mt-1.5 text-[10px] text-foreground/60">
                    Last logged: {selectedVillageQuality.latestSubmissionLabel}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/80 rounded-2xl shadow-[0_18px_30px_-24px_rgba(43,37,57,0.3)] border border-brand-umber/25 flex-1 overflow-hidden backdrop-blur">
            <Map
              key={mapKey}
              villageTargets={villageTargets}
              selectedVillage={selectedVillage}
              showGaps={showGaps}
              showBuildings={showBuildings}
              userLocation={userLocation}
            />
          </div>
        </div>

        {/* Village Cards - 30% width */}
        <div className="w-[30%] p-6 pl-0">
          <div className="bg-white/80 rounded-2xl shadow-[0_18px_30px_-24px_rgba(43,37,57,0.3)] border border-brand-umber/25 h-full overflow-hidden flex flex-col backdrop-blur">
            <div className="p-5 border-b border-brand-umber/20 bg-brand-oatmeal/50">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-wide uppercase">
                <Award className="w-5 h-5 text-primary" />
                Active Villages ({activeVillages.length})
              </h2>
              <p className="text-xs text-foreground/60 mt-1">Click a card to zoom to village</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {/* Info box when village is selected */}
              {selectedVillage && (
                <div className="bg-secondary/20 border border-secondary/40 rounded-xl p-4 mb-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🔍</span>
                    <div className="flex-1 text-xs">
                      <p className="font-semibold text-primary mb-1 uppercase tracking-[0.3em] text-[11px]">
                        Focused Village
                      </p>
                      <p className="text-foreground/70 leading-relaxed">
                        • Outlier GPS points excluded<br/>
                        • Grey dots = OSM building footprints<br/>
                        • Coral & sea polygons = survey gaps<br/>
                        • Quality cards above map show quantity, form quality, GPS coverage & recency<br/>
                        • Click gaps for tailored suggestions
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeVillages.length === 0 && (
                <div className="text-center py-8 text-foreground/50">
                  <p className="text-4xl mb-2">📊</p>
                  <p>No active surveys yet</p>
                  <p className="text-sm">Data will appear when surveys start</p>
                </div>
              )}

              {activeVillages.map(({ district, districtDisplay, village, villageDisplay, data }, index) => (
                <button
                  key={`${district}-${village}`}
                  onClick={() => handleVillageClick(district, village)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-[2px] ${
                    selectedVillage?.district === district && selectedVillage?.village === village
                      ? 'border-primary bg-primary/10'
                      : 'border-brand-umber/20 bg-white/80 hover:border-primary/40'
                  }`}
                >
                  {/* Leading village badge */}
                  {index === 0 && data.percentage > 0 && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-primary mb-2 uppercase tracking-[0.25em]">
                      <Award className="w-3 h-3" />
                      LEADING VILLAGE
                    </div>
                  )}

                  {/* Village name and landscape */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <span className="text-xl">{getProgressEmoji(data.percentage)}</span>
                        {villageDisplay}
                      </h3>
                      <p className="text-xs text-foreground/60">{districtDisplay}</p>
                    </div>
                    <span className="text-2xl font-bold text-foreground">
                      {data.percentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-brand-oatmeal rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all duration-300 ${getProgressColor(data.percentage)}`}
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-foreground/70">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      <span>{data.actual} / {data.expected} samples</span>
                    </div>
                    {data.optimalDays > 0 && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{data.optimalDays} days target</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{data.households.length} GPS points</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-danger text-danger-foreground p-4 rounded-lg shadow-lg max-w-md">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
