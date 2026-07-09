import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { navItems } from './navItems'

const [first, second, , fourth, fifth] = navItems

export default function BottomNav({ onRegister }) {
  const leftItems = [first, second]
  const rightItems = [fourth, fifth]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-surface/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 items-center h-16 px-2">
        {leftItems.map(({ to, label, icon: Icon }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} />
        ))}

        <div className="flex items-center justify-center">
          <button
            onClick={onRegister}
            aria-label="Registrar movimentação"
            className="focus-ring flex items-center justify-center rounded-full bg-income text-black shadow-[0_4px_20px_rgba(62,207,142,0.35)] active:scale-95 transition-transform"
            style={{ height: 52, width: 52 }}
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>

        {rightItems.map(({ to, label, icon: Icon }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} />
        ))}
      </div>
    </nav>
  )
}

function NavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className="focus-ring flex flex-col items-center justify-center gap-1"
    >
      {({ isActive }) => (
        <>
          <Icon size={20} strokeWidth={2} className={isActive ? 'text-income' : 'text-text-faint'} />
          <span className={`text-[10px] font-medium ${isActive ? 'text-income' : 'text-text-faint'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}
