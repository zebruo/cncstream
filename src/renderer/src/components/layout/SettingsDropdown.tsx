import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore, type Language } from '../../stores/ui.store'
import i18n from '../../i18n'
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

  const [open, setOpen] = useState(false)
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
