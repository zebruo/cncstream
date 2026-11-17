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
  it('envoie les lignes dans l\'ordre, sans les commentaires, puis se termine (macro)', async () => {
    const { streaming, sent } = setup(() => OK)
    const done = new Promise<void>((resolve) => streaming.on('completed', () => resolve()))
    await streaming.start(['G21 G91', '(commentaire)', 'G0 Z10 ; monte', 'G90', 'G0 X0 Y0'])
    await done
    expect(sent).toEqual(['G21 G91', 'G0 Z10', 'G90', 'G0 X0 Y0'])
    expect(streaming.getState()).toBe('completed')
  })

  it('signale l\'erreur avec le numéro de SA ligne, pas la fin du fichier', async () => {
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
})
