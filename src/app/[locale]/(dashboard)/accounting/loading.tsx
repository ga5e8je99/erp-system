import { RouteLoadingSkeleton } from "@/components/shared/route-loading-skeleton";

export default function AccountingLoading() {
  return <RouteLoadingSkeleton type="table" rowCount={8} />;
}
