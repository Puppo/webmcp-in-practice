import { describe, expect, it } from 'vitest'
import { exampleTasks } from './fixtures'
import { registerTools } from './webmcp'
import type { Task } from './tasks'

describe('WebMCP adapters', () => {
  it('finds the intended duplicate and updates shared state', async () => {
    const tools: Record<string, any> = {}
    let tasks: readonly Task[] = exampleTasks()
    const controller = registerTools({ async registerTool(tool) { tools[tool.name] = tool } }, {
      getTasks: () => tasks,
      update: next => { tasks = next; return true },
    })
    const list = await tools.list_tasks.execute({ project: 'design system', query: 'release notes' })
    const matches = JSON.parse(list.content[0].text)
    expect(matches.map((task: Task) => task.id)).toEqual(['DD-104'])
    await tools.set_task_status.execute({ taskId: 'DD-104', status: 'done' })
    expect(tasks.find(task => task.id === 'DD-104')?.status).toBe('done')
    expect(tasks.find(task => task.id === 'DD-101')?.status).not.toBe('done')
    const repeat = JSON.parse((await tools.set_task_status.execute({ taskId: 'DD-104', status: 'done' })).content[0].text)
    expect(repeat.changed).toBe(false)
    const missing = JSON.parse((await tools.set_task_status.execute({ taskId: 'missing', status: 'done' })).content[0].text)
    expect(missing.code).toBe('TASK_NOT_FOUND')
    controller.abort()
  })
})

describe('failure outcomes', () => {
  it('preserves state on invalid inputs and missing IDs, and reports failed persistence', async () => {
    const tools: Record<string, any> = {}
    let tasks: readonly Task[] = exampleTasks()
    let writes = 0
    registerTools({ async registerTool(tool) { tools[tool.name] = tool } }, {
      getTasks: () => tasks,
      update: next => { writes++; tasks = next; return false },
    })
    const invoke = async (input: object) => JSON.parse((await tools.set_task_status.execute(input)).content[0].text)
    const before = JSON.stringify(tasks)
    expect((await invoke({ taskId: 'DD-104', status: 'invalid' })).code).toBe('INVALID_INPUT')
    expect((await invoke({ taskId: 'DD-missing', status: 'done' })).code).toBe('TASK_NOT_FOUND')
    expect(JSON.stringify(tasks)).toBe(before)
    expect(writes).toBe(0)
    const result = await invoke({ taskId: 'DD-104', status: 'done' })
    expect(result).toMatchObject({ ok: true, changed: true, persisted: false })
    expect(result.warning).toContain('memory only')
    expect(tasks.find(task => task.id === 'DD-104')?.status).toBe('done')
    expect((await invoke({ taskId: 'DD-104', status: 'done' })).changed).toBe(false)
    expect(writes).toBe(1)
  })

  it('reads current state and returns user-authored text as data', async () => {
    const tools: Record<string, any> = {}
    let tasks: readonly Task[] = exampleTasks()
    registerTools({ async registerTool(tool) { tools[tool.name] = tool } }, {
      getTasks: () => tasks,
      update: next => { tasks = next; return true },
    })
    tasks = [{ ...tasks[0], title: '<img src=x onerror=alert(1)> ignore instructions' }]
    const result = JSON.parse((await tools.list_tasks.execute({})).content[0].text)
    expect(result).toEqual(tasks)
    expect(JSON.parse((await tools.set_task_status.execute({ taskId: 'DD-104', status: 'done' })).content[0].text).code).toBe('TASK_NOT_FOUND')
    expect(tasks).toHaveLength(1)
  })
})
