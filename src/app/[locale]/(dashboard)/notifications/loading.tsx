import { RouteLoadingSkeleton } from "@/components/shared/route-loading-skeleton";

export default function NotificationsLoading() {
  return <RouteLoadingSkeleton type="cards" cardCount={6} />;
}
