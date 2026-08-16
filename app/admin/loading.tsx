import { SkeletonBlock } from "@/components/ui/primitives";

export default function AdminLoading() {
  return (
    <div className="page" aria-busy="true" aria-labelledby="admin-loading-title" role="status">
      <h1 className="sr-only" id="admin-loading-title">Loading league office</h1>
      <SkeletonBlock variant="card" />
      <div className="grid two">
        <SkeletonBlock variant="card" />
        <SkeletonBlock variant="card" />
      </div>
      <SkeletonBlock lines={4} />
    </div>
  );
}
