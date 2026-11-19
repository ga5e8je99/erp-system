import { RouteLoadingSkeleton } from "@/components/shared/route-loading-skeleton";

export default function InventoryLoading() {
  return <RouteLoadingSkeleton type="table" rowCount={8} />;
}
