import { describe, expect, it } from 'vitest'
import { CommandQueueService } from './command-queue.service'
import { StreamingService } from './streaming.service'

/** File reliée à une fausse machine : `reply(line)` décide de la réponse à chaque ligne. */
function setup(reply: (line: string) => { type: 'ok' } | { type: 'error'; code: number; message: string }) {
  const queue = new CommandQueueService()
  const streaming = new StreamingService(queue)
  const sent: string[] = []
  queue.on('send', (data: string) => {
    const line = data.trim()
    sent.push(line)
    setTimeout(() => queue.onResponse(reply(line)), 0)
  })
  return { queue, streaming, sent }
}

const OK = { type: 'ok' } as const

describe('StreamingService', () => {
  it("envoie les lignes dans l'ordre, sans les commentaires, puis se termine (macro)", async () => {
    const { streaming, sent } = setup(() => OK)
    const done = new Promise<void>((resolve) => streaming.on('completed', () => resolve()))
    await streaming.start(['G21 G91', '(commentaire)', 'G0 Z10 ; monte', 'G90', 'G0 X0 Y0'])
    await done
    expect(sent).toEqual(['G21 G91', 'G0 Z10', 'G90', 'G0 X0 Y0'])
    expect(streaming.getState()).toBe('completed')
  })

  it("signale l'erreur avec le numéro de SA ligne, pas la fin du fichier", async () => {
    const { streaming } = setup((line) =>
      line === 'G1 X200 F800' ? { type: 'error', code: 20, message: 'Unsupported command' } : OK
    )
    const errors: { lineNumber: number; error: string }[] = []
    streaming.on('line-error', (e) => errors.push(e))
    const done = new Promise<void>((resolve) => streaming.on('completed', () => resolve()))
    await streaming.start(['G21 G90', 'G0 Z5', 'G1 X200 F800', 'G1 Y200', 'G0 Z5'])
    await done
    expect(errors).toHaveLength(1)
    expect(errors[0].lineNumber).toBe(2)
    expect(errors[0].error).toContain('error') // message de la file : « GRBL error 20 : … »
  })

  describe('pause automatique sur erreur', () => {
    const BAD = { type: 'error', code: 20, message: 'Unsupported command' } as const
    // 40 lignes courtes : le tampon de GRBL (127 octets) n'en reçoit qu'une partie d'un coup
    const program = Array.from({ length: 40 }, (_, i) => `G1 X${i + 1}`)

    it("se met en pause à la première erreur et n'envoie plus le reste", async () => {
      const { streaming, sent } = setup((line) => (line === 'G1 X3' ? BAD : OK))
      const paused: { lineNumber: number; command: string }[] = []
      streaming.on('paused-on-error', (e) => paused.push(e))
      await streaming.start(program)
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(streaming.getState()).toBe('paused')
      expect(paused).toEqual([expect.objectContaining({ lineNumber: 2, command: 'G1 X3' })])
      expect(sent.length).toBeLessThan(program.length)
      expect(sent).not.toContain('G1 X40')
    })

    it("ne signale la pause qu'une fois, même si d'autres lignes du tampon échouent", async () => {
      const { streaming } = setup((line) => (['G1 X3', 'G1 X4', 'G1 X5'].includes(line) ? BAD : OK))
      let count = 0
      streaming.on('paused-on-error', () => count++)
      await streaming.start(program)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(count).toBe(1)
      expect(streaming.getState()).toBe('paused')
    })

    it('émet quand même line-error pour chaque ligne refusée', async () => {
      const { streaming } = setup((line) => (['G1 X3', 'G1 X4'].includes(line) ? BAD : OK))
      const errors: number[] = []
      streaming.on('line-error', (e) => errors.push(e.lineNumber))
      await streaming.start(program)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(errors).toEqual([2, 3])
    })

    it('reprend après la pause et va au bout, la ligne refusée étant sautée', async () => {
      const { queue, streaming, sent } = setup((line) => (line === 'G1 X3' ? BAD : OK))
      const done = new Promise<void>((resolve) => streaming.on('completed', () => resolve()))
      await streaming.start(program)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(streaming.getState()).toBe('paused')

      streaming.resume()
      queue.resume()
      await done
      expect(streaming.getState()).toBe('completed')
      expect(sent).toContain('G1 X40')
      expect(sent.filter((l) => l === 'G1 X3')).toHaveLength(1)
    })

    it('un arrêt (Queue flushed) ne déclenche pas de pause', async () => {
      const { queue, streaming } = setup(() => OK)
      let paused = false
      streaming.on('paused-on-error', () => (paused = true))
      await streaming.start(program)
      streaming.stop()
      queue.flush()
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(paused).toBe(false)
      expect(streaming.getState()).toBe('idle')
    })

    it('un job sans erreur ne se met jamais en pause', async () => {
      const { streaming } = setup(() => OK)
      let paused = false
      streaming.on('paused-on-error', () => (paused = true))
      const done = new Promise<void>((resolve) => streaming.on('completed', () => resolve()))
      await streaming.start(program)
      await done
      expect(paused).toBe(false)
    })
  })
})
