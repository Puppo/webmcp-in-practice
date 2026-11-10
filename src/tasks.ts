export const statuses = ['todo', 'in-progress', 'done'] as const
export const priorities = ['low', 'medium', 'high'] as const

export type Status = (typeof statuses)[number]
export type Priority = (typeof priorities)[number]

export interface Task {
  readonly id: string
  readonly title: string
  readonly project: string
  readonly priority: Priority
  readonly status: Status
}

export const taskLimits = { title: 120, project: 60 } as const

export function isStatus(value: unknown): value is Status {
  return statuses.some((status) => status === value)
}

function isPriority(value: unknown): value is Priority {
  return priorities.some((priority) => priority === value)
}

function isValidText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false

  const task = value as Record<string, unknown>
  return (
    typeof task.id === 'string' &&
    task.id.trim().length > 0 &&
    isValidText(task.title, taskLimits.title) &&
    isValidText(task.project, taskLimits.project) &&
    isPriority(task.priority) &&
    isStatus(task.status)
  )
}

interface CreateTaskInput {
  title: unknown
  project: unknown
  priority: unknown
}

type TaskResult = { ok: true; tasks: readonly Task[]; task: Task } | { ok: false; message: string }

export function createTask(tasks: readonly Task[], input: CreateTaskInput, id: string): TaskResult {
  const title = typeof input.title === 'string' ? input.title.trim() : input.title
  const project = typeof input.project === 'string' ? input.project.trim() : input.project

  if (!isValidText(title, taskLimits.title)) {
    return { ok: false, message: `Enter a title between 1 and ${taskLimits.title} characters.` }
  }
  if (!isValidText(project, taskLimits.project)) {
    return { ok: false, message: `Enter a project between 1 and ${taskLimits.project} characters.` }
  }
  if (!isPriority(input.priority)) return { ok: false, message: 'Choose a valid priority.' }
  if (!id.trim() || tasks.some((task) => task.id === id)) {
    return { ok: false, message: 'Could not assign a unique task ID.' }
  }

  const task: Task = { id, title, project, priority: input.priority, status: 'todo' }
  return { ok: true, tasks: [...tasks, task], task }
}

export function setTaskStatus(tasks: readonly Task[], id: string, status: unknown): TaskResult {
  if (!isStatus(status)) return { ok: false, message: 'Choose a valid status.' }

  const current = tasks.find((task) => task.id === id)
  if (!current) return { ok: false, message: 'Task not found.' }
  if (current.status === status) return { ok: true, tasks, task: current }

  const task = { ...current, status }
  return { ok: true, tasks: tasks.map((item) => (item.id === id ? task : item)), task }
}
