import { NavLink } from 'react-router-dom'
import { Dumbbell, UtensilsCrossed, Bot, User } from 'lucide-react'

const tabs = [
  { to: '/', label: 'G!', icon: null as null },
  { to: '/bakal', label: 'Bakal', icon: Dumbbell },
  { to: '/lamon', label: 'Lamon', icon: UtensilsCrossed },
  { to: '/coach', label: 'Coach', icon: Bot },
  { to: '/ako', label: 'Ako', icon: User },
]

export function NavigationBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-md border-t-2 border-jet bg-concrete">
        <ul className="grid grid-cols-5">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[9px] font-bold uppercase tracking-wide border-r-2 border-jet last:border-r-0 ${
                    isActive ? 'bg-jeepney text-dirty' : 'bg-concrete text-jet hover:bg-mango'
                  }`
                }
              >
                {Icon ? (
                  <Icon size={15} strokeWidth={2.25} />
                ) : (
                  <img src="/favicon.png" alt="" className="h-[15px] w-[15px] object-cover border border-jet" />
                )}
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
