import { Sidebar } from "@/components/sidebar"
import { ToastContainer } from "@/components/toast-container"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 pl-[var(--sidebar-w)] min-h-screen flex flex-col"
        style={{ "--sidebar-w": "248px" } as React.CSSProperties}
      >
        {children}
      </main>
      <ToastContainer />
    </div>
  )
}
