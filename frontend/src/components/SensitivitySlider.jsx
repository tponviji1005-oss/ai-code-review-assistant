export default function SensitivitySlider({ value, onChange, total, filtered }) {
  const hidden = total - filtered;
  const noisePct = total > 0 ? Math.round((hidden / total) * 100) : 0;

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-semibold">Chill</span>
        <span className="text-sm font-medium">Sensitivity: {value}</span>
        <span className="text-xs text-gray-500 font-semibold">Assertive</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Show all</span>
        <span>Show only high-confidence</span>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Showing <strong>{filtered}</strong> of <strong>{total}</strong> total issues
        {hidden > 0 && (
          <span className="text-gray-400">
            {' — '}Filtered out {hidden} low-confidence suggestions (noise reduction: {noisePct}%)
          </span>
        )}
      </p>
    </div>
  );
}
