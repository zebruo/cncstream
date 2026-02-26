import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useConsoleStore } from '../../stores/console.store'
import { useConnectionStore } from '../../stores/connection.store'
import styles from './ConsolePanel.module.css'

export function ConsolePanel() {
  const lines = useConsoleStore((s) => s.lines)
  const commandHistory = useConsoleStore((s) => s.commandHistory)
  const historyIndex = useConsoleStore((s) => s.historyIndex)
  const addLine = useConsoleStore((s) => s.addLine)
  const addCommand = useConsoleStore((s) => s.addCommand)
  const setHistoryIndex = useConsoleStore((s) => s.setHistoryIndex)
  const clearConsole = useConsoleStore((s) => s.clear)
  const isConnected = useConnectionStore((s) => s.state) === 'connected'

  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [lines])

  const handleSend = useCallback(() => {
    const cmd = input.trim()
    if (!cmd || !isConnected) return

    addLine('sent', cmd)
    addCommand(cmd)
    window.cncstream.sendCommand(cmd)
    setInput('')
  }, [input, isConnected, addLine, addCommand])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length === 0) return
      const newIdx = Math.min(historyIndex + 1, commandHistory.length - 1)
      setHistoryIndex(newIdx)
      setInput(commandHistory[newIdx])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex <= 0) {
        setHistoryIndex(-1)
        setInput('')
        return
      }
      const newIdx = historyIndex - 1
      setHistoryIndex(newIdx)
      setInput(commandHistory[newIdx])
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.output} ref={outputRef}>
        {lines.map((line) => (
          <div key={line.id} className={`${styles.line} ${styles[line.type]}`}>
            {line.text}
          </div>
        ))}
      </div>

      <div className={styles.inputRow}>
        <span className={styles.prompt}>&gt;</span>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? t('console.placeholder') : t('console.notConnected')}
          disabled={!isConnected}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!isConnected || !input.trim()}
        >
          {t('console.send')}
        </button>
        <button className={styles.clearBtn} onClick={clearConsole} title={t('console.clearTitle')}>
          {t('console.clear')}
        </button>
      </div>
    </div>
  )
}
