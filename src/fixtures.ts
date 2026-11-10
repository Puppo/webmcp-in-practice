import type { Task } from './tasks'

const examples: readonly Task[] = [
  { id: 'DD-101', title: 'Write release notes', project: 'DevDesk', priority: 'medium', status: 'todo' },
  { id: 'DD-102', title: 'Check keyboard navigation', project: 'Design System', priority: 'high', status: 'todo' },
  { id: 'DD-103', title: 'Review form validation', project: 'DevDesk', priority: 'high', status: 'in-progress' },
  { id: 'DD-104', title: 'Write release notes', project: 'Design System', priority: 'low', status: 'in-progress' },
  { id: 'DD-105', title: 'Document the setup steps', project: 'Docs', priority: 'medium', status: 'done' },
  { id: 'DD-106', title: 'Add example tasks', project: 'DevDesk', priority: 'low', status: 'done' },
]

export function exampleTasks(): Task[] {
  return examples.map((task) => ({ ...task }))
}
