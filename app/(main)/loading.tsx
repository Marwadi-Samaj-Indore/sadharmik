import { SkeletonLine, SkeletonSearchBar, SkeletonCard } from "@/components/Skeleton";

export default function HomeLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* Mirrors the real header: dateline, greeting, masthead */}
      <header className="px-4 pt-5 pb-3">
        <SkeletonLine w="6.5rem" h="0.6rem" />
        <SkeletonLine w="9rem" h="0.8rem" className="mt-2" />
        <SkeletonLine w="11rem" h="1.6rem" className="mt-2" />
      </header>
      <SkeletonSearchBar />
      <div className="mt-6 space-y-3 px-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
