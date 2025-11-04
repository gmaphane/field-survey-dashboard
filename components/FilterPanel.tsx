import { X, Search } from 'lucide-react';
import type { VillageTargets, FilterState } from '@/types';

interface FilterPanelProps {
  villageTargets: VillageTargets;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  onClose: () => void;
}

export default function FilterPanel({
  villageTargets,
  filters,
  setFilters,
  onClose,
}: FilterPanelProps) {
  const allDistricts = Object.keys(villageTargets);
  const allVillages = Object.values(villageTargets).flatMap((district) =>
    Object.keys(district)
  );

  const toggleDistrict = (district: string) => {
    setFilters({
      ...filters,
      districts: filters.districts.includes(district)
        ? filters.districts.filter((d) => d !== district)
        : [...filters.districts, district],
    });
  };

  const toggleVillage = (village: string) => {
    setFilters({
      ...filters,
      villages: filters.villages.includes(village)
        ? filters.villages.filter((v) => v !== village)
        : [...filters.villages, village],
    });
  };

  const clearFilters = () => {
    setFilters({
      districts: [],
      villages: [],
      completionRange: [0, 100],
      searchQuery: '',
    });
  };

  return (
    <div className="bg-white/80 rounded-2xl p-6 shadow-[0_18px_30px_-24px_rgba(43,37,57,0.3)] border border-brand-umber/25 mb-6 backdrop-blur">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground tracking-wide uppercase">
          Village Filters
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Search Villages
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-slate/40" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Search villages..."
              className="w-full pl-10 pr-3 py-2 bg-white/80 border border-brand-umber/20 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Completion Range */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Completion: {filters.completionRange[0]}% - {filters.completionRange[1]}%
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="100"
              value={filters.completionRange[0]}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  completionRange: [parseInt(e.target.value), filters.completionRange[1]],
                })
              }
              className="w-full accent-primary"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={filters.completionRange[1]}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  completionRange: [filters.completionRange[0], parseInt(e.target.value)],
                })
              }
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
