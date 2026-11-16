import type { ReactNode } from 'react'
import styles from './Panel.module.css'

interface PanelProps {
  title: string
  children: ReactNode
  className?: string
  actions?: ReactNode
  onToggle?: () => void
  expanded?: boolean
}

export function Panel({ title, children, className, actions, onToggle, expanded }: PanelProps) {
  return (
    <div className={`${styles.panel} ${className ?? ''}`}>
      <div
        className={`${styles.header} ${onToggle ? styles.headerClickable : ''}`}
        role={onToggle ? 'button' : undefined}
        tabIndex={onToggle ? 0 : undefined}
        aria-expanded={onToggle ? expanded : undefined}
        onClick={onToggle}
        onKeyDown={
          onToggle
            ? (e) => {
                // Ignore les touches venant d'un contrôle imbriqué (bouton dans les actions)
                if (e.target !== e.currentTarget) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onToggle()
                }
              }
            : undefined
        }
      >
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.actions}>
          {actions}
          {onToggle && <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>}
        </div>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
