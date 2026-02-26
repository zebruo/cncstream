import { useState } from 'react'
import { Modal } from '../common/Modal'
import { useUIStore } from '../../stores/ui.store'
import { GRBL_ERRORS } from '@shared/constants/grbl-errors'
import { GRBL_ALARMS } from '@shared/constants/grbl-alarms'
import { GRBL_SETTINGS } from '@shared/constants/grbl-settings'
import styles from './HelpModal.module.css'

type Tab = 'guide' | 'reference' | 'about'

function GuideTab() {
  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Connexion</h3>
        <p className={styles.paragraph}>
          Branchez votre contrôleur GRBL via USB. Dans le panneau Connection, sélectionnez le port série
          et le baud rate (115200 par défaut pour GRBL 1.1). Cliquez Connect pour établir la connexion.
          Les paramètres GRBL ($$) sont lus automatiquement.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>DRO & Coordonnées</h3>
        <p className={styles.paragraph}>
          Le DRO (Digital Read-Out) affiche les positions sur 3 axes (X, Y, Z), avec support optionnel de l'axe A (activable dans ⚙).
          Cliquez sur une valeur pour entrer une position manuellement (G10 L20).
        </p>
        <ul className={styles.list}>
          <li><strong>MPos</strong> : position machine (absolue depuis le homing)</li>
          <li><strong>WPos</strong> : position de travail (relative au zéro pièce)</li>
          <li><strong>G54-G59</strong> : systèmes de coordonnées de travail</li>
          <li><strong>MM/IN</strong> : basculer l'affichage millimètres / pouces (icône ⚙ dans le header). <em>Affichage uniquement</em> — la machine reste en G21 (mm), les positions reçues de GRBL sont converties à l'affichage. Les commandes envoyées à la machine sont toujours en mm.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Jogging</h3>
        <p className={styles.paragraph}>
          Déplacez la machine avec les boutons directionnels ou le clavier.
          Choisissez le pas et la vitesse d'avance. Deux grilles de présets indépendantes selon l'unité choisie (mm/in) :
        </p>
        <ul className={styles.list}>
          <li><strong>Pas (mm)</strong> : 0.01 · 0.1 · 1 · 10 · 100 mm — <strong>(pouces)</strong> : 0.001 · 0.01 · 0.05 · 0.1 · 0.5 · 1.0 in</li>
          <li><strong>Vitesse (mm)</strong> : 100 · 500 · 1000 · 3000 · 5000 mm/min — <strong>(pouces)</strong> : 1 · 5 · 10 · 50 · 100 · 200 ipm</li>
        </ul>
        <p className={styles.paragraph}>
          <em>Ce ne sont pas des conversions mathématiques mais deux grilles de valeurs propres à chaque unité. Les valeurs envoyées à la machine restent toujours en mm (G21).</em>
        </p>
        <ul className={styles.list}>
          <li><strong>Flèches</strong> : déplacement X/Y</li>
          <li><strong>Page Up/Down</strong> : déplacement Z</li>
          <li><strong>[ / ]</strong> : diminuer / augmenter le pas</li>
          <li><strong>Mode continu</strong> : maintenir la touche pour un déplacement continu</li>
          <li><strong>Axe A</strong> : boutons A+ / A- visibles si l'axe A est activé dans ⚙</li>
          <li><strong>Saisie directe X/Y/Z/A</strong> : cliquer sur une valeur dans le DRO et saisir un nombre effectue un <strong>zéro partiel</strong> — la coordonnée de travail de cet axe est redéfinie à la valeur saisie à la position actuelle (<code>G10 L20</code>), sans déplacer la machine. Les autres axes restent inchangés.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Zero / Go To / Probe Z</h3>
        <p className={styles.paragraph}>
          Mettez à zéro les axes de travail et naviguez vers des positions prédéfinies.
        </p>
        <ul className={styles.list}>
          <li><strong>Go to XY Zero</strong> : monte en Z (hauteur sécurité), va à X0 Y0, redescend</li>
          <li><strong>Go to Z Zero</strong> : descend Z à 0</li>
          <li><strong>Home ($H)</strong> : cycle de homing</li>
          <li><strong>Unlock ($X)</strong> : déverrouiller après une alarme</li>
          <li><strong>Safe Height</strong> : hauteur de sécurité pour les déplacements</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Probe Z — Mode opératoire</h3>
        <p className={styles.paragraph}>
          Détecte automatiquement la surface de la matière et définit Z0 en tenant compte
          de l'épaisseur de la sonde de contact.
        </p>
        <ol className={styles.steps}>
          <li>Connectez la sonde à l'entrée <strong>Probe (A5)</strong> de GRBL, pince de masse sur la <strong>fraise</strong></li>
          <li>Mesurez l'épaisseur de la sonde au pied à coulisse et saisissez-la dans le champ <strong>Sonde (mm)</strong> (0,1–50 mm)</li>
          <li>Posez la sonde sur la pièce, directement sous la fraise</li>
          <li>Test circuit : touchez brièvement la fraise à la plaque → indicateur passe au <strong>vert</strong></li>
          <li>Reposez la sonde → le bouton <strong>Probe Z</strong> s'active</li>
          <li>Positionnez la fraise à moins de <strong>20 mm</strong> au-dessus de la sonde</li>
          <li>Cliquez <strong>Probe Z</strong> → la machine descend à 50 mm/min, détecte le contact et remonte à la hauteur de sécurité</li>
          <li>Dans la boîte de confirmation : <strong>Appliquer</strong> pour valider Z0, <strong>Annuler</strong> pour ignorer</li>
        </ol>
        <p className={styles.note}>
          <strong>Note :</strong> le bouton Probe Z se réinitialise à chaque connexion — le test circuit (étape 4) doit être refait à chaque session.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>G-Code & Jobs</h3>
        <p className={styles.paragraph}>
          Chargez un fichier G-code pour voir l'analyse (dimensions, temps estimé, outils)
          et la visualisation 3D. Lancez le job pour envoyer le fichier à la machine.
        </p>
        <ul className={styles.list}>
          <li><strong>Open G-Code</strong> : charger un fichier (.nc, .gcode, .tap, .ngc)</li>
          <li><strong>Start Job</strong> : démarrer l'envoi du fichier. Deux vérifications sont effectuées dans l'ordre avant le démarrage :
            <ol className={styles.steps} style={{marginTop: 'var(--space-xs)'}}>
              <li><strong>Probe Z</strong> : si Z0 n'a pas été défini par sonde dans la session, un avertissement s'affiche. Passer outre est acceptable si : Z0 défini manuellement via le DRO, reprise après reconnexion avec le WCS GRBL déjà correct, hauteur Z connue, ou job sans exigence de précision Z.</li>
              <li><strong>Broche</strong> : si le G-code contient des commandes broche (M3/M4) et que la broche n'est pas en service, un avertissement s'affiche. Passer outre est acceptable pour un dry run ou un test sans usinage.</li>
            </ol>
          </li>
          <li><strong>Pause</strong> : feed hold — les axes décélèrent et s'arrêtent. Si la broche était en service, elle s'arrête automatiquement dès que GRBL confirme l'état Hold (commande réaltime GRBL, indépendante de la queue G-code).</li>
          <li><strong>Resume</strong> : si la broche était active avant la pause, elle redémarre en premier (les axes restent en hold), attend ~2 s pour atteindre sa vitesse de régime, puis les axes reprennent. Si la broche était éteinte, les axes reprennent immédiatement.</li>
          <li><strong>Stop</strong> : arrêt immédiat (soft reset)</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Tableau Insight G-Code</h3>
        <p className={styles.paragraph}>
          Après le chargement d'un fichier, un tableau affiche l'analyse pour chaque axe :
        </p>
        <ul className={styles.list}>
          <li><strong>Trajet</strong> : distance totale parcourue par l'outil sur cet axe (somme de tous les déplacements). Cette valeur n'est PAS la dimension de la pièce, mais la longueur du parcours de l'outil.</li>
          <li><strong>Min</strong> : position minimale atteinte sur cet axe (bord inférieur de la boîte englobante)</li>
          <li><strong>Max</strong> : position maximale atteinte sur cet axe (bord supérieur de la boîte englobante)</li>
          <li><strong>Safe Z</strong> : hauteur de dégagement détectée dans le G-code (position Z la plus fréquente dans les rapides G0) — <em>affichage informatif uniquement</em>. Cette valeur n'est pas utilisée par l'interface ; pendant l'exécution du job, la machine applique les mouvements Z exactement tels qu'ils sont dans le fichier.</li>
        </ul>
        <p className={styles.paragraph}>
          <strong>Note</strong> : La dimension réelle de la pièce = Max - Min pour chaque axe.
          Par exemple, si X Min=-10 et X Max=40, la pièce fait 50mm de large en X.
        </p>
        <p className={styles.note}>
          <strong>Safe Z vs Safe Height :</strong> le <em>Safe Z</em> ci-dessus est lu depuis le fichier G-code (informatif). Le <em>Safe Height</em> du panneau Zero/GoTo est indépendant — il sert uniquement aux opérations manuelles : Go to XY Zero (dégagement avant déplacement XY), retrait après Probe Z et offset de calcul de la sonde. Ces deux valeurs n'interfèrent pas entre elles.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Visualiseur 3D</h3>
        <ul className={styles.list}>
          <li><strong>Vert</strong> : mouvements d'usinage (G1)</li>
          <li><strong>Bleu pointillé</strong> : déplacements rapides (G0)</li>
          <li><strong>Orange</strong> : lignes déjà exécutées</li>
          <li><strong>Cône rouge</strong> : position actuelle de l'outil</li>
          <li><strong>Souris</strong> : clic gauche = rotation, molette = zoom, clic droit = pan</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Overrides</h3>
        <p className={styles.paragraph}>
          Modifiez en temps réel la vitesse d'avance et les déplacements rapides pendant
          l'usinage. Les overrides envoient des commandes realtime à GRBL.
        </p>
        <ul className={styles.list}>
          <li><strong>Feed</strong> : 10% à 200% de la vitesse d'avance programmée (G1/G2/G3)</li>
          <li><strong>Rapid</strong> : 25%, 50% ou 100% de la vitesse des déplacements rapides G0 (mouvements de positionnement à vide, quand l'outil ne coupe pas, positionnement hors matière)</li>
          <li><strong>Spindle</strong> : 10% à 200% de la vitesse broche — affiché uniquement en mode PWM, sans effet physique en mode Relais ou Manuel</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Broche (Spindle)</h3>
        <p className={styles.paragraph}>
          Contrôlez la broche via M3 (CW), M4 (CCW) et M5 (arrêt).
          Trois modes disponibles selon votre configuration :
        </p>
        <ul className={styles.list}>
          <li><strong>PWM</strong> : GRBL contrôle directement la vitesse via le signal PWM (VFD, ESC). Le champ RPM définit la vitesse cible envoyée à GRBL au démarrage de la broche.</li>
          <li><strong>Relais</strong> : sortie ON/OFF uniquement, la vitesse physique est toujours maximale — le champ RPM n'est pas affiché.</li>
          <li><strong>Manuel</strong> : la vitesse est réglée par un potentiomètre physique externe (variateur) — le champ RPM n'est pas affiché. Les commandes M3/M4/M5 sont envoyées mais la vitesse réelle dépend du réglage physique.</li>
        </ul>
        <p className={styles.note}>
          <strong>Pause / Resume :</strong> quel que soit le mode, si la broche est en service au moment d'une pause, elle s'arrête automatiquement via commande réaltime GRBL (0x9e) et redémarre avant les axes au resume (~2 s de délai pour atteindre la vitesse de régime).
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Coolant (Arrosage)</h3>
        <ul className={styles.list}>
          <li><strong>Flood (M8)</strong> : arrosage principal</li>
          <li><strong>Mist (M7)</strong> : micro-lubrification</li>
          <li><strong>Off (M9)</strong> : arrêt de l'arrosage</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Macros</h3>
        <p className={styles.paragraph}>
          Les macros permettent d'enregistrer et d'exécuter des séquences G-code personnalisées
          (tests machine, mise en position, opérations répétitives).
        </p>
        <ul className={styles.list}>
          <li><strong>▶ Run</strong> : exécute la macro via le mécanisme de streaming (Pause/Stop fonctionnent normalement)</li>
          <li><strong>✎ Edit</strong> : ouvre l'éditeur pour modifier le nom, la description et le G-code</li>
          <li><strong>✕ Delete</strong> : supprime la macro (non disponible pour les macros prédéfinies)</li>
          <li><strong>+ Nouvelle macro</strong> : crée une macro personnalisée</li>
        </ul>
        <p className={styles.paragraph}>
          Les macros prédéfinies (Carré test XY, Test axes, Retour origine XY) sont modifiables
          et leurs modifications sont conservées après redémarrage.
          Toutes les macros sont persistées en local (localStorage).
        </p>
        <p className={styles.paragraph}>
          <strong>Note</strong> : le bouton Run est désactivé si la machine n'est pas connectée
          ou si un job est déjà en cours.
        </p>
      </div>
    </div>
  )
}

