import { useState, useRef, useLayoutEffect } from 'react'
import styles from './Tooltip.module.css'

interface TooltipProps {
  text: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Tooltip({ text, children, className, style: triggerStyle }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tipRect = tooltipRef.current.getBoundingClientRect()
    const margin = 8

    let x = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2
    const y = triggerRect.top - tipRect.height - 6

    x = Math.max(margin, Math.min(window.innerWidth - tipRect.width - margin, x))

    setPos({ left: x, top: y, visibility: 'visible' })
  }, [visible])

  if (!text) return <>{children}</>

  return (
    <>
      <span
        ref={triggerRef}
        className={`${styles.trigger}${className ? ` ${className}` : ''}`}
        style={triggerStyle}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => { setVisible(false); setPos({}) }}
      >
        {children}
      </span>
      {visible && (
        <div
          ref={tooltipRef}
          className={styles.tooltip}
          style={{ visibility: 'hidden', ...pos }}
        >
          {text}
        </div>
      )}
    </>
  )
}
