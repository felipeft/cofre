import { createDemoSeed, DEMO_SCHEMA_VERSION } from './seed.js'

export const DEMO_STORAGE_KEY = 'cofre:demo:v1'

export function createDemoStorage(storage) {
  if (!storage) throw new Error('O armazenamento local não está disponível neste navegador.')

  const write = (state) => {
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
    return state
  }

  const reset = () => write(createDemoSeed())

  const read = () => {
    try {
      const raw = storage.getItem(DEMO_STORAGE_KEY)
      if (!raw) return reset()
      const state = JSON.parse(raw)
      if (state?.schemaVersion !== DEMO_SCHEMA_VERSION) return reset()
      return state
    } catch {
      return reset()
    }
  }

  const update = (mutator) => {
    const state = read()
    const result = mutator(state)
    write(state)
    return result
  }

  return { read, write, update, reset, key: DEMO_STORAGE_KEY }
}
