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
  update: (tasks: readonly Task[], message: string) => boolean
}) {
  const controller = new AbortController()
  if (!context) return controller
  const tools: ModelTool[] = [
    {
      name: 'list_tasks',
      description: 'Find tasks by project, status, or title words; results include task IDs. Use it before updating a task the user names by title, and ask which one if several match. Not needed when the user gives a task ID.',
      inputSchema: { type: 'object', properties: {
        project: { type: 'string', description: 'Project name only, e.g. Design System. Exact match, ignoring case. Never put it in query.' },
        status: { type: 'string', enum: statuses },
        query: { type: 'string', description: 'Words from the task title, matched as a case-insensitive substring. Not for IDs or project names.' },
      }, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        if ((input.project !== undefined && typeof input.project !== 'string') ||
            (input.query !== undefined && typeof input.query !== 'string') ||
            (input.status !== undefined && !isStatus(input.status))) return output({ code: 'INVALID_INPUT', error: 'Provide valid filters.' })
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
      description: 'Change a task\'s status by ID. Call it directly when the user gives an ID such as DD-104; otherwise find the ID with list_tasks first. If it returns an error code, tell the user instead of reporting success.',
      inputSchema: { type: 'object', properties: {
        taskId: { type: 'string', description: 'Task ID, e.g. DD-104, as given by the user or returned by list_tasks.' },
        status: { type: 'string', enum: statuses },
      }, required: ['taskId', 'status'], additionalProperties: false },
      annotations: { untrustedContentHint: true },
      async execute(input) {
        if (typeof input.taskId !== 'string' || !input.taskId.trim() || !isStatus(input.status)) return output({ code: 'INVALID_INPUT', error: 'Provide a task ID and valid status.' })
        const current = board.getTasks().find(task => task.id === input.taskId)
        if (!current) return output({ code: 'TASK_NOT_FOUND', error: 'Task not found. List tasks and choose a current ID.' })
        const result = setTaskStatus(board.getTasks(), input.taskId, input.status)
        if (!result.ok) return output({ code: 'INVALID_INPUT', error: result.message })
        const changed = current.status !== result.task.status
        if (!changed) return output({ ok: true, changed: false, task: result.task })
        const persisted = board.update(result.tasks, `Updated ${result.task.title}.`)
        return output({ ok: true, changed: true, persisted, task: result.task, ...(!persisted && { warning: 'Change is in memory only and may be lost on reload.' }) })
      },
    },
  ]
  for (const tool of tools) void context.registerTool(tool, { signal: controller.signal }).catch(error => {
    if (!controller.signal.aborted) console.error('Could not register WebMCP tool:', error)
  })
  return controller
}
