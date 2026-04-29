export interface Env {
  AI: AIBinding
}

export interface AIChoice {
  message: {
    content: string
  }
}

export interface AIResponse {
  choices: AIChoice[]
}

async function runAgent(env: Env, systemPrompt: string, userPrompt: string) {
  const response = await env.AI.run('@cf/openai/chat/completions', {
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  }) as AIResponse

  const content = response?.choices?.[0]?.message?.content
  return content ?? ''
}

function parseJsonSafe(raw: string) {
  try {
    return { value: JSON.parse(raw), error: undefined }
  } catch (error) {
    return { value: undefined, error: String(error) }
  }
}

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify({ error: 'Unable to serialize response' })
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const company = url.searchParams.get('company')?.trim()

    if (!company) {
      return new Response(JSON.stringify({ error: 'Missing company parameter' }), {
        status: 400,
        headers: { 'content-type': 'application/json;charset=UTF-8' }
      })
    }

    const plannerSystem = 'You are the Planner. Break company research into 5–7 concrete steps.'
    const plannerUser = `Company: ${company}\nSteps must be JSON: { "steps": [ { "id": "1", "description": "..." }, ... ] }.`

    const plannerRaw = await runAgent(env, plannerSystem, plannerUser)
    const plannerParse = parseJsonSafe(plannerRaw)

    if (plannerParse.error || !plannerParse.value?.steps) {
      return new Response(JSON.stringify({ error: 'Planner output invalid JSON', raw: plannerRaw }), {
        status: 500,
        headers: { 'content-type': 'application/json;charset=UTF-8' }
      })
    }

    const steps = Array.isArray(plannerParse.value.steps) ? plannerParse.value.steps : []
    const results: Record<string, unknown> = {}

    for (const step of steps) {
      const id = String(step.id ?? '')
      const description = String(step.description ?? '')

      if (!id || !description) {
        results[id || 'unknown'] = { error: 'Invalid step data', raw: step }
        continue
      }

      const researcherSystem = 'You are the Researcher. Execute the step thoroughly. Use only verifiable information. If uncertain, say so. Output JSON only.'
      const researcherUser = `Company: ${company}\nStep: ${description}`
      const researcherRaw = await runAgent(env, researcherSystem, researcherUser)
      const researcherParse = parseJsonSafe(researcherRaw)

      if (researcherParse.error) {
        results[id] = { error: 'Invalid JSON', raw: researcherRaw }
        continue
      }

      const validatorSystem = 'You are the Validator. Your job:\n- detect hallucinations\n- remove unverifiable claims\n- ensure internal consistency\n- fill missing data if possible\nOutput corrected JSON only.'
      const validatorUser = `Raw research output for company ${company}, step ${id}: ${JSON.stringify(researcherParse.value)}`
      const validatorRaw = await runAgent(env, validatorSystem, validatorUser)
      const validatorParse = parseJsonSafe(validatorRaw)

      if (validatorParse.error) {
        results[id] = { error: 'Invalid JSON', raw: validatorRaw }
        continue
      }

      results[id] = validatorParse.value
    }

    const synthesizerSystem = 'You are the Synthesizer. Combine all validated research into a clean, structured JSON report.'
    const synthesizerUser = `Company: ${company}\nValidated results: ${JSON.stringify(results)}\nRespond with a JSON-only object containing sections: Overview, Leadership, Products/Services, Financials (if available), Remote/Hybrid Policy, Risks/Red Flags, Address & Legal Entity Notes, Summary for Job Targeting.`
    const synthesizeRaw = await runAgent(env, synthesizerSystem, synthesizerUser)
    const synthesizeParse = parseJsonSafe(synthesizeRaw)

    const finalBody = synthesizeParse.error
      ? { error: 'Synthesizer output invalid JSON', raw: synthesizeRaw, planner: plannerParse.value, results }
      : synthesizeParse.value

    return new Response(safeJsonStringify(finalBody), {
      headers: { 'content-type': 'application/json;charset=UTF-8' }
    })
  }
}
