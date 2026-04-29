import { describe, expect, it, vi, beforeEach } from 'vitest'
import worker, { Env } from '../src/index'

const createMockEnv = () => {
  return {
    AI: {
      run: vi.fn<any, any>()
    }
  } as unknown as Env
}

describe('Company Research Agent Worker', () => {
  let env: Env

  beforeEach(() => {
    env = createMockEnv()
  })

  it('responds with 400 when company query parameter is missing', async () => {
    const request = new Request('https://example.com/')
    const response = await worker.fetch(request, env)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Missing company parameter' })
    expect(env.AI.run).not.toHaveBeenCalled()
  })

  it('returns a planner error when planner output is invalid JSON', async () => {
    env.AI.run = vi.fn().mockResolvedValue({ choices: [{ message: { content: 'not json' } }] })
    const request = new Request('https://example.com/?company=TestCo')

    const response = await worker.fetch(request, env)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Planner output invalid JSON')
    expect(body.raw).toBe('not json')
  })

  it('runs the full pipeline and returns synthesized JSON', async () => {
    env.AI.run = vi.fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"steps":[{"id":"1","description":"Gather overview"}]}' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"overview":"TestCo overview"}' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"overview":"TestCo overview"}' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"Overview":"TestCo overview","Leadership":[],"Products/Services":[]}' } }] })

    const request = new Request('https://example.com/?company=TestCo')
    const response = await worker.fetch(request, env)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      Overview: 'TestCo overview',
      Leadership: [],
      'Products/Services': []
    })
    expect(env.AI.run).toHaveBeenCalledTimes(4)
  })
})
