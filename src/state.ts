import { loadTasks, saveTasks } from './storage'
import type { Task } from './tasks'

export function createBoardState(storage?: Storage) {
  const loaded = loadTasks(storage)
  let tasks = loaded.tasks
  return {
    get tasks() { return tasks },
    available: loaded.available,
    update(next: readonly Task[]) {
      tasks = next
      return saveTasks(storage, tasks)
    },
  }
}
