import { X, Calendar, MapPin, TrendingUp } from 'lucide-react';
import type { ComparisonVillage } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ComparisonPanelProps {
  villages: ComparisonVillage[];
  onRemove: (district: string, village: string) => void;
  onClose: () => void;
}

export default function ComparisonPanel({ villages, onRemove, onClose }: ComparisonPanelProps) {
  const chartData = villages.map((v) => ({
    name: v.village,
    actual: v.data.actual,
    expected: v.data.expected,
    percentage: v.data.percentage,
  }));

  const getColorClass = (percentage: number) => {
    if (percentage >= 80) return 'border-secondary/50 bg-secondary/30';
    if (percentage >= 50) return 'border-brand-chartreuse/60 bg-brand-chartreuse/30';
    return 'border-brand-coral/60 bg-brand-coral/30';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-secondary';
    if (percentage >= 50) return 'bg-brand-chartreuse';
    return 'bg-brand-coral';
  };

  return (
    <div className="mt-6 bg-white/80 rounded-2xl p-6 shadow-[0_18px_30px_-24px_rgba(43,37,57,0.3)] border border-brand-umber/25 backdrop-blur">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground tracking-wide uppercase">
          Village Comparison ({villages.length}/4)
        </h2>
        <button
          onClick={onClose}
          className="text-foreground/60 hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chart */}
      <div className="mb-6 bg-brand-oatmeal/60 rounded-xl p-4 border border-brand-umber/20">
        <h3 className="text-sm font-medium text-foreground/80 mb-4 uppercase tracking-[0.2em]">
          Progress Comparison
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DAD6CC" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#2B2539',
                border: 'none',
                borderRadius: '8px',
                color: '#EBE9E4',
              }}
            />
            <Legend />
            <Bar dataKey="actual" fill="#2B2539" name="Actual" />
            <Bar dataKey="expected" fill="#BED3CC" name="Expected" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Village Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {villages.map((village) => (
          <div
            key={`${village.district}-${village.village}`}
            className={`relative border-2 rounded-lg p-4 ${getColorClass(
              village.data.percentage
            )}`}
          >
            <button
              onClick={() => onRemove(village.district, village.village)}
              className="absolute top-2 right-2 p-1 bg-white/80 rounded-full shadow hover:bg-brand-oatmeal/80"
            >
              <X className="w-3 h-3" />
            </button>

            <div className="mb-3">
              <h3 className="font-semibold text-foreground">
                {village.data.village}
              </h3>
              <p className="text-xs text-foreground/60">{village.data.district}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/70">Progress</span>
                <span className="text-lg font-bold text-foreground">
                  {village.data.percentage}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/60">Submissions</span>
                <span className="text-sm font-medium text-foreground/80">
                  {village.data.actual}/{village.data.expected}
                </span>
              </div>

              {village.data.optimalDays > 0 && (
                <div className="flex items-center gap-1 text-xs text-foreground/60">
                  <Calendar className="w-3 h-3" />
                  <span>{village.data.optimalDays} days</span>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-foreground/60">
                <MapPin className="w-3 h-3" />
                <span>{village.data.households.length} GPS points</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 w-full h-2 bg-brand-oatmeal rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getProgressColor(village.data.percentage)}`}
                style={{ width: `${village.data.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-brand-oatmeal/60 rounded-xl border border-brand-umber/20">
          <p className="text-2xl font-bold text-foreground">
            {Math.round(
              villages.reduce((acc, v) => acc + v.data.percentage, 0) / villages.length
            )}
            %
          </p>
          <p className="text-xs text-foreground/60 uppercase tracking-[0.2em]">Avg Progress</p>
        </div>
        <div className="text-center p-3 bg-brand-oatmeal/60 rounded-xl border border-brand-umber/20">
          <p className="text-2xl font-bold text-foreground">
            {villages.reduce((acc, v) => acc + v.data.actual, 0)}
          </p>
          <p className="text-xs text-foreground/60 uppercase tracking-[0.2em]">Total Submissions</p>
        </div>
        <div className="text-center p-3 bg-brand-oatmeal/60 rounded-xl border border-brand-umber/20">
          <p className="text-2xl font-bold text-foreground">
            {villages.reduce((acc, v) => acc + v.data.expected, 0)}
          </p>
          <p className="text-xs text-foreground/60 uppercase tracking-[0.2em]">Total Expected</p>
        </div>
      </div>
    </div>
  );
}
