import { SkeletonTitle, SkeletonLine } from "@/components/Skeleton";

export default function FeedLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the feed">
      <SkeletonTitle />
      <div className="flex gap-2 px-4">
        <div className="skeleton h-9 w-36 rounded-chip" />
        <div className="skeleton h-9 w-36 rounded-chip" />
      </div>
      <div className="mt-5 space-y-3 px-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card p-4">
            <SkeletonLine w="8rem" h="0.7rem" />
            <SkeletonLine w="85%" h="1rem" className="mt-2.5" />
            <SkeletonLine w="95%" h="0.75rem" className="mt-2" />
            <SkeletonLine w="60%" h="0.75rem" className="mt-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
