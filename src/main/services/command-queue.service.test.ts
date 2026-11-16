import { describe, expect, it } from 'vitest'
import { CommandPriority, CommandQueueService } from './command-queue.service'
import { GRBL_RX_BUFFER_SIZE } from '@shared/constants/defaults'

const OK = { type: 'ok' } as const

/** File + liste des lignes « envoyées » à la machine. */
function setup() {
  const queue = new CommandQueueService()
  const sent: string[] = []
  queue.on('send', (data: string) => sent.push(data))
  return { queue, sent }
}

/** Ligne de `length` caractères : occupe `length + 1` octets du tampon de GRBL (avec le \n). */
const line = (length: number, char = 'A') => char.repeat(length)

describe('CommandQueueService : envoi', () => {
  it('envoie tout de suite une commande quand le tampon est libre, avec un retour à la ligne', () => {
    const { queue, sent } = setup()
    void queue.enqueue('G0 X1')
    expect(sent).toEqual(['G0 X1\n'])
    expect(queue.bufferUsage).toBe(6)
  })

  it('envoie plusieurs commandes dans l\'ordre tant qu\'elles tiennent dans le tampon', () => {
    const { queue, sent } = setup()
    void queue.enqueue('G0 X1')
    void queue.enqueue('G0 X2')
    void queue.enqueue('G0 X3')
    expect(sent).toEqual(['G0 X1\n', 'G0 X2\n', 'G0 X3\n'])
    expect(queue.pendingCount).toBe(3)
  })

  it('garde en attente ce qui ne tient pas dans le tampon de GRBL', () => {
    const { queue, sent } = setup()
    void queue.enqueue(line(59)) // 60 octets
    void queue.enqueue(line(59)) // 120 octets au total
    void queue.enqueue(line(59)) // 180 > 127 : attend
    expect(sent).toHaveLength(2)
    expect(queue.bufferUsage).toBe(120)
    expect(queue.pendingCount).toBe(3)
  })

  it('accepte une commande qui remplit exactement le tampon', () => {
    const { queue, sent } = setup()
    void queue.enqueue(line(GRBL_RX_BUFFER_SIZE - 1))
    expect(sent).toHaveLength(1)
    expect(queue.bufferUsage).toBe(GRBL_RX_BUFFER_SIZE)
  })

  it('refuse un octet de trop', () => {
    const { queue, sent } = setup()
    void queue.enqueue(line(GRBL_RX_BUFFER_SIZE - 2)) // 126 octets
    void queue.enqueue('X') // 2 octets : 128 > 127
    expect(sent).toHaveLength(1)
  })

  it('envoie la suite dès que des réponses libèrent le tampon', () => {
    const { queue, sent } = setup()
    void queue.enqueue(line(59))
    void queue.enqueue(line(59))
    void queue.enqueue(line(59))
    expect(sent).toHaveLength(2)
    queue.onResponse(OK)
    expect(sent).toHaveLength(3)
    expect(queue.bufferUsage).toBe(120)
  })
})

describe('CommandQueueService : réponses', () => {
  it('résout la promesse d\'une commande quand GRBL répond ok', async () => {
    const { queue } = setup()
    let done = false
    const promise = queue.enqueue('G0 X1').then(() => {
      done = true
    })
    await Promise.resolve()
    expect(done).toBe(false)
    queue.onResponse(OK)
    await promise
    expect(done).toBe(true)
  })

  it('rejette la promesse quand GRBL répond une erreur', async () => {
    const { queue } = setup()
    const promise = queue.enqueue('G99')
    queue.onResponse({ type: 'error', code: 20, message: 'Unsupported command' })
    await expect(promise).rejects.toThrow('GRBL error 20: Unsupported command')
  })

  it('associe chaque réponse à la plus ancienne commande envoyée', async () => {
    const { queue } = setup()
    const results: string[] = []
    const a = queue.enqueue('A').then(() => results.push('A ok'))
    const b = queue.enqueue('B').catch(() => results.push('B erreur'))
    const c = queue.enqueue('C').then(() => results.push('C ok'))
    queue.onResponse(OK)
    queue.onResponse({ type: 'error', code: 1, message: 'x' })
    queue.onResponse(OK)
    await Promise.all([a, b, c])
    expect(results).toEqual(['A ok', 'B erreur', 'C ok'])
  })

  it('libère le tampon à chaque réponse, ok ou erreur', () => {
    const { queue } = setup()
    void queue.enqueue('G0 X1').catch(() => undefined)
    void queue.enqueue('G0 X2').catch(() => undefined)
    expect(queue.bufferUsage).toBe(12)
    queue.onResponse(OK)
    expect(queue.bufferUsage).toBe(6)
    queue.onResponse({ type: 'error', code: 2, message: 'x' })
    expect(queue.bufferUsage).toBe(0)
    expect(queue.isEmpty).toBe(true)
  })

  it('annonce chaque réponse avec la commande et son numéro de ligne', () => {
    const { queue } = setup()
    const acknowledged: unknown[] = []
    queue.on('acknowledged', (info) => acknowledged.push(info))
    void queue.enqueue('G1 X5 F100', CommandPriority.NORMAL, 42)
    queue.onResponse(OK)
    expect(acknowledged).toEqual([{ command: 'G1 X5 F100', response: OK, lineNumber: 42 }])
  })

  it('annonce aussi les erreurs', () => {
    const { queue } = setup()
    const acknowledged: Array<{ response: { type: string } }> = []
    queue.on('acknowledged', (info) => acknowledged.push(info))
    void queue.enqueue('G99').catch(() => undefined)
    queue.onResponse({ type: 'error', code: 20, message: 'x' })
    expect(acknowledged[0].response.type).toBe('error')
  })

  it('ignore une réponse reçue quand rien n\'a été envoyé', () => {
    const { queue } = setup()
    const acknowledged: unknown[] = []
    queue.on('acknowledged', (info) => acknowledged.push(info))
    expect(() => queue.onResponse(OK)).not.toThrow()
    expect(acknowledged).toHaveLength(0)
    expect(queue.bufferUsage).toBe(0)
  })
})

