"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";
import { Sidebar } from "./_components/Sidebar";
import { Topbar } from "./_components/Topbar";
import { ToastProvider } from "./_components/Toast";

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function logout() {
    await adminFetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <ToastProvider>
      <div className="admin-shell">
        <Sidebar
          pathname={pathname}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={logout}
        />
        <div className="admin-main">
          <Topbar onMenuClick={() => setSidebarOpen((open) => !open)} />
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
