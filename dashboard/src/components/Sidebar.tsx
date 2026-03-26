"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/matching", label: "Matching", icon: "🔗" },
  { href: "/users", label: "Users", icon: "👥" },
  { href: "/reports", label: "Reports", icon: "🚩" },
  { href: "/selfie-review", label: "Selfie Review", icon: "📸" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/waitlist", label: "Waitlist", icon: "📋" },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-pink-400">Yuni</h1>
        <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-pink-500/10 text-pink-400"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors text-left"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
