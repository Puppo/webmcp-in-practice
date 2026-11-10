import { describe, expect, it } from 'vitest'
import { exampleTasks } from './fixtures'
import { loadTasks, saveTasks } from './storage'
import { createTask, setTaskStatus } from './tasks'

const storageKey = 'webmcp-in-practice:devdesk'

function memoryStorage(raw: string | null = null) {
  const data = new Map<string, string>()
  if (raw !== null) data.set(storageKey, raw)
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

function storageDenied(): never {
  throw new Error('Storage denied')
}

describe('board storage', () => {
  it('starts with deterministic example tasks when no board is saved', () => {
    expect(loadTasks(memoryStorage())).toEqual({ tasks: exampleTasks(), available: true })
    expect(exampleTasks()).not.toBe(exampleTasks())
  })

  it('round-trips created tasks and changed statuses', () => {
    const storage = memoryStorage()
    const created = createTask(exampleTasks(), { title: 'Draft plan', project: 'Docs', priority: 'low' }, 'DD-new')
    if (!created.ok) throw new Error(created.message)
    const moved = setTaskStatus(created.tasks, created.task.id, 'in-progress')
    if (!moved.ok) throw new Error(moved.message)

    expect(saveTasks(storage, moved.tasks)).toBe(true)
    expect(loadTasks(storage)).toEqual({ tasks: moved.tasks, available: true })
  })

  it('preserves an empty saved board', () => {
    const storage = memoryStorage()
    expect(saveTasks(storage, [])).toBe(true)
    expect(loadTasks(storage)).toEqual({ tasks: [], available: true })
  })

  it.each([
    ['invalid JSON', '{'],
    ['null snapshot', 'null'],
    ['unknown version', JSON.stringify({ version: 2, tasks: [] })],
    ['missing fields', JSON.stringify({ version: 1, tasks: [{ id: 'DD-101' }] })],
    ['invalid status', JSON.stringify({ version: 1, tasks: [{ ...exampleTasks()[0], status: 'archive' }] })],
    ['duplicate IDs', JSON.stringify({ version: 1, tasks: [exampleTasks()[0], exampleTasks()[0]] })],
  ])('loads the examples for %s', (_description, raw) => {
    expect(loadTasks(memoryStorage(raw))).toEqual({ tasks: exampleTasks(), available: true })
  })

  it('reports missing storage and read or write failures', () => {
    const storage = memoryStorage()
    expect(loadTasks(undefined)).toEqual({ tasks: exampleTasks(), available: false })
    expect(loadTasks({ ...storage, getItem: storageDenied })).toEqual({ tasks: exampleTasks(), available: false })
    expect(saveTasks(undefined, [])).toBe(false)
    expect(saveTasks({ ...storage, setItem: storageDenied }, [])).toBe(false)
  })

  it('replaces a saved board with the same examples on reset', () => {
    const storage = memoryStorage()
    saveTasks(storage, [])
    saveTasks(storage, exampleTasks())
    expect(loadTasks(storage)).toEqual({ tasks: exampleTasks(), available: true })
  })
})
