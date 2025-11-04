import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

export default function StatsCard({ title, value, icon, trend, subtitle }: StatsCardProps) {
  const trendColors = {
    up: 'text-primary',
    down: 'text-danger',
    neutral: 'text-secondary',
  };

  const trendIcon = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingDown className="w-4 h-4" />,
    neutral: <Minus className="w-4 h-4" />,
  };

  return (
    <div className="bg-white/80 rounded-2xl p-6 shadow-[0_18px_30px_-24px_rgba(43,37,57,0.28)] border border-brand-umber/25 hover:shadow-[0_24px_34px_-24px_rgba(43,37,57,0.35)] transition-shadow backdrop-blur">
      <div className="flex items-start justify-between mb-4">
        <div className="bg-primary/15 p-3 rounded-xl">
          <div className="w-5 h-5 text-primary">{icon}</div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${trendColors[trend]}`}>
            {trendIcon[trend]}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-foreground/70 mb-1 uppercase tracking-[0.2em]">{title}</p>
        <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
        {subtitle && (
          <p className="text-xs text-foreground/60">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
