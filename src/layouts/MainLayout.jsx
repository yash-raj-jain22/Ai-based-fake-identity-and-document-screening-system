import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"

export function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/40">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden border-r bg-slate-950 sm:block sm:w-64">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64 bg-slate-950 border-r-slate-800">
            <Sidebar isMobile onClose={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col sm:pl-0">
          <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 items-start p-4 sm:px-6 sm:py-6 md:gap-8">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
