import { SkeletonBlock } from "@/components/ui/primitives";

export default function CoachLoading() {
  return (
    <div className="page" aria-busy="true" aria-labelledby="coach-loading-title" role="status">
      <h1 className="sr-only" id="coach-loading-title">Loading coach tools</h1>
      <SkeletonBlock variant="card" />
      <div className="grid two">
        <SkeletonBlock variant="card" />
        <SkeletonBlock variant="card" />
      </div>
      <SkeletonBlock lines={4} />
    </div>
  );
}
