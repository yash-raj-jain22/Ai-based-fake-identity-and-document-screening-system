import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, FileScan, History, FolderOpen, ShieldCheck, Bell, Settings, Users, LogOut, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { useAuth } from "@/context/AuthContext"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "New Screening", href: "/screenings/new", icon: FileScan },
  { name: "Screening History", href: "/screenings", icon: History },
  { name: "Cases", href: "/cases", icon: FolderOpen },
  { name: "Audit Logs", href: "/audit-logs", icon: ShieldCheck },
  { name: "Notifications", href: "/notifications", icon: Bell },
]

const settingsNav = [
  { name: "Administration", href: "/admin", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar({ className, isMobile, onClose }) {
  const location = useLocation()
  const { logout, user } = useAuth()

  return (
    <div className={cn("flex h-full flex-col bg-slate-950 text-slate-300", className)}>
      <div className="flex h-14 items-center px-4 border-b border-slate-800 font-bold text-lg text-white">
        <ShieldCheck className="mr-2 h-6 w-6 text-blue-500" />
        <span>DocuScreen AI</span>
      </div>
      
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          <div className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Screening
          </div>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-500" : "text-slate-400 group-hover:text-blue-500"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}

          <div className="mt-8 mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            System
          </div>
          {settingsNav.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  "group flex items-center rounded-md px-2 py-2 text-sm font-medium",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-500" : "text-slate-400 group-hover:text-blue-500"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <Button 
          variant="ghost" 
          onClick={logout}
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800" 
          asChild
        >
          <Link to="/login">
            <LogOut className="mr-3 h-5 w-5 text-slate-400" />
            Sign Out
          </Link>
        </Button>
      </div>
    </div>
  )
}
