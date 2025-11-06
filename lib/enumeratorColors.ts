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
  // Helper function to validate enumerator code format (E followed by number)
  const isValidEnumeratorCode = (value: any): boolean => {
    if (!value) return false;
    const str = String(value).trim();
    return /^E\d+$/i.test(str); // Matches E1, E2, E10, etc. (case insensitive)
  };

  // List of possible field names to check
  const possibleFields = [
    'Enumerator Code',
    'enumerator_code',
    'grp_general/Enumerator Code',
    'grp_general/enumerator_code',
    'enumeratorCode',
    'enumerator_id',
    '_enumerator_id',
    'enum_id',
    'enumid',
    'interviewer_id',
    'interviewerId',
  ];

  // Find the first field that contains a valid E-code
  let enumeratorCode = null;
  for (const fieldName of possibleFields) {
    const value = submission[fieldName];
    if (isValidEnumeratorCode(value)) {
      enumeratorCode = String(value).trim().toUpperCase(); // Normalize to uppercase
      break;
    }
  }

  // If no valid E-code found, return null
  if (!enumeratorCode) {
    return null;
  }

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
    submission.interviewerName;

  return {
    id: enumeratorCode,
    name: enumeratorName ? String(enumeratorName) : enumeratorCode,
  };
}
