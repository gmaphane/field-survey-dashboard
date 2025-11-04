import { ChevronDown, ChevronUp, Plus, Check, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { VillageTargets, ComparisonVillage } from '@/types';

interface VillageListProps {
  villageTargets: VillageTargets;
  onAddToComparison: (district: string, village: string) => void;
  comparisonVillages: ComparisonVillage[];
}

export default function VillageList({
  villageTargets,
  onAddToComparison,
  comparisonVillages,
}: VillageListProps) {
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());

  const toggleDistrict = (district: string) => {
    const newExpanded = new Set(expandedDistricts);
    if (newExpanded.has(district)) {
      newExpanded.delete(district);
    } else {
      newExpanded.add(district);
    }
    setExpandedDistricts(newExpanded);
  };

  const isInComparison = (district: string, village: string) => {
    return comparisonVillages.some(
      (v) => v.district === district && v.village === village
    );
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-primary';
    if (percentage >= 50) return 'bg-secondary';
    return 'bg-danger';
  };

  const getProgressColorLight = (percentage: number) => {
    if (percentage >= 80) return 'bg-primary/10 border-primary/30';
    if (percentage >= 50) return 'bg-secondary/20 border-secondary';
    return 'bg-danger/10 border-danger/30';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 80) return 'text-primary';
    if (percentage >= 50) return 'text-foreground/70';
    return 'text-danger';
  };

  return (
    <div className="bg-white/80 rounded-2xl shadow-[0_18px_30px_-24px_rgba(43,37,57,0.3)] border border-brand-umber/25 overflow-hidden backdrop-blur">
      <div className="p-5 border-b border-brand-umber/20 bg-brand-oatmeal/50">
        <h2 className="text-lg font-semibold text-foreground tracking-wide uppercase">
          Village Progress
        </h2>
        <p className="text-sm text-foreground/60">
          {Object.keys(villageTargets).length} landscapes
        </p>
      </div>

      <div className="overflow-y-auto max-h-[500px]">
        {Object.entries(villageTargets).map(([district, villages]) => {
          const districtTotal = Object.values(villages).reduce(
            (acc, v) => acc + v.expected,
            0
          );
          const districtActual = Object.values(villages).reduce(
            (acc, v) => acc + v.actual,
            0
          );
          const districtPercentage = Math.round((districtActual / districtTotal) * 100);
          const isExpanded = expandedDistricts.has(district);

          return (
            <div key={district} className="border-b border-brand-umber/20 last:border-0">
              <button
                onClick={() => toggleDistrict(district)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-brand-oatmeal/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getProgressColor(districtPercentage)}`} />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">
                      {villages[Object.keys(villages)[0]]?.district || district}
                    </p>
                    <p className="text-sm text-foreground/60">
                      {districtActual}/{districtTotal} ({districtPercentage}%)
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-brand-slate/40" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-brand-slate/40" />
                )}
              </button>

              {isExpanded && (
                <div className="bg-brand-oatmeal/60 px-5 py-3">
                  {Object.entries(villages).map(([villageName, villageData]) => (
                    <div
                      key={villageName}
                      className={`mb-2 p-3 rounded-lg border ${getProgressColorLight(
                        villageData.percentage
                      )}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {villageData.village}
                            </p>
                            <button
                              onClick={() => onAddToComparison(district, villageName)}
                              disabled={isInComparison(district, villageName)}
                              className={`p-1 rounded transition-colors ${
                                isInComparison(district, villageName)
                                  ? 'bg-primary text-primary-foreground cursor-not-allowed'
                                  : 'bg-white/80 text-foreground/70 hover:bg-brand-oatmeal/80'
                              }`}
                              title={
                                isInComparison(district, villageName)
                                  ? 'In comparison'
                                  : 'Add to comparison'
                              }
                            >
                              {isInComparison(district, villageName) ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Plus className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-foreground/70">
                              {villageData.actual}/{villageData.expected}
                            </p>
                            {villageData.optimalDays > 0 && (
                              <div className="flex items-center gap-1 text-xs text-foreground/60">
                                <Calendar className="w-3 h-3" />
                                <span>{villageData.optimalDays} days</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`text-lg font-bold ${getProgressTextColor(villageData.percentage)}`}>
                          {villageData.percentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-brand-oatmeal rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(
                            villageData.percentage
                          )} transition-all duration-300`}
                          style={{ width: `${villageData.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
