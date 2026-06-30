"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, Bell, LogOut, UserPlus, Banknote, CircleDollarSign, AlertTriangle } from "lucide-react";

type Notification = {
  id: string;
  type: "customer" | "payout" | "transaction" | "alert";
  title: string;
  message: string;
  createdAt: string;
  href: string;
};

const LAST_SEEN_KEY = "notif_last_seen";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function iconFor(type: Notification["type"]) {
  switch (type) {
    case "customer": return <UserPlus className="w-4 h-4 text-accent" />;
    case "payout": return <Banknote className="w-4 h-4 text-warning" />;
    case "transaction": return <CircleDollarSign className="w-4 h-4 text-success" />;
    case "alert": return <AlertTriangle className="w-4 h-4 text-danger" />;
  }
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const userName = session?.user?.name || "Admin";
  const userInitial = userName.charAt(0).toUpperCase();

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      const list: Notification[] = data.notifications || [];
      setNotifications(list);
      const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
      setUnread(list.filter((n) => new Date(n.createdAt).getTime() > lastSeen).length);
    } catch {
      // ignore fetch errors
    }
  }, []);

  // Load on mount and poll every 60s.
  useEffect(() => {
    const initial = setTimeout(loadNotifications, 0);
    const t = setInterval(loadNotifications, 60000);
    return () => { clearTimeout(initial); clearInterval(t); };
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openNotifications = () => {
    const next = !showNotif;
    setShowNotif(next);
    setShowMenu(false);
    if (next) {
      // Mark everything currently shown as seen.
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      setUnread(0);
    }
  };

  const goTo = (href: string) => {
    setShowNotif(false);
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 border-b border-border bg-card/80 backdrop-blur-sm">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-sidebar-hover lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotifications}
            className="relative p-2 rounded-lg hover:bg-sidebar-hover transition-colors"
          >
            <Bell className="w-5 h-5 text-muted" />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-danger text-white text-[10px] font-semibold rounded-full">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold">Notifications</p>
                {notifications.length > 0 && (
                  <span className="text-xs text-muted">{notifications.length}</span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted">
                    You&apos;re all caught up
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => goTo(n.href)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-background transition-colors border-b border-border last:border-0"
                    >
                      <div className="mt-0.5 shrink-0">{iconFor(n.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-muted mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { setShowMenu(!showMenu); setShowNotif(false); }}
            className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent hover:bg-accent/20 transition-colors"
          >
            {userInitial}
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted truncate">
                  {session?.user?.email}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-danger hover:bg-danger-light transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
