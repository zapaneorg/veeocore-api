import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'bg-primary-100 text-primary-600',
  loading = false,
}: StatsCardProps) {
  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-gray-200 rounded-xl" />
          <div className="w-16 h-6 bg-gray-200 rounded" />
        </div>
        <div className="mt-4">
          <div className="w-24 h-8 bg-gray-200 rounded" />
          <div className="w-32 h-4 bg-gray-100 rounded mt-2" />
        </div>
      </div>
    );
  }

  const changeColors = {
    positive: 'text-emerald-600 bg-emerald-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-100',
  };

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={24} />
        </div>
        {change && (
          <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${changeColors[changeType]}`}>
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
      </div>
    </div>
  );
}
