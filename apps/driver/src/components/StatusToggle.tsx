import clsx from 'clsx'
import type { Driver } from '../types'

interface StatusToggleProps {
  status: Driver['status']
  onChange: (status: Driver['status']) => void
}

const statuses: { value: Driver['status']; label: string; color: string }[] = [
  { value: 'offline', label: 'Hors ligne', color: 'bg-gray-400' },
  { value: 'available', label: 'Disponible', color: 'bg-green-500' },
  { value: 'busy', label: 'Occupé', color: 'bg-orange-500' },
]

export default function StatusToggle({ status, onChange }: StatusToggleProps) {
  return (
    <div className="card p-2">
      <div className="flex items-center gap-2">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            disabled={s.value === 'busy' && status !== 'busy'}
            className={clsx(
              'flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all',
              status === s.value
                ? `${s.color} text-white shadow-md`
                : 'bg-gray-100 text-gray-500',
              s.value === 'busy' && status !== 'busy' && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              {status === s.value && (
                <span className={clsx(
                  'w-2 h-2 rounded-full bg-white',
                  s.value === 'available' && 'animate-pulse'
                )} />
              )}
              {s.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
