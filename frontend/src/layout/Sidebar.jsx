import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { navItems } from './navItems'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import AppIcon from '@/components/ui/AppIcon'

export default function Sidebar({ collapsed, onToggle, onRegister }) {
  const { user } = useAuth()
  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r border-border-soft bg-surface transition-[width] duration-200 ${collapsed ? 'w-[76px]' : 'w-[240px]'}`}
    >
      <div className="flex items-center h-16 px-4 gap-2.5 border-b border-border-soft">
        <AppIcon size={32} />
        {!collapsed && <span className="font-semibold text-[15px] tracking-tight">Cofre</span>}
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === ROUTES.dashboard}
            className={({ isActive }) =>
              `focus-ring flex items-center gap-3 rounded-control px-3 h-10 text-[14px] font-medium transition-colors ${
                isActive
                  ? 'bg-surface-3 text-text'
                  : 'text-text-muted hover:text-text hover:bg-surface-2'
              }`
            }
          >
            <Icon size={17} className="shrink-0" strokeWidth={2} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 flex flex-col gap-2 border-t border-border-soft">
        <NavLink to={ROUTES.settings} className="focus-ring flex min-h-10 items-center gap-2 rounded-control px-2 text-text-muted hover:bg-surface-2">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full" referrerPolicy="no-referrer" /> : <div className="h-7 w-7 shrink-0 rounded-full bg-income/15" />}
          {!collapsed && <div className="min-w-0"><p className="truncate text-[12px] font-medium text-text">{user?.name}</p><p className="truncate text-[10px]">{user?.email}</p></div>}
        </NavLink>
        <button
          onClick={onRegister}
          className="focus-ring flex items-center justify-center gap-2 h-11 rounded-control bg-income text-on-income font-medium text-[14px] hover:brightness-110 transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          {!collapsed && <span>Registrar</span>}
        </button>
        <button
          onClick={onToggle}
          className="focus-ring flex items-center justify-center gap-2 h-9 rounded-control text-text-faint hover:text-text-muted hover:bg-surface-2 transition-colors"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
    </aside>
  )
}
