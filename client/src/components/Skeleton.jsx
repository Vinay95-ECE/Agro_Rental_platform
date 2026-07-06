import React from 'react';

const shimmer = 'animate-pulse bg-slate-800 rounded';

// ─── Base skeleton block ────────────────────────────────────────────────────────
export const SkeletonBlock = ({ className = '' }) => (
  <div className={`${shimmer} ${className}`} />
);

// ─── Text line skeleton ─────────────────────────────────────────────────────────
export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`${shimmer} h-3 rounded`}
        style={{ width: i === lines - 1 ? '65%' : '100%' }}
      />
    ))}
  </div>
);

// ─── Card skeleton ──────────────────────────────────────────────────────────────
export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 ${className}`}>
    <div className={`${shimmer} w-full h-44 rounded-xl`} />
    <SkeletonText lines={3} />
    <div className="flex justify-between items-center pt-1">
      <div className={`${shimmer} h-8 w-24 rounded-lg`} />
      <div className={`${shimmer} h-8 w-28 rounded-lg`} />
    </div>
  </div>
);

// ─── Tool/Crop grid skeleton ────────────────────────────────────────────────────
export const SkeletonGrid = ({ count = 6, cols = 3 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-6`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// ─── Table row skeleton ─────────────────────────────────────────────────────────
export const SkeletonTableRow = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className={`${shimmer} h-4 rounded`} style={{ width: `${60 + Math.random() * 40}%` }} />
      </td>
    ))}
  </tr>
);

// ─── Table skeleton ─────────────────────────────────────────────────────────────
export const SkeletonTable = ({ rows = 5, cols = 5 }) => (
  <div className="overflow-hidden rounded-xl border border-slate-800">
    <table className="w-full">
      <thead className="bg-slate-900">
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <div className={`${shimmer} h-3 rounded w-20`} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Dashboard stat card skeleton ───────────────────────────────────────────────
export const SkeletonStatCard = () => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
    <div className="flex justify-between items-start">
      <div className={`${shimmer} h-4 w-28 rounded`} />
      <div className={`${shimmer} h-10 w-10 rounded-xl`} />
    </div>
    <div className={`${shimmer} h-8 w-20 rounded`} />
    <div className={`${shimmer} h-3 w-32 rounded`} />
  </div>
);

// ─── Profile card skeleton ───────────────────────────────────────────────────────
export const SkeletonProfile = () => (
  <div className="flex items-center gap-4">
    <div className={`${shimmer} h-16 w-16 rounded-full`} />
    <div className="space-y-2 flex-1">
      <div className={`${shimmer} h-4 w-32 rounded`} />
      <div className={`${shimmer} h-3 w-24 rounded`} />
      <div className={`${shimmer} h-3 w-40 rounded`} />
    </div>
  </div>
);

// ─── Chat message skeleton ───────────────────────────────────────────────────────
export const SkeletonMessage = ({ fromMe = false }) => (
  <div className={`flex items-end gap-2 ${fromMe ? 'flex-row-reverse' : ''}`}>
    {!fromMe && <div className={`${shimmer} h-8 w-8 rounded-full flex-shrink-0`} />}
    <div className={`space-y-1 max-w-xs`}>
      <div className={`${shimmer} h-10 rounded-2xl ${fromMe ? 'w-48' : 'w-56'}`} />
    </div>
  </div>
);

// ─── Page loading overlay ────────────────────────────────────────────────────────
export const PageLoader = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
    </div>
    <p className="text-sm text-slate-400">{message}</p>
  </div>
);

// ─── Inline spinner ─────────────────────────────────────────────────────────────
export const Spinner = ({ size = 16, className = '' }) => (
  <div
    className={`rounded-full border-2 border-transparent border-t-current animate-spin flex-shrink-0 ${className}`}
    style={{ width: size, height: size }}
  />
);

export default SkeletonCard;
