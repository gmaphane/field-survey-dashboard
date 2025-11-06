// Generate consistent colors for enumerators
const ENUMERATOR_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
  '#8B5A00', // Brown
  '#7C3AED', // Violet
  '#059669', // Emerald
  '#DC2626', // Bright Red
  '#2563EB', // Dark Blue
  '#CA8A04', // Yellow
  '#9333EA', // Fuchsia
  '#0D9488', // Dark Teal
];

export function getEnumeratorColor(enumeratorId: string, allEnumeratorIds: string[]): string {
  const sortedIds = [...allEnumeratorIds].sort();
  const index = sortedIds.indexOf(enumeratorId);

  if (index === -1) {
    return '#6B7280'; // Gray fallback
  }

  return ENUMERATOR_COLORS[index % ENUMERATOR_COLORS.length];
}

export function extractEnumeratorInfo(submission: any): { id: string; name: string } | null {
  // Try to find the Enumerator Code field from KoBoToolbox
  // Check both the direct field and grouped field patterns
  const enumeratorCode =
    submission['Enumerator Code'] ||
    submission['enumerator_code'] ||
    submission.enumerator_code ||
    submission['grp_general/Enumerator Code'] ||
    submission['grp_general/enumerator_code'] ||
    submission.enumeratorCode ||
    submission.enumerator_id ||
    submission._enumerator_id ||
    submission.enum_id ||
    submission.enumid ||
    submission.interviewer_id ||
    submission.interviewerId ||
    submission._submitted_by ||
    submission.username;

  // Try to find enumerator name (optional)
  const enumeratorName =
    submission['Enumerator Name'] ||
    submission['enumerator_name'] ||
    submission.enumerator_name ||
    submission['grp_general/Enumerator Name'] ||
    submission['grp_general/enumerator_name'] ||
    submission.enumeratorName ||
    submission._enumerator_name ||
    submission.enum_name ||
    submission.enumname ||
    submission.interviewer_name ||
    submission.interviewerName ||
    submission._username;

  if (!enumeratorCode) {
    return null;
  }

  return {
    id: String(enumeratorCode),
    name: enumeratorName ? String(enumeratorName) : String(enumeratorCode),
  };
}