describe('CommandQueueService : priorité', () => {
  it('envoie une commande prioritaire avant les commandes normales en attente', () => {
    const { queue, sent } = setup()
    void queue.enqueue(line(100)) // 101 octets, envoyée
    void queue.enqueue(line(100)) // attend
    void queue.enqueue('M5', CommandPriority.HIGH) // passe devant
    expect(sent).toEqual([line(100) + '\n', 'M5\n'])
    expect(queue.pendingCount).toBe(3)
  })

  it('place une commande prioritaire après les prioritaires déjà en attente et avant les normales', () => {
    const { queue, sent } = setup()
    queue.pause()
    void queue.enqueue('N1')
    void queue.enqueue('H1', CommandPriority.HIGH)
    void queue.enqueue('H2', CommandPriority.HIGH)
    expect(sent).toEqual(['H1\n', 'H2\n'])
    queue.resume()
    expect(sent).toEqual(['H1\n', 'H2\n', 'N1\n'])
  })

  it('garde l\'ordre d\'arrivée entre commandes prioritaires quand le tampon est plein', () => {
    const { queue, sent } = setup()
    void queue.enqueue(line(120)) // 121 octets : le tampon est presque plein
    void queue.enqueue('H1', CommandPriority.HIGH) // 3 octets : 124, envoyée
    void queue.enqueue(line(10), CommandPriority.HIGH) // 11 octets : attend
    void queue.enqueue('H3', CommandPriority.HIGH) // 3 octets : doit attendre derrière la précédente
    queue.onResponse(OK) // libère 121 octets
    expect(sent.slice(2)).toEqual([line(10) + '\n', 'H3\n'])
  })

  it('garde l\'ordre d\'arrivée entre trois prioritaires en attente, sans commande normale', () => {
    const { queue, sent } = setup()
    void queue.enqueue(line(120))
    void queue.enqueue(line(20), CommandPriority.HIGH) // 21 octets : attend (121 + 21 > 127)
    void queue.enqueue(line(30), CommandPriority.HIGH) // attend derrière la précédente
    void queue.enqueue(line(40), CommandPriority.HIGH) // attend derrière les deux
    queue.onResponse(OK)
    expect(sent.slice(1)).toEqual([line(20) + '\n', line(30) + '\n', line(40) + '\n'])
  })
})

describe('CommandQueueService : pause et reprise', () => {
  it('ne démarre plus de commande normale en pause, mais laisse passer les prioritaires', () => {
    const { queue, sent } = setup()
    queue.pause()
    void queue.enqueue('G0 X1')
    expect(sent).toEqual([])
    void queue.enqueue('M5', CommandPriority.HIGH)
    expect(sent).toEqual(['M5\n'])
  })

  it('envoie les commandes en attente à la reprise', () => {
    const { queue, sent } = setup()
    queue.pause()
    void queue.enqueue('G0 X1')
    void queue.enqueue('G0 X2')
    queue.resume()
    expect(sent).toEqual(['G0 X1\n', 'G0 X2\n'])
  })

  it('n\'envoie rien de plus en pause quand une réponse arrive', () => {
    const { queue, sent } = setup()
    void queue.enqueue('G0 X1')
    void queue.enqueue(line(125)) // attend : le tampon n'a pas la place
    queue.pause()
    queue.onResponse(OK)
    expect(sent).toHaveLength(1)
    queue.resume()
    expect(sent).toHaveLength(2)
  })
})

describe('CommandQueueService : vidage', () => {
  it('rejette toutes les commandes, envoyées ou en attente, et remet les compteurs à zéro', async () => {
    const { queue } = setup()
    const promises = [
      queue.enqueue(line(100)), // envoyée
      queue.enqueue(line(100)), // en attente
      queue.enqueue('G0 X1') // en attente
    ]
    const results = promises.map((p) => expect(p).rejects.toThrow('Queue flushed'))
    queue.flush()
    await Promise.all(results)
    expect(queue.pendingCount).toBe(0)
    expect(queue.bufferUsage).toBe(0)
    expect(queue.isEmpty).toBe(true)
  })

  it('accepte de nouvelles commandes après un vidage', () => {
    const { queue, sent } = setup()
    void queue.enqueue('A').catch(() => undefined)
    queue.flush()
    void queue.enqueue('B')
    expect(sent).toEqual(['A\n', 'B\n'])
    expect(queue.bufferUsage).toBe(2)
  })

  it('ignore une réponse tardive après un vidage', () => {
    const { queue } = setup()
    void queue.enqueue('A').catch(() => undefined)
    queue.flush()
    expect(() => queue.onResponse(OK)).not.toThrow()
    expect(queue.bufferUsage).toBe(0)
  })
})

describe('CommandQueueService : état', () => {
  it('est vide au départ', () => {
    const { queue } = setup()
    expect(queue.isEmpty).toBe(true)
    expect(queue.pendingCount).toBe(0)
    expect(queue.bufferUsage).toBe(0)
  })

  it('n\'est plus vide dès qu\'une commande est en cours', () => {
    const { queue } = setup()
    void queue.enqueue('G0 X1')
    expect(queue.isEmpty).toBe(false)
    queue.onResponse(OK)
    expect(queue.isEmpty).toBe(true)
  })
})
