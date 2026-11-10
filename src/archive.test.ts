import { expect, it } from 'vitest'
import { applyArchive, prepareArchive } from './archive'
import { exampleTasks } from './fixtures'

it('moves only reviewed eligible tasks after confirmation, and rejects stale previews', () => {
  const tasks = exampleTasks().map(task => task.id === 'DD-104' ? { ...task, status: 'done' as const } : task)
  const preview = prepareArchive(tasks, 3, 'design system')
  expect(preview.tasks.map(task => task.id)).toContain('DD-104')
  expect(preview.tasks.every(task => task.status === 'done' && task.project === 'Design System')).toBe(true)
  expect(applyArchive(preview, 4, tasks, [])).toEqual({ ok: false, code: 'STALE_PREVIEW' })
  const result = applyArchive(preview, 3, tasks, [])
  if (!result.ok) throw new Error('Expected archive')
  expect(result.archived).toEqual(preview.tasks)
  expect(result.tasks.some(task => task.id === 'DD-104')).toBe(false)
  expect(result.tasks.some(task => task.id === 'DD-101')).toBe(true)
})
