import { exampleTasks } from './fixtures'
import { isTask, type Task } from './tasks'

const storageKey = 'webmcp-in-practice:devdesk'
const storageVersion = 1

type TaskStorage = Pick<Storage, 'getItem' | 'setItem'>

export function loadTasks(storage: TaskStorage | undefined): { tasks: readonly Task[]; available: boolean } {
  if (!storage) return { tasks: exampleTasks(), available: false }

  let raw: string | null
  try {
    raw = storage.getItem(storageKey)
  } catch {
    return { tasks: exampleTasks(), available: false }
  }
  if (raw === null) return { tasks: exampleTasks(), available: true }

  try {
    const data = JSON.parse(raw)
    if (data?.version === storageVersion && Array.isArray(data.tasks) && data.tasks.every(isTask)) {
      const tasks: Task[] = data.tasks
      if (new Set(tasks.map((task) => task.id)).size === tasks.length) {
        return { tasks, available: true }
      }
    }
  } catch {
    // A malformed snapshot falls back to the example board.
  }
  return { tasks: exampleTasks(), available: true }
}

export function saveTasks(storage: TaskStorage | undefined, tasks: readonly Task[]): boolean {
  if (!storage) return false

  try {
    storage.setItem(storageKey, JSON.stringify({ version: storageVersion, tasks }))
    return true
  } catch {
    return false
  }
}
