import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { navItems } from './navItems'
import { ROUTES } from '@/constants/routes'

// Metade dos destinos de cada lado do botão central de ação rápida — cresce
// automaticamente se um dia um novo item entrar em navItems (colunas do
// grid abaixo escalam junto, 2 por item + 1 pra o botão central).
const half = Math.ceil(navItems.length / 2)
const leftItems = navItems.slice(0, half)
const rightItems = navItems.slice(half)

export default function BottomNav({ onRegister }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-surface/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div
        className="grid items-center h-16 px-1"
        style={{ gridTemplateColumns: `repeat(${leftItems.length}, 1fr) auto repeat(${rightItems.length}, 1fr)` }}
      >
        {leftItems.map(({ to, label, icon: Icon }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} />
        ))}

        <div className="flex items-center justify-center px-1.5">
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
      end={to === ROUTES.dashboard}
      className="focus-ring flex flex-col items-center justify-center gap-1 min-w-0 px-0.5"
    >
      {({ isActive }) => (
        <>
          <Icon size={19} strokeWidth={2} className={isActive ? 'text-income shrink-0' : 'text-text-faint shrink-0'} />
          <span className={`text-[9px] font-medium truncate max-w-full ${isActive ? 'text-income' : 'text-text-faint'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}
