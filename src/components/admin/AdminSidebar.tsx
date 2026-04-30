"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Home,
  CalendarCheck,
  MessageSquare,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/brugere", label: "Brugere", icon: Users },
  { href: "/admin/hytter", label: "Hytter", icon: Home },
  { href: "/admin/bookinger", label: "Bookinger", icon: CalendarCheck },
  { href: "/admin/anmodninger", label: "Anmodninger", icon: MessageSquare },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 bg-gray-900 text-gray-100 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Sila Admin</span>
        </Link>
        <p className="text-xs text-gray-400 mt-0.5">Kontrolpanel</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="h-3 w-3 text-gray-500" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          ← Tilbage til sila.gl
        </Link>
      </div>
    </aside>
  )
}
