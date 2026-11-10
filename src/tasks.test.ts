import { describe, expect, it } from 'vitest'
import { exampleTasks } from './fixtures'
import { createTask, setTaskStatus } from './tasks'

const input = { title: '  Review the changelog ', project: ' DevDesk ', priority: 'high' }

function frozenExamples() {
  return Object.freeze(exampleTasks().map((task) => Object.freeze(task)))
}

describe('createTask', () => {
  it('trims fields and appends a to-do task without mutating the board', () => {
    const tasks = frozenExamples()
    const result = createTask(tasks, input, 'DD-new')
    const task = { id: 'DD-new', title: 'Review the changelog', project: 'DevDesk', priority: 'high', status: 'todo' }
    expect(result).toEqual({ ok: true, tasks: [...tasks, task], task })
    expect(tasks).toEqual(exampleTasks())
  })

  it.each([
    ['blank title', { title: '  ' }],
    ['long title', { title: 'a'.repeat(121) }],
    ['blank project', { project: '' }],
    ['long project', { project: 'a'.repeat(61) }],
    ['invalid priority', { priority: 'urgent' }],
    ['missing title', { title: null }],
  ])('rejects %s', (_description, invalid) => {
    expect(createTask([], { ...input, ...invalid }, 'DD-new')).toMatchObject({ ok: false })
  })

  it('rejects blank and duplicate IDs', () => {
    const tasks = exampleTasks()
    expect(createTask(tasks, input, ' ')).toMatchObject({ ok: false })
    expect(createTask(tasks, input, 'DD-101')).toMatchObject({ ok: false })
  })
})

describe('setTaskStatus', () => {
  it('updates only the targeted ID when tasks share a title', () => {
    const tasks = frozenExamples()
    const result = setTaskStatus(tasks, 'DD-104', 'done')
    const changedTask = { ...tasks[3], status: 'done' }

    expect(result).toEqual({
      ok: true,
      tasks: [tasks[0], tasks[1], tasks[2], changedTask, tasks[4], tasks[5]],
      task: changedTask,
    })
    expect(tasks).toEqual(exampleTasks())
  })

  it('reuses the original board when the status is unchanged', () => {
    const tasks = exampleTasks()
    const result = setTaskStatus(tasks, 'DD-101', 'todo')
    expect(result.ok && result.tasks).toBe(tasks)
  })

  it('rejects invalid statuses and unknown IDs', () => {
    const tasks = exampleTasks()
    expect(setTaskStatus(tasks, 'DD-101', 'archive')).toMatchObject({ ok: false })
    expect(setTaskStatus(tasks, 'missing', 'done')).toMatchObject({ ok: false })
  })
})
