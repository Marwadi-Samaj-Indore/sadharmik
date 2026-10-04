import { SkeletonTitle, SkeletonSearchBar } from "@/components/Skeleton";

export default function BusinessLoading() {
  return (
    <div aria-busy="true" aria-label="Loading businesses">
      <SkeletonTitle />
      <SkeletonSearchBar />
      <div className="mt-6 grid grid-cols-2 gap-2 px-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton h-24 rounded-card" />
        ))}
      </div>
    </div>
  );
}
