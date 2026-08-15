import React from "react";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationItem({ n, onMarkRead }: { n: any; onMarkRead: (id: number) => void }) {
  return (
    <div
      className={`flex items-start gap-4 p-4 hover:bg-gray-50/50 transition-colors cursor-pointer ${!n.isRead ? "bg-green-50/30" : ""}`}
      onClick={() => !n.isRead && onMarkRead(n.id)}
    >
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.isRead ? "bg-[#118847]/10" : "bg-gray-100"}`}>
        <Bell className={`h-4 w-4 ${!n.isRead ? "text-[#118847]" : "text-gray-400"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${!n.isRead ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
          {!n.isRead && <Circle className="h-2 w-2 fill-[#118847] text-[#118847] shrink-0" />}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
      </div>
      {n.type && (
        <Badge variant="outline" className="text-xs capitalize shrink-0">{n.type.replace(/_/g, " ")}</Badge>
      )}
    </div>
  );
}

export default function Notifications() {
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = unreadOnly ? { unreadOnly: "true" } : {};
  const { data, isLoading } = useListNotifications(params as any, {
    query: { queryKey: getListNotificationsQueryKey(params as any) }
  });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = (data as any)?.data ?? [];
  const unreadCount = (data as any)?.unreadCount ?? 0;

  function handleMarkRead(id: number) {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({ unreadOnly: "true" } as any) });
      },
    });
  }

  function handleMarkAllRead() {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({ unreadOnly: "true" } as any) });
        toast({ title: "All notifications marked as read" });
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-[#118847] text-white hover:bg-[#0e7038]">{unreadCount} unread</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Stay updated on all your tasks and activities.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            className={unreadOnly ? "bg-[#118847] hover:bg-[#0e7038]" : ""}
            onClick={() => setUnreadOnly(!unreadOnly)}
            size="sm"
          >
            {unreadOnly ? "Show all" : "Unread only"}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2" disabled={markAllRead.isPending}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                {unreadOnly ? "No unread notifications." : "You are all caught up."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n: any) => (
                <NotificationItem key={n.id} n={n} onMarkRead={handleMarkRead} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
