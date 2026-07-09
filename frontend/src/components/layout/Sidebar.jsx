import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, Plus, Vault } from 'lucide-react'
import { navItems } from './navItems'

export default function Sidebar({ collapsed, onToggle, onRegister }) {
  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r border-border-soft bg-surface transition-[width] duration-200 ${collapsed ? 'w-[76px]' : 'w-[240px]'}`}
    >
      <div className="flex items-center h-16 px-4 gap-2.5 border-b border-border-soft">
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-income/15 text-income shrink-0">
          <Vault size={17} />
        </div>
        {!collapsed && <span className="font-semibold text-[15px] tracking-tight">Cofre</span>}
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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
        <button
          onClick={onRegister}
          className="focus-ring flex items-center justify-center gap-2 h-11 rounded-control bg-income text-black font-medium text-[14px] hover:brightness-110 transition-all"
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
