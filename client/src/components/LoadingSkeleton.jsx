export default function LoadingSkeleton({ lines = 4 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-line"
          style={{ width: `${90 - i * 8}%` }}
        />
      ))}
    </div>
  );
}
