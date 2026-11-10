import { loadSnapshot, saveSnapshot } from './archive-storage'
import type { Task } from './tasks'

export function createBoardState(storage?: Storage) {
  const loaded = loadSnapshot(storage)
  let snapshot = loaded.snapshot
  let revision = 0
  return {
    get tasks() { return snapshot.tasks },
    get archived() { return snapshot.archived },
    get revision() { return revision },
    available: loaded.available,
    update(next: readonly Task[], archived = snapshot.archived) {
      snapshot = { tasks: next, archived }
      revision++
      return saveSnapshot(storage, snapshot)
    },
  }
}
