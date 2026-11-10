import { isTask, type Task } from './tasks'
import { loadTasks } from './storage'

const key = 'webmcp-in-practice:devdesk:v2'
type TaskStorage = Pick<Storage, 'getItem' | 'setItem'>
export interface Snapshot { tasks: readonly Task[]; archived: readonly Task[] }

export function loadSnapshot(storage?: TaskStorage): { snapshot: Snapshot; available: boolean } {
  if (!storage) return { snapshot: { tasks: loadTasks(undefined).tasks, archived: [] }, available: false }
  try {
    const raw = storage.getItem(key)
    if (raw === null) {
      const legacy = loadTasks(storage)
      return { snapshot: { tasks: legacy.tasks, archived: [] }, available: legacy.available }
    }
    const data = JSON.parse(raw)
    if (data?.version === 2 && Array.isArray(data.tasks) && Array.isArray(data.archived) &&
        data.tasks.every(isTask) && data.archived.every(isTask)) {
      const all = [...data.tasks, ...data.archived] as Task[]
      if (new Set(all.map(task => task.id)).size === all.length) return { snapshot: { tasks: data.tasks, archived: data.archived }, available: true }
    }
  } catch {
    return { snapshot: { tasks: loadTasks(undefined).tasks, archived: [] }, available: false }
  }
  return { snapshot: { tasks: loadTasks(undefined).tasks, archived: [] }, available: true }
}

export function saveSnapshot(storage: TaskStorage | undefined, snapshot: Snapshot): boolean {
  if (!storage) return false
  try { storage.setItem(key, JSON.stringify({ version: 2, ...snapshot })); return true } catch { return false }
}
