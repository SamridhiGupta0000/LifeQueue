/**
 * Visual priority score indicator with color gradient.
 */
export default function PriorityIndicator({ score = 0, showLabel = true, size = 'md' }) {
  // Determine color based on score
  let bgColor, borderColor, textColor;
  
  if (score >= 67) {
    bgColor = 'bg-green-500/10';
    borderColor = 'border-green-500/40';
    textColor = 'text-green-400';
  } else if (score >= 34) {
    bgColor = 'bg-yellow-500/10';
    borderColor = 'border-yellow-500/40';
    textColor = 'text-yellow-400';
  } else {
    bgColor = 'bg-red-500/10';
    borderColor = 'border-red-500/40';
    textColor = 'text-red-400';
  }

  // Size dimensions
  const sizeMap = {
    sm: { w: 'w-10', h: 'h-10', text: 'text-xs font-bold' },
    md: { w: 'w-12', h: 'h-12', text: 'text-sm font-bold' },
    lg: { w: 'w-16', h: 'h-16', text: 'text-xl font-bold' },
  };

  const dimensions = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center rounded-lg border-2 ${dimensions.w} ${dimensions.h} ${bgColor} ${borderColor}`}
      >
        <span className={`${textColor} ${dimensions.text}`}>{Math.round(score)}</span>
      </div>
      {showLabel && size === 'md' && (
        <div className="text-xs text-slate-400">
          <div>Priority</div>
        </div>
      )}
    </div>
  );
}
