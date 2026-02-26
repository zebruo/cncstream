import { useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { HelpModal } from './components/help/HelpModal'
import { useMachineStatus } from './hooks/useMachineStatus'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useUIStore } from './stores/ui.store'

export function App() {
  const theme = useUIStore((s) => s.theme)

  useMachineStatus()
  useKeyboardShortcuts()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="app" data-theme={theme}>
      <AppLayout />
      <HelpModal />
    </div>
  )
}
