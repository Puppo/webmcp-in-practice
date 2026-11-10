import { isStatus, setTaskStatus, statuses, type Task } from './tasks'

interface ModelTool {
  name: string
  description: string
  inputSchema: object
  annotations?: object
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<{ content: { type: 'text'; text: string }[] }>
}
interface ModelContext {
  registerTool(tool: ModelTool, options: { signal: AbortSignal }): Promise<void>
}

const output = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

export function registerTools(context: ModelContext | undefined, board: {
  getTasks: () => readonly Task[]
  update: (tasks: readonly Task[], message: string) => boolean
  archive?: (project: string | undefined, signal?: AbortSignal) => Promise<object>
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
      description: 'Update a known task by its ID. Find the task first if its identity is unclear.',
      inputSchema: { type: 'object', properties: {
        taskId: { type: 'string', description: 'The unique task ID.' },
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
  if (board.archive) tools.push({
    name: 'archive_completed_tasks',
    description: 'Ask the user to review completed tasks before archiving them.',
    inputSchema: { type: 'object', properties: { project: { type: 'string', description: 'Exact project name, ignoring case.' } }, additionalProperties: false },
    annotations: { consequentialHint: true, untrustedContentHint: true },
    async execute(input, options) {
      if (input.project !== undefined && (typeof input.project !== 'string' || !input.project.trim())) return output({ code: 'INVALID_INPUT', error: 'Provide a project name or omit it.' })
      return output(await board.archive!(input.project as string | undefined, options?.signal))
    },
  })
  for (const tool of tools) void context.registerTool(tool, { signal: controller.signal }).catch(error => {
    if (!controller.signal.aborted) console.error('Could not register WebMCP tool:', error)
  })
  return controller
}
