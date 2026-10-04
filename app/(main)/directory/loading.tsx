import {
  SkeletonTitle,
  SkeletonSearchBar,
  SkeletonRows,
  SkeletonLetter,
} from "@/components/Skeleton";

export default function DirectoryLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the directory">
      <SkeletonTitle />
      <SkeletonSearchBar />
      <div className="mt-3 flex gap-2 px-4">
        <div className="skeleton h-9 w-32 rounded-chip" />
        <div className="skeleton h-9 w-24 rounded-chip" />
      </div>
      {/* Mirrors the browsing state exactly — letter landmark, then rows —
          so the real list replaces this without anything moving */}
      <div className="mt-4">
        <SkeletonLetter />
        <SkeletonRows count={4} />
        <SkeletonLetter />
        <SkeletonRows count={3} />
      </div>
    </div>
  );
}
