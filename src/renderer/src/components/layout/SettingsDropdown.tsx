import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore, type Language } from '../../stores/ui.store'
import i18n from '../../i18n'
import { catchCommandError } from '../../lib/command-errors'
import gearIcon from '../../assets/icons/gear.svg'
import sunIcon from '../../assets/icons/sun.svg'
import moonIcon from '../../assets/icons/moon.svg'
import styles from './SettingsDropdown.module.css'

export function SettingsDropdown() {
  const { t } = useTranslation()
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const units = useUIStore((s) => s.units)
  const setUnits = useUIStore((s) => s.setUnits)
  const language = useUIStore((s) => s.language)
  const setLanguage = useUIStore((s) => s.setLanguage)
  const showAAxis = useUIStore((s) => s.showAAxis)
  const setShowAAxis = useUIStore((s) => s.setShowAAxis)
  const showMachineTravel = useUIStore((s) => s.showMachineTravel)
  const setShowMachineTravel = useUIStore((s) => s.setShowMachineTravel)
  const toolDiameter = useUIStore((s) => s.toolDiameter)
  const setToolDiameter = useUIStore((s) => s.setToolDiameter)

  const [open, setOpen] = useState(false)
  // Journal des événements : l'état vit dans le processus principal (réglages), désactivé par défaut
  const [logEnabled, setLogEnabledState] = useState(false)

  useEffect(() => {
    window.cncstream.getLogEnabled().then(setLogEnabledState).catch(() => {})
  }, [])

  const toggleLog = () => {
    const next = !logEnabled
    setLogEnabledState(next)
    catchCommandError(window.cncstream.setLogEnabled(next))
  }
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleLanguage = (lang: Language) => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
    setOpen(false)
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={`${styles.gearBtn} ${open ? styles.active : ''}`}
        onClick={() => setOpen((v) => !v)}
        title={t('settings.title')}
      >
        <img src={gearIcon} alt={t('settings.title')} className={styles.gearIcon} />
        <span className={styles.langBadge}>{language.toUpperCase()}</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.section}>
            <span className={styles.label}>{t('settings.theme')}</span>
            <button className={styles.themeBtn} onClick={toggleTheme} title={t(theme === 'dark' ? 'settings.toLightMode' : 'settings.toDarkMode')}>
              <img src={theme === 'dark' ? sunIcon : moonIcon} alt="" className={styles.icon} />
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <span className={styles.label}>{t('settings.units')}</span>
            <div className={styles.langBtns}>
              <button
                className={`${styles.langBtn} ${units === 'mm' ? styles.langActive : ''}`}
                onClick={() => setUnits('mm')}
              >
                MM
              </button>
              <button
                className={`${styles.langBtn} ${units === 'in' ? styles.langActive : ''}`}
                onClick={() => setUnits('in')}
              >
                IN
              </button>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <span className={styles.label}>{t('settings.aAxis')}</span>
            <button
              className={`${styles.langBtn} ${showAAxis ? styles.langActive : ''}`}
              onClick={() => setShowAAxis(!showAAxis)}
            >
              {showAAxis ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <span className={styles.label} title={t('settings.logTitle')}>{t('settings.log')}</span>
            <button
              className={`${styles.langBtn} ${logEnabled ? styles.langActive : ''}`}
              onClick={toggleLog}
              title={t('settings.logTitle')}
              aria-pressed={logEnabled}
            >
              {logEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <span className={styles.label} title={t('settings.travelTitle')}>{t('settings.travel')}</span>
            <button
              className={`${styles.langBtn} ${showMachineTravel ? styles.langActive : ''}`}
              onClick={() => setShowMachineTravel(!showMachineTravel)}
              title={t('settings.travelTitle')}
              aria-pressed={showMachineTravel}
            >
              {showMachineTravel ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <label htmlFor="tool-diameter" className={styles.label} title={t('settings.toolTitle')}>
              {t('settings.tool')}
            </label>
            <input
              id="tool-diameter"
              type="number"
              className={styles.numberInput}
              value={toolDiameter}
              min={0.1}
              max={50}
              step={0.5}
              onChange={(e) => {
                const value = Number.parseFloat(e.target.value)
                if (!Number.isNaN(value) && value >= 0.1 && value <= 50) setToolDiameter(value)
              }}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <span className={styles.label}>{t('settings.language')}</span>
            <div className={styles.langBtns}>
              <button
                className={`${styles.langBtn} ${language === 'fr' ? styles.langActive : ''}`}
                onClick={() => handleLanguage('fr')}
              >
                FR
              </button>
              <button
                className={`${styles.langBtn} ${language === 'en' ? styles.langActive : ''}`}
                onClick={() => handleLanguage('en')}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
