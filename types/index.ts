export interface VillageTarget {
  district: string;
  village: string;
  expected: number;
  optimalDays: number;
  actual: number;
  percentage: number;
  households: Household[];
}

export interface Household {
  lat: number;
  lon: number;
  data: any;
  enumeratorId?: string;
  enumeratorName?: string;
}

export interface BuildingCentroid {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface DistrictData {
  [village: string]: VillageTarget;
}

export interface VillageTargets {
  [district: string]: DistrictData;
}

export interface KoBoSubmission {
  _id?: number;
  _gps?: string | number[] | { latitude: number; longitude: number };
  gps?: string | number[] | { latitude: number; longitude: number };
  _geolocation?: string | number[] | { latitude: number; longitude: number };
  district?: string;
  District?: string;
  _district?: string;
  village?: string;
  Village?: string;
  _village?: string;
  [key: string]: any;
}

export interface FilterState {
  districts: string[];
  villages: string[];
  completionRange: [number, number];
  searchQuery: string;
}

export interface ComparisonVillage {
  district: string;
  village: string;
  data: VillageTarget;
}

export interface EnumeratorInfo {
  id: string;
  name: string;
  color: string;
  submissionCount: number;
  gpsSubmissionCount: number;
  missingGpsCount: number;
}
