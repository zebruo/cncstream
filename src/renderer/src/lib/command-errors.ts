import { useConsoleStore } from '../stores/console.store'

/**
 * Traite l'échec d'une commande envoyée à la machine sans attendre son résultat.
 *
 * Deux cas sont ignorés car déjà visibles ailleurs :
 * - les réponses d'erreur GRBL (« error:N ») sont affichées par useMachineStatus ;
 * - « Queue flushed » est normal après un reset, un arrêt ou une annulation de jog.
 * Tout autre échec (port série fermé, etc.) est affiché dans la console.
 */
export function handleCommandError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('GRBL error') || message.includes('Queue flushed')) return
  useConsoleStore.getState().addLine('error', message)
}

/** Lance une commande sans l'attendre, en gérant son éventuel échec. */
export function catchCommandError(promise: Promise<unknown>): void {
  promise.catch(handleCommandError)
}
