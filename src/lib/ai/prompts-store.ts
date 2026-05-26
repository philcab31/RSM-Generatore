import { DEFAULT_PROMPTS } from './prompts-default'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import path from 'path'

const CUSTOM_PATH = path.join(process.cwd(), 'prompts-custom.json')

function loadCustomPrompts(): Record<string, string> {
  try {
    if (existsSync(CUSTOM_PATH)) {
      const raw = readFileSync(CUSTOM_PATH, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {
    // ignore
  }
  return {}
}

export function getPrompt(id: string, variables: Record<string, string>): string {
  const custom = loadCustomPrompts()
  let prompt = custom[id] || DEFAULT_PROMPTS[id] || ''

  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return prompt
}

export function getDefaultPrompt(id: string): string | undefined {
  return DEFAULT_PROMPTS[id]
}

export function getAllDefaultPromptIds(): string[] {
  return Object.keys(DEFAULT_PROMPTS)
}

export function saveCustomPrompts(prompts: Record<string, string>): void {
  try {
    writeFileSync(CUSTOM_PATH, JSON.stringify(prompts, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save custom prompts:', error)
    throw error
  }
}

export function loadMergedPrompts(): Record<string, string> {
  return { ...DEFAULT_PROMPTS, ...loadCustomPrompts() }
}
