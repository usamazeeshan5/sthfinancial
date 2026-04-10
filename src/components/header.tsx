"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, Bell, LogOut, User } from "lucide-react";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userName = session?.user?.name || "Admin";
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <button className="relative p-2 rounded-lg hover:bg-sidebar-hover transition-colors">
          <Bell className="w-5 h-5 text-muted" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* User avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
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
