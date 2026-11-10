interface SubmitEvent {
  readonly agentInvoked?: boolean
  respondWith(response: Promise<string>): void
}