function ReferenceTab() {
  const shortcuts = [
    { keys: 'Arrow Right / Left', action: 'Jog X+ / X-' },
    { keys: 'Arrow Up / Down', action: 'Jog Y+ / Y-' },
    { keys: 'Page Up / Down', action: 'Jog Z+ / Z-' },
    { keys: ']  /  [', action: 'Augmenter / diminuer le pas' },
    { keys: 'Space', action: 'Feed Hold (pause)' },
    { keys: 'Ctrl+H', action: 'Home ($H)' },
    { keys: 'Ctrl+U', action: 'Unlock ($X)' },
    { keys: 'Ctrl+Shift+R', action: 'Soft Reset' },
    { keys: 'Ctrl+Shift+X', action: 'Stop Job' },
    { keys: 'F1', action: 'Ouvrir/fermer l\'aide' }
  ]

  return (
    <div>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Raccourcis clavier</h3>
        <table className={styles.table}>
          <thead>
            <tr><th>Touche</th><th>Action</th></tr>
          </thead>
          <tbody>
            {shortcuts.map((s) => (
              <tr key={s.keys}>
                <td><span className={styles.kbd}>{s.keys}</span></td>
                <td>{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Erreurs GRBL</h3>
        <table className={styles.table}>
          <thead>
            <tr><th>Code</th><th>Description</th></tr>
          </thead>
          <tbody>
            {Object.entries(GRBL_ERRORS).map(([code, desc]) => (
              <tr key={code}>
                <td className={styles.code}>error:{code}</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Alarmes GRBL</h3>
        <table className={styles.table}>
          <thead>
            <tr><th>Code</th><th>Nom</th><th>Description</th></tr>
          </thead>
          <tbody>
            {Object.entries(GRBL_ALARMS).map(([code, alarm]) => (
              <tr key={code}>
                <td className={styles.code}>ALARM:{code}</td>
                <td>{alarm.name}</td>
                <td>{alarm.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Paramètres GRBL ($$)</h3>
        <table className={styles.table}>
          <thead>
            <tr><th>Paramètre</th><th>Description</th><th>Unité</th></tr>
          </thead>
          <tbody>
            {Object.entries(GRBL_SETTINGS).map(([key, setting]) => (
              <tr key={key}>
                <td className={styles.code}>{key}</td>
                <td>{setting.description}</td>
                <td>{setting.units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AboutTab() {
  return (
    <div className={styles.about}>
      <h2 className={styles.aboutTitle}>CNCStream</h2>
      <p className={styles.aboutVersion}>v1.0.0</p>
      <p className={styles.aboutDesc}>
        Application de contrôle CNC pour machines GRBL 1.1.
        Connexion série, DRO 4 axes, jogging, streaming G-code,
        visualisation 3D, overrides temps réel, contrôle broche et arrosage.
        Compatible grblHAL (protocole de base) sans support des fonctionnalités spécifiques.
      </p>
    </div>
  )
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'guide', label: 'Guide' },
  { key: 'reference', label: 'Référence' },
  { key: 'about', label: 'À propos' }
]

export function HelpModal() {
  const helpOpen = useUIStore((s) => s.helpOpen)
  const setHelpOpen = useUIStore((s) => s.setHelpOpen)
  const [activeTab, setActiveTab] = useState<Tab>('guide')

  return (
    <Modal
      isOpen={helpOpen}
      onClose={() => setHelpOpen(false)}
      title="Aide"
      className={styles.helpModal}
    >
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {activeTab === 'guide' && <GuideTab />}
        {activeTab === 'reference' && <ReferenceTab />}
        {activeTab === 'about' && <AboutTab />}
      </div>
    </Modal>
  )
}
