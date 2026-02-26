/**
 * i18n — Convention des clés de traduction
 *
 * Structure : {panel}.{element}  (2 niveaux max)
 *
 * Panels : connection | dro | jog | zeroGoto | gcode | spindle
 *          overrides | macros | help | common
 *
 * Règles :
 *  - Niveau 1 = nom du panel en camelCase
 *  - Niveau 2 = rôle sémantique (title, connect, selectPort...)
 *  - "common" = chaînes partagées (cancel, save, close, edit, delete)
 *  - Clés en camelCase, jamais positionnelles (pas button1, text2)
 *
 * Exemple : t('connection.selectPort')  →  "Sélectionner un port..."
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './locales/fr.json'
import en from './locales/en.json'
import { useUIStore } from './stores/ui.store'

const savedLanguage = useUIStore.getState().language

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en }
  },
  lng: savedLanguage,
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
