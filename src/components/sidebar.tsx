"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Settings,
  Percent,
  Nfc,
  X,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Payouts", href: "/payouts", icon: Wallet },
  { label: "NFC Chips", href: "/nfc-chips", icon: Nfc },
  { label: "Fees", href: "/fees", icon: Percent },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name || "Admin";
  const userEmail = session?.user?.email || "admin@lovetap.me";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 border-r border-border bg-sidebar flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              lovetap.me
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-sidebar-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-active text-foreground"
                    : "text-muted hover:bg-sidebar-hover hover:text-foreground"
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer with user info + logout */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-5 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger-light transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
