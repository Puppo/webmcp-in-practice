import schema from '../evals/schema.json'
import { expect, it } from 'vitest'
import { registerTools } from './webmcp'

it('keeps static evaluation schemas in sync with imperative registrations', () => {
  const tools: unknown[] = []
  registerTools({ async registerTool({ execute: _execute, ...definition }) { tools.push(definition) } }, {
    getTasks: () => [], update: () => true,
  })
  expect(schema).toEqual({ tools })
})
