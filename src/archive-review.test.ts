import { expect, it } from 'vitest'
import { createArchiveReview } from './archive-review'
import { exampleTasks } from './fixtures'
import type { Task } from './tasks'

function setup(timeout = 1000) {
  const dialog = Object.assign(new EventTarget(), { showModal() {}, close() {} })
  const confirm = new EventTarget()
  const cancel = new EventTarget()
  let tasks: readonly Task[] = exampleTasks().map(task => task.id === 'DD-104' ? { ...task, status: 'done' as const } : task)
  let archived: readonly Task[] = []
  let revision = 0
  const review = createArchiveReview({ dialog, confirm, cancel, show() {} }, {
    getTasks: () => tasks, getArchived: () => archived, getRevision: () => revision,
    save(next, archive) { tasks = next; archived = archive; revision++; return true },
  }, timeout)
  return { review, confirm, cancel, dialog, get tasks() { return tasks }, get archived() { return archived }, change() { revision++ } }
}

it('requires confirmation and moves only the reviewed tasks', async () => {
  const app = setup()
  const result = app.review('Design System')
  expect(app.archived).toHaveLength(0)
  app.confirm.dispatchEvent(new Event('click'))
  expect(await result).toMatchObject({ ok: true, changed: true })
  expect(app.archived.some(task => task.id === 'DD-104')).toBe(true)
  expect(app.tasks.some(task => task.id === 'DD-101')).toBe(true)
})

it.each(['cancel', 'abort', 'escape', 'timeout', 'stale'])('%s leaves the archive unchanged', async mode => {
  const app = setup(1)
  const controller = new AbortController()
  const result = app.review('Design System', controller.signal)
  if (mode === 'cancel') app.cancel.dispatchEvent(new Event('click'))
  if (mode === 'abort') controller.abort()
  if (mode === 'escape') app.dialog.dispatchEvent(new Event('cancel'))
  if (mode === 'stale') { app.change(); app.confirm.dispatchEvent(new Event('click')) }
  expect(await result).toMatchObject({ code: mode === 'stale' ? 'STALE_PREVIEW' : 'CANCELLED' })
  expect(app.archived).toHaveLength(0)
  expect(app.tasks.some(task => task.id === 'DD-104')).toBe(true)
})
