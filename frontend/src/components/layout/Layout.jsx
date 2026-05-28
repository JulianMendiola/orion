import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex h-screen bg-bg overflow-hidden grain">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  )
}
