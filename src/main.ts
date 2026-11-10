import './styles.css'
import { exampleTasks } from './fixtures'
import { createBoardState } from './state'
import { registerTools } from './webmcp'
import { prepareArchive, applyArchive } from './archive'
import { createTask, setTaskStatus, statuses, taskLimits, type Task, type Status } from './tasks'

const statusLabels: Record<Status, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
}

const form = document.querySelector<HTMLFormElement>('#task-form')!
const titleInput = document.querySelector<HTMLInputElement>('#task-title')!
const projectInput = document.querySelector<HTMLInputElement>('#task-project')!
const formError = document.querySelector<HTMLElement>('#form-error')!
const storageWarning = document.querySelector<HTMLElement>('#storage-warning')!
const boardMessage = document.querySelector<HTMLElement>('#board-message')!
const taskCount = document.querySelector<HTMLElement>('#task-count')!
const resetButton = document.querySelector<HTMLButtonElement>('#reset-board')!
const cardTemplate = document.querySelector<HTMLTemplateElement>('#task-card')!

titleInput.maxLength = taskLimits.title
projectInput.maxLength = taskLimits.project

let storage: Storage | undefined
try {
  storage = window.localStorage
} catch {
  // The board is still usable when browser policy blocks storage access.
}

const state = createBoardState(storage)
let tasks = state.tasks
storageWarning.hidden = state.available

function renderCard(task: Task): HTMLLIElement {
  const card = cardTemplate.content.firstElementChild!.cloneNode(true) as HTMLLIElement
  card.querySelector('.task-id')!.textContent = task.id
  card.querySelector('.task-title')!.textContent = task.title
  card.querySelector('.task-project')!.textContent = task.project

  const priority = card.querySelector<HTMLElement>('.task-priority')!
  priority.textContent = `${task.priority} priority`
  priority.dataset.priority = task.priority

  const statusSelect = card.querySelector('select')!
  statusSelect.setAttribute('aria-label', `Status for ${task.title} (${task.id})`)
  for (const status of statuses) {
    statusSelect.add(new Option(statusLabels[status], status, false, task.status === status))
  }
  statusSelect.addEventListener('change', () => {
    const result = setTaskStatus(tasks, task.id, statusSelect.value)
    if (!result.ok) {
      statusSelect.value = task.status
      boardMessage.textContent = result.message
      return
    }
    const focusedTask = document.activeElement === statusSelect ? task.id : undefined
    updateBoard(result.tasks, `Moved ${task.title} to ${statusLabels[result.task.status]}.`, focusedTask)
  })

  return card
}

function renderBoard(focusedTask?: string) {
  const archivedList = document.querySelector<HTMLElement>('#archived-list')!
  archivedList.replaceChildren(...state.archived.map(task => {
    const item = document.createElement('li')
    item.textContent = `${task.id} — ${task.title} (${task.project})`
    return item
  }))
  taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`
  let nextFocus: HTMLSelectElement | undefined

  for (const status of statuses) {
    const lane = document.querySelector<HTMLElement>(`[data-status="${status}"]`)!
    const laneTasks = tasks.filter((task) => task.status === status)
    lane.querySelector('.lane-count')!.textContent = String(laneTasks.length)
    lane.querySelector<HTMLElement>('.empty-lane')!.hidden = laneTasks.length > 0

    const cards = laneTasks.map((task) => {
      const card = renderCard(task)
      if (task.id === focusedTask) nextFocus = card.querySelector('select')!
      return card
    })
    lane.querySelector('.task-list')!.replaceChildren(...cards)
  }

  nextFocus?.focus()
}

function updateBoard(nextTasks: readonly Task[], message: string, focusedTask?: string, archived?: readonly Task[]) {
  tasks = nextTasks
  const persisted = state.update(tasks, archived)
  storageWarning.hidden = persisted
  renderBoard(focusedTask)
  boardMessage.textContent = message
  return persisted
}

function clearFormError() {
  formError.hidden = true
  formError.textContent = ''
}

form.addEventListener('input', clearFormError)
form.addEventListener('submit', (event) => {
  event.preventDefault()
  const fields = new FormData(form)
  const result = createTask(tasks, {
    title: fields.get('title'),
    project: fields.get('project'),
    priority: fields.get('priority'),
  }, `DD-${crypto.randomUUID()}`)

  if (!result.ok) {
    if (event.agentInvoked) event.respondWith(Promise.resolve(result.message))
    formError.textContent = result.message
    formError.hidden = false
    return
  }

  clearFormError()
  form.reset()
  updateBoard(result.tasks, `Added ${result.task.title} to To do.`)
  titleInput.focus()
  if (event.agentInvoked) event.respondWith(Promise.resolve(`Created ${result.task.id}: ${result.task.title}.`))
})

resetButton.addEventListener('click', () => {
  if (!window.confirm('Restore the example tasks? This will replace your local board changes.')) return
  updateBoard(exampleTasks(), 'The example board was restored.', undefined, [])
})

renderBoard()

const dialog = document.querySelector<HTMLDialogElement>('#archive-dialog')!
const preview = document.querySelector<HTMLElement>('#archive-preview')!
const archiveMessage = document.querySelector<HTMLElement>('#archive-message')!
const confirmArchive = document.querySelector<HTMLButtonElement>('#archive-confirm')!
const cancelArchive = document.querySelector<HTMLButtonElement>('#archive-cancel')!
let pendingArchive = false

function reviewArchive(project: string | undefined, signal?: AbortSignal): Promise<object> {
  if (pendingArchive) return Promise.resolve({ code: 'REVIEW_IN_PROGRESS' })
  const snapshot = prepareArchive(state.tasks, state.revision, project)
  const eligible = snapshot.tasks
  if (!eligible.length) return Promise.resolve({ ok: true, changed: false, archived: [] })
  if (signal?.aborted) return Promise.resolve({ code: 'CANCELLED' })
  preview.replaceChildren(...eligible.map(task => {
    const item = document.createElement('li')
    item.textContent = `${task.id} — ${task.title} (${task.project})`
    return item
  }))
  archiveMessage.textContent = ''
  pendingArchive = true
  dialog.showModal()
  return new Promise(resolve => {
    const finish = (result: object) => {
      clearTimeout(timeout)
      confirmArchive.removeEventListener('click', confirm)
      cancelArchive.removeEventListener('click', cancel)
      dialog.removeEventListener('cancel', cancel)
      signal?.removeEventListener('abort', cancel)
      pendingArchive = false
      dialog.close()
      resolve(result)
    }
    const cancel = () => finish({ code: 'CANCELLED' })
    const confirm = () => {
      const result = applyArchive(snapshot, state.revision, state.tasks, state.archived)
      if (!result.ok) return finish({ code: result.code, error: 'The board changed. Start a new review.' })
      const saved = updateBoard(result.tasks, `Archived ${eligible.length} tasks.`, undefined, result.archived)
      finish({ ok: true, changed: true, persisted: saved, archived: eligible })
    }
    const timeout = setTimeout(cancel, 120_000)
    confirmArchive.addEventListener('click', confirm)
    cancelArchive.addEventListener('click', cancel)
    dialog.addEventListener('cancel', cancel)
    signal?.addEventListener('abort', cancel, { once: true })
  })
}

const modelContext = (document as Document & { modelContext?: Parameters<typeof registerTools>[0] }).modelContext
const registrations = registerTools(modelContext, { getTasks: () => state.tasks, update: updateBoard, archive: reviewArchive })
if (import.meta.hot) import.meta.hot.dispose(() => registrations.abort())
