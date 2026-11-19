import { RouteLoadingSkeleton } from "@/components/shared/route-loading-skeleton";

export default function SalesLoading() {
  return <RouteLoadingSkeleton type="table" rowCount={8} />;
}
