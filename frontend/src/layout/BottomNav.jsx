import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, Plus, X } from 'lucide-react'
import { navItems } from './navItems'
import { ROUTES } from '@/constants/routes'

const primaryRoutes = new Set([ROUTES.dashboard, ROUTES.history, ROUTES.cards])
const primaryItems = navItems.filter(({ to }) => primaryRoutes.has(to))
const secondaryItems = navItems.filter(({ to }) => !primaryRoutes.has(to))
const leftItems = primaryItems.slice(0, 2)
const rightItems = primaryItems.slice(2)

export default function BottomNav({ onRegister }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const secondaryRouteActive =
    pathname === ROUTES.synchronization ||
    secondaryItems.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`))

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [moreOpen])

  const handleRegister = () => {
    setMoreOpen(false)
    onRegister()
  }

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar mais opções"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id="mobile-more-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 max-h-[70dvh] overflow-y-auto rounded-[20px] border border-border-soft bg-surface p-4 shadow-2xl md:hidden"
            style={{ animation: 'mobile-menu-in 0.18s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 id="mobile-more-title" className="text-[15px] font-semibold text-text">
                Mais opções
              </h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar menu"
                className="focus-ring rounded-full p-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {secondaryItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `focus-ring flex min-h-16 items-center gap-3 rounded-control border px-3.5 transition-colors ${
                      isActive
                        ? 'border-income/30 bg-income/10 text-income'
                        : 'border-border-soft bg-surface-2 text-text hover:border-border hover:bg-surface-3'
                    }`
                  }
                >
                  <Icon size={22} strokeWidth={2} className="shrink-0" />
                  <span className="text-[13px] font-medium">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-soft bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        <div className="grid h-16 grid-cols-[1fr_1fr_auto_1fr_1fr] items-center px-2">
          {leftItems.map(({ to, label, icon: Icon }) => (
            <NavItem key={to} to={to} label={label} Icon={Icon} />
          ))}

          <div className="flex items-center justify-center px-2">
            <button
              type="button"
              onClick={handleRegister}
              aria-label="Registrar movimentação"
              className="focus-ring flex size-[52px] items-center justify-center rounded-full bg-income text-black shadow-[0_4px_20px_rgba(62,207,142,0.35)] transition-transform active:scale-95"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </div>

          {rightItems.map(({ to, label, icon: Icon }) => (
            <NavItem key={to} to={to} label={label} Icon={Icon} />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
            className="focus-ring flex min-w-0 flex-col items-center justify-center gap-1 px-1"
          >
            <Menu
              size={22}
              strokeWidth={2}
              className={moreOpen || secondaryRouteActive ? 'shrink-0 text-income' : 'shrink-0 text-text-faint'}
            />
            <span className={`text-[11px] font-medium ${moreOpen || secondaryRouteActive ? 'text-income' : 'text-text-faint'}`}>
              Mais
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}

function NavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      end={to === ROUTES.dashboard}
      className="focus-ring flex min-w-0 flex-col items-center justify-center gap-1 px-1"
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={2} className={isActive ? 'shrink-0 text-income' : 'shrink-0 text-text-faint'} />
          <span className={`max-w-full truncate text-[11px] font-medium ${isActive ? 'text-income' : 'text-text-faint'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}
