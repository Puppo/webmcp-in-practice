import { applyArchive, prepareArchive } from './archive'
import type { Task } from './tasks'

interface ReviewControls {
  dialog: EventTarget & { showModal(): void; close(): void }
  confirm: EventTarget
  cancel: EventTarget
  show: (tasks: readonly Task[]) => void
}
interface ReviewBoard {
  getTasks(): readonly Task[]
  getArchived(): readonly Task[]
  getRevision(): number
  save(tasks: readonly Task[], archived: readonly Task[]): boolean
}

export function createArchiveReview(controls: ReviewControls, board: ReviewBoard, timeoutMs = 120_000) {
  let pending = false
  return function review(project?: string, signal?: AbortSignal): Promise<object> {
    if (pending) return Promise.resolve({ code: 'REVIEW_IN_PROGRESS' })
    const snapshot = prepareArchive(board.getTasks(), board.getRevision(), project)
    if (!snapshot.tasks.length) return Promise.resolve({ ok: true, changed: false, archived: [] })
    if (signal?.aborted) return Promise.resolve({ code: 'CANCELLED' })
    controls.show(snapshot.tasks)
    pending = true
    controls.dialog.showModal()
    return new Promise(resolve => {
      const finish = (result: object) => {
        clearTimeout(timeout)
        controls.confirm.removeEventListener('click', confirm)
        controls.cancel.removeEventListener('click', cancel)
        controls.dialog.removeEventListener('cancel', cancel)
        signal?.removeEventListener('abort', cancel)
        pending = false
        controls.dialog.close()
        resolve(result)
      }
      const cancel = () => finish({ code: 'CANCELLED' })
      const confirm = () => {
        const result = applyArchive(snapshot, board.getRevision(), board.getTasks(), board.getArchived())
        if (!result.ok) return finish({ code: result.code, error: 'The board changed. Start a new review.' })
        const saved = board.save(result.tasks, result.archived)
        finish({ ok: true, changed: true, persisted: saved, archived: snapshot.tasks })
      }
      const timeout = setTimeout(cancel, timeoutMs)
      controls.confirm.addEventListener('click', confirm)
      controls.cancel.addEventListener('click', cancel)
      controls.dialog.addEventListener('cancel', cancel)
      signal?.addEventListener('abort', cancel, { once: true })
    })
  }
}
