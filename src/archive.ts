import type { Task } from './tasks'

export function prepareArchive(tasks: readonly Task[], revision: number, project?: string) {
  return { revision, tasks: tasks.filter(task => task.status === 'done' && (project === undefined || task.project.toLowerCase() === project.toLowerCase())) }
}

export function applyArchive(preview: ReturnType<typeof prepareArchive>, currentRevision: number, tasks: readonly Task[], archived: readonly Task[]) {
  if (preview.revision !== currentRevision) return { ok: false as const, code: 'STALE_PREVIEW' }
  const ids = new Set(preview.tasks.map(task => task.id))
  return { ok: true as const, tasks: tasks.filter(task => !ids.has(task.id)), archived: [...archived, ...preview.tasks] }
}
