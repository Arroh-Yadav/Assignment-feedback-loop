"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleNotificationClick = async (n: NotificationItem) => {
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    setOpen(false);
    try {
      await fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" });
    } catch {
      // Non-critical — worst case it reappears on next poll
    }
    if (n.linkUrl) {
      router.push(n.linkUrl);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ border: "1px solid rgba(255,255,255,0.2)" }}
        aria-label="Notifications"
      >
        <span className="text-white text-sm">🔔</span>
        {notifications.length > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: "#EF4444" }}
          >
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl overflow-hidden shadow-2xl z-50"
          style={{
            backgroundColor: "#0f0f23",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-white text-sm font-medium">Notifications</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <span className="text-3xl">🔕</span>
                <p className="text-white/40 text-xs">
                  You&apos;re all caught up.
                </p>
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-xs font-medium">
                        {n.title}
                      </p>
                      <span className="text-white/30 text-[10px] flex-shrink-0 mt-0.5">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-white/50 text-xs mt-1 leading-relaxed">
                      {n.message}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
