/**
 * Ref callback qui donne le focus à un champ dès qu'il apparaît.
 * Remplace l'attribut `autoFocus`, signalé par les règles d'accessibilité.
 * La fonction est définie au niveau du module : son identité est stable,
 * donc le focus n'est pris qu'à l'affichage et non à chaque rendu.
 */
export function focusOnMount(element: HTMLElement | null): void {
  element?.focus()
}
