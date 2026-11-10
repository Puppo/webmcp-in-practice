import { isStatus, setTaskStatus, statuses, type Task } from './tasks'

interface ModelTool {
  name: string
  description: string
  inputSchema: object
  annotations?: object
  execute: (input: Record<string, unknown>) => Promise<{ content: { type: 'text'; text: string }[] }>
}
interface ModelContext {
  registerTool(tool: ModelTool, options: { signal: AbortSignal }): Promise<void>
}

const output = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

export function registerTools(context: ModelContext | undefined, board: {
  getTasks: () => readonly Task[]
  update: (tasks: readonly Task[], message: string) => void
}) {
  const controller = new AbortController()
  if (!context) return controller
  const tools: ModelTool[] = [
    {
      name: 'list_tasks',
      description: 'Find tasks on the board. Use this to identify a task before updating it.',
      inputSchema: { type: 'object', properties: {
        project: { type: 'string', description: 'Exact project name, ignoring case.' },
        status: { type: 'string', enum: statuses },
        query: { type: 'string', description: 'Case-insensitive title substring.' },
      }, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        if ((input.project !== undefined && typeof input.project !== 'string') ||
            (input.query !== undefined && typeof input.query !== 'string') ||
            (input.status !== undefined && !isStatus(input.status))) return output({ error: 'Invalid filters.' })
        const project = typeof input.project === 'string' ? input.project.toLowerCase() : undefined
        const query = typeof input.query === 'string' ? input.query.toLowerCase() : undefined
        return output(board.getTasks().filter(task =>
          (project === undefined || task.project.toLowerCase() === project) &&
          (query === undefined || task.title.toLowerCase().includes(query)) &&
          (input.status === undefined || task.status === input.status)))
      },
    },
    {
      name: 'set_task_status',
      description: 'Update a known task by its ID. Find the task first if its identity is unclear.',
      inputSchema: { type: 'object', properties: {
        taskId: { type: 'string', description: 'The unique task ID.' },
        status: { type: 'string', enum: statuses },
      }, required: ['taskId', 'status'], additionalProperties: false },
      annotations: { untrustedContentHint: true },
      async execute(input) {
        if (typeof input.taskId !== 'string') return output({ error: 'Provide a task ID.' })
        const result = setTaskStatus(board.getTasks(), input.taskId, input.status)
        if (!result.ok) return output({ error: result.message })
        board.update(result.tasks, `Updated ${result.task.title}.`)
        return output(result.task)
      },
    },
  ]
  for (const tool of tools) void context.registerTool(tool, { signal: controller.signal }).catch(error => {
    if (!controller.signal.aborted) console.error('Could not register WebMCP tool:', error)
  })
  return controller
}
