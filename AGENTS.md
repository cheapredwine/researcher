# Company Research Agent Architecture

This document defines the complete architecture, agent roles, prompts, data flow, and orchestration logic for the Company Research Agent implemented as a Cloudflare Worker in TypeScript. It is written so that any LLM with access to this file can recreate the entire project from scratch.

---

## 1. System Overview

The system performs structured company research using a four-agent pipeline:

1. **Planner** — breaks the research request into discrete steps
2. **Researcher** — performs each step using verifiable information
3. **Validator** — removes hallucinations, fixes inconsistencies, and ensures JSON validity
4. **Synthesizer** — produces a final structured report

The Cloudflare Worker orchestrates these agents sequentially using `env.AI.run`.

The Worker accepts a query parameter:

```
?company=<CompanyName>
```

and returns a JSON report.

---

## 2. High-Level Workflow

1. Receive request with `company` parameter
2. Planner generates a JSON plan with 5–7 steps
3. For each step:
   - Researcher executes the step
   - Validator cleans and corrects the output
4. Synthesizer merges all validated results into a final JSON report
5. Worker returns the report

All agent outputs must be **valid JSON**.

---

## 3. Agent Definitions

### 3.1 Planner Agent

**Purpose:**
Break the research task into a structured sequence of steps.

**Input:**
Company name.

**Output Schema:**
```json
{
  "steps": [
    { "id": "1", "description": "..." }
  ]
}
```

**Prompt:**
```
You are the Planner. Break company research into 5–7 concrete steps.
Steps must be JSON: { "steps": [ { "id": "1", "description": "..." }, ... ] }.
```

---

### 3.2 Researcher Agent

**Purpose:**
Perform the research for a single step using verifiable information.

**Input:**
- Company name
- Step description

**Output:**
Valid JSON containing the researched information.

**Prompt:**
```
You are the Researcher. Execute the step thoroughly.
Use only verifiable information. If uncertain, say so.
Output JSON only.
```

---

### 3.3 Validator Agent

**Purpose:**
Ensure correctness, remove hallucinations, and enforce JSON validity.

**Input:**
Raw Researcher output.

**Output:**
Corrected JSON.

**Prompt:**
```
You are the Validator. Your job:
- detect hallucinations
- remove unverifiable claims
- ensure internal consistency
- fill missing data if possible
Output corrected JSON only.
```

---

### 3.4 Synthesizer Agent

**Purpose:**
Combine all validated step results into a final structured report.

**Input:**
Object containing:
- company name
- validated results keyed by step ID

**Output:**
Final JSON report.

**Prompt:**
```
You are the Synthesizer. Combine all validated research into a clean,
structured JSON report with sections:
- Overview
- Leadership
- Products/Services
- Financials (if available)
- Remote/Hybrid Policy
- Risks/Red Flags
- Address & Legal Entity Notes
- Summary for Job Targeting
Output JSON only.
```

---

## 4. Worker Orchestration Logic

### 4.1 Fetch Handler

1. Parse `company` from URL
2. Call Planner → parse JSON
3. Loop through steps:
   - Call Researcher
   - Call Validator
   - Store validated result under `results[step.id]`
4. Call Synthesizer with `{ company, results }`
5. Return final JSON

### 4.2 Agent Execution Function

All agents are executed via:

```
env.AI.run("@cf/openai/chat/completions", {
  model: "gpt-4.1",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ]
})
```

The Worker extracts:

```
response.choices[0].message.content
```

---

## 5. Error Handling

- If Planner output is not valid JSON → return 500 with raw output
- If Researcher or Validator output is invalid JSON → store:
  ```json
  { "error": "Invalid JSON", "raw": "<content>" }
  ```
- The system must never crash due to malformed agent output
- Synthesizer always receives a complete object, even if some steps contain errors

---

## 6. Expected File Structure

```
project/
  src/
    index.ts
  .github/
    workflows/
      deploy.yml
  package.json
  tsconfig.json
  wrangler.toml
  README.md
  AGENTS.md
```

---

## 7. Deployment Assumptions

- Cloudflare Worker using `wrangler deploy`
- `env.AI` is configured via Wrangler’s `[ai]` binding
- GitHub Actions workflow deploys on push to `main`
- Node 20 is used for CI/CD

---

## 8. Reproducibility Guarantee

Any LLM with access to this file can:

- recreate the TypeScript Worker
- recreate all prompts
- recreate the orchestration logic
- recreate the directory structure
- recreate the CI/CD workflow
- deploy the Worker to Cloudflare

This file is the authoritative specification for the system.
