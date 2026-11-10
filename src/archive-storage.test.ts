import { describe, expect, it } from 'vitest'
import { loadSnapshot, saveSnapshot } from './archive-storage'
import { exampleTasks } from './fixtures'

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
const legacy = 'webmcp-in-practice:devdesk'
const current = 'webmcp-in-practice:devdesk:v2'

describe('archive storage', () => {
  it('migrates valid version 1 tasks and leaves the original snapshot untouched', () => {
    const storage = memoryStorage()
    const raw = JSON.stringify({ version: 1, tasks: exampleTasks() })
    storage.setItem(legacy, raw)
    const { snapshot } = loadSnapshot(storage)
    expect(snapshot).toEqual({ tasks: exampleTasks(), archived: [] })
    expect(saveSnapshot(storage, snapshot)).toBe(true)
    expect(storage.getItem(legacy)).toBe(raw)
    expect(loadSnapshot(storage).snapshot).toEqual(snapshot)
  })
  it('round-trips archived records and rejects duplicate IDs across collections', () => {
    const storage = memoryStorage()
    const [task, ...tasks] = exampleTasks()
    expect(saveSnapshot(storage, { tasks, archived: [task] })).toBe(true)
    expect(loadSnapshot(storage).snapshot).toEqual({ tasks, archived: [task] })
    storage.setItem(current, JSON.stringify({ version: 2, tasks: [task], archived: [task] }))
    expect(loadSnapshot(storage).snapshot).toEqual({ tasks: exampleTasks(), archived: [] })
  })
})
