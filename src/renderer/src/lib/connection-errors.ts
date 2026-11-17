/**
 * Erreurs de connexion série : le message brut arrive de la bibliothèque série,
 * précédé du texte d'Electron, par exemple :
 *   « Error invoking remote method 'connection:connect': Error: Opening COM3: File not found »
 * On en tire une clé de traduction et le nom du port, pour afficher un message lisible.
 */

const ELECTRON_PREFIX = 'Error invoking remote method'

export interface ConnectionErrorInfo {
  /** Clé de traduction (connection.error…) */
  key: 'connection.errorPortNotFound' | 'connection.errorPortBusy' | 'connection.errorGeneric'
  /** Valeurs à injecter dans la traduction */
  params: { port: string; message: string }
}

/** Retire « Error invoking remote method '…': » et le « Error: » qui suit. */
export function cleanErrorMessage(raw: string): string {
  let message = raw.trim()
  if (message.startsWith(ELECTRON_PREFIX)) {
    const end = message.indexOf("': ")
    if (end >= 0) message = message.slice(end + 3)
  }
  while (message.startsWith('Error: ')) {
    message = message.slice('Error: '.length)
  }
  return message
}

/** Nom du port dans « Opening COM3: … » ou « Opening /dev/ttyUSB0: … ». */
function extractPort(message: string): string {
  const marker = 'Opening '
  const start = message.indexOf(marker)
  if (start < 0) return '?'
  const rest = message.slice(start + marker.length)
  const end = rest.indexOf(':')
  return (end >= 0 ? rest.slice(0, end) : rest).trim() || '?'
}

export function describeConnectionError(raw: string): ConnectionErrorInfo {
  const message = cleanErrorMessage(raw)
  const port = extractPort(message)
  const lower = message.toLowerCase()

  if (lower.includes('file not found') || lower.includes('no such file') || lower.includes('enoent')) {
    return { key: 'connection.errorPortNotFound', params: { port, message } }
  }
  if (
    lower.includes('access denied') ||
    lower.includes('permission denied') ||
    lower.includes('resource busy') ||
    lower.includes('eacces') ||
    lower.includes('ebusy')
  ) {
    return { key: 'connection.errorPortBusy', params: { port, message } }
  }
  return { key: 'connection.errorGeneric', params: { port, message } }
}
