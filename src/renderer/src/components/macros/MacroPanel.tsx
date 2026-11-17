import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../common/Panel'
import { useMacroStore, type Macro } from '../../stores/macro.store'
import { useJobStore } from '../../stores/job.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useMachineStore } from '../../stores/machine.store'
import { ConfirmModal } from '../common/ConfirmModal'
import { usesMachineCoordinates } from '../../lib/gcode/machine-coordinates'
import { MacroEditor } from './MacroEditor'
import styles from './MacroPanel.module.css'

function MacroItem({
  macro,
  canRun,
  isConnected,
  onRun,
  onEdit,
  onDelete
}: {
  macro: Macro
  canRun: boolean
  isConnected: boolean
  onRun: (m: Macro) => void
  onEdit: (m: Macro) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.macroItem}>
      <div className={styles.macroInfo}>
        <span className={styles.macroName}>{macro.name}</span>
        {macro.description && (
          <span className={styles.macroDesc}>{macro.description}</span>
        )}
      </div>
      <div className={styles.macroActions}>
        <button
          className={styles.runBtn}
          onClick={() => onRun(macro)}
          disabled={!canRun}
          title={!isConnected ? t('macros.notConnected') : !canRun ? t('macros.jobRunning') : t('macros.runTitle', { name: macro.name })}
        >
          ▶
        </button>
        <button
          className={styles.editBtn}
          onClick={() => onEdit(macro)}
          title={t('common.edit')}
        >
          ✎
        </button>
        {!macro.builtIn && (
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(macro.id)}
            title={t('common.delete')}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export function MacroPanel() {
  const { macros, addMacro, updateMacro, deleteMacro } = useMacroStore()
  const runMacro = useJobStore((s) => s.runMacro)
  const jobState = useJobStore((s) => s.state)
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const homed = useMachineStore((s) => s.homed)

  // Macro en attente de confirmation : elle utilise G53 alors qu'aucun homing n'a été fait
  const [unhomedMacro, setUnhomedMacro] = useState<Macro | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null)
  const [expanded, setExpanded] = useState(false)
  const { t } = useTranslation()

  const builtInMacros = macros.filter((m) => m.builtIn)
  const customMacros = macros.filter((m) => !m.builtIn)

  const canRun = isConnected && (jobState === 'idle' || jobState === 'completed')

  const handleRun = (macro: Macro) => {
    if (!canRun) return
    if (!homed && usesMachineCoordinates(macro.commands)) {
      setUnhomedMacro(macro)
      return
    }
    startMacro(macro)
  }

  const startMacro = (macro: Macro) => {
    const lines = macro.commands
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    runMacro(lines)
  }

  const handleEdit = (macro: Macro) => {
    setEditingMacro(macro)
    setEditorOpen(true)
  }

  const handleNew = () => {
    setEditingMacro(null)
    setEditorOpen(true)
  }

  const handleSave = (name: string, description: string, commands: string) => {
    if (editingMacro) {
      updateMacro(editingMacro.id, { name, description, commands })
    } else {
      addMacro({ name, description, commands })
    }
  }

  return (
    <>
      <Panel title="Macros" onToggle={() => setExpanded((v) => !v)} expanded={expanded}>
        {expanded && (
          <>
            <div className={styles.macroList}>
              {builtInMacros.length > 0 && (
                <>
                  <span className={styles.sectionLabel}>{t('macros.sectionBuiltIn')}</span>
                  {builtInMacros.map((macro) => (
                    <MacroItem
                      key={macro.id}
                      macro={macro}
                      canRun={canRun}
                      isConnected={isConnected}
                      onRun={handleRun}
                      onEdit={handleEdit}
                      onDelete={deleteMacro}
                    />
                  ))}
                </>
              )}

              {customMacros.length > 0 && (
                <>
                  <span className={styles.sectionLabel}>{t('macros.sectionCustom')}</span>
                  {customMacros.map((macro) => (
                    <MacroItem
                      key={macro.id}
                      macro={macro}
                      canRun={canRun}
                      isConnected={isConnected}
                      onRun={handleRun}
                      onEdit={handleEdit}
                      onDelete={deleteMacro}
                    />
                  ))}
                </>
              )}
            </div>

            <button className={styles.newBtn} onClick={handleNew}>
              {t('macros.newMacro')}
            </button>
          </>
        )}
      </Panel>

      <ConfirmModal
        isOpen={unhomedMacro !== null}
        variant="warning"
        title={t('macros.unhomedTitle')}
        message={t('macros.unhomedMessage', { name: unhomedMacro?.name ?? '' })}
        confirmLabel={t('macros.unhomedRun')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (unhomedMacro) startMacro(unhomedMacro)
          setUnhomedMacro(null)
        }}
        onCancel={() => setUnhomedMacro(null)}
      />

      <MacroEditor
        macro={editingMacro}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </>
  )
}
