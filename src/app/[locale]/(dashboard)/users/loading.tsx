import { RouteLoadingSkeleton } from "@/components/shared/route-loading-skeleton";

export default function UsersLoading() {
  return <RouteLoadingSkeleton type="table" rowCount={8} />;
}
