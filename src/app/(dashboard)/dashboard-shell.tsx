"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
