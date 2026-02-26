import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import type { Macro } from '../../stores/macro.store'
import styles from './MacroPanel.module.css'

interface MacroEditorProps {
  macro: Macro | null
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description: string, commands: string) => void
}

export function MacroEditor({ macro, isOpen, onClose, onSave }: MacroEditorProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [commands, setCommands] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(macro?.name ?? '')
      setDescription(macro?.description ?? '')
      setCommands(macro?.commands ?? '')
    }
  }, [isOpen, macro])

  const handleSave = () => {
    if (!name.trim()) return
    onSave(name.trim(), description.trim(), commands.trim())
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={macro ? t('macros.editTitle') : t('macros.newTitle')}
      className={styles.editorModal}
    >
      <div className={styles.editorForm}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t('macros.fieldName')}</label>
          <input
            className={styles.fieldInput}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('macros.placeholderName')}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t('macros.fieldDescription')}</label>
          <input
            className={styles.fieldInput}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('macros.placeholderDescription')}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t('macros.fieldGcode')}</label>
          <textarea
            className={styles.fieldTextarea}
            value={commands}
            onChange={(e) => setCommands(e.target.value)}
            placeholder={'G21 G90\nG0 X0 Y0\nG1 X50 F500\n...'}
            rows={10}
            spellCheck={false}
          />
        </div>

        <div className={styles.editorActions}>
          <button className={styles.cancelBtn} onClick={onClose}>{t('common.cancel')}</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!name.trim() || !commands.trim()}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
