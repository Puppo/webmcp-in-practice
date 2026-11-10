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
      update: next => { tasks = next },
    })
    const list = await tools.list_tasks.execute({ project: 'design system', query: 'release notes' })
    const matches = JSON.parse(list.content[0].text)
    expect(matches.map((task: Task) => task.id)).toEqual(['DD-104'])
    await tools.set_task_status.execute({ taskId: 'DD-104', status: 'done' })
    expect(tasks.find(task => task.id === 'DD-104')?.status).toBe('done')
    expect(tasks.find(task => task.id === 'DD-101')?.status).not.toBe('done')
    controller.abort()
  })
})
