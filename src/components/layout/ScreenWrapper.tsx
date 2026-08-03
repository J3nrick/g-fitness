import { Outlet } from 'react-router-dom'
import { NavigationBar } from './NavigationBar'

interface ScreenWrapperProps {
  hideNav?: boolean
}

export function ScreenWrapper({ hideNav = false }: ScreenWrapperProps) {
  return (
    <div className="min-h-screen bg-dirty text-jet text-sm">
      <div className="mx-auto max-w-md min-h-screen flex flex-col relative border-x-2 border-jet">
        <main className={`flex-1 p-3 ${hideNav ? 'pb-5' : 'pb-24'}`}>
          <Outlet />
        </main>
        {!hideNav && <NavigationBar />}
      </div>
    </div>
  )
}
