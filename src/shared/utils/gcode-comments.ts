/**
 * Retire d'une ligne G-code les commentaires `; …` (jusqu'à la fin de ligne)
 * et `( … )`, puis supprime les espaces de début et de fin.
 *
 * Écrit sans regex : les motifs `\s*;.*$` ou `\(.*?\)` ont un coût quadratique
 * sur certaines lignes (longues suites d'espaces ou de parenthèses).
 * Une parenthèse ouvrante sans parenthèse fermante est conservée.
 */
export function stripGcodeComments(line: string): string {
  const semicolon = line.indexOf(';')
  const text = semicolon >= 0 ? line.slice(0, semicolon) : line

  let result = ''
  let hasClosingParen = true
  let i = 0
  while (i < text.length) {
    if (text[i] === '(' && hasClosingParen) {
      const close = text.indexOf(')', i + 1)
      if (close >= 0) {
        i = close + 1
        continue
      }
      // Plus aucune « ) » plus loin : inutile de chercher pour les « ( » suivantes
      hasClosingParen = false
    }
    result += text[i]
    i++
  }
  return result.trim()
}
