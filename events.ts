type EventHandlers = Record<string, (payload: any, eventName?: string) => Promise<any>>

export class TypedEvents<T extends EventHandlers[]> {
  private handlers: Record<string, ((payload: any, eventName?: string) => Promise<any>)[]> = {}
  private middleware: ((event: string, payload: any, next: Function) => void)[] = []

  constructor(schemas: T) {
    schemas.forEach((schema) => {
      Object.entries(schema).forEach(([event, handler]) => {
        if (!this.handlers[event]) {
          this.handlers[event] = []
        }
        this.handlers[event].push(handler)
      })
    })
  }

  /**
   * The `use` function in TypeScript adds middleware to an array for processing events with payloads.
   * @param middleware - The `use` method in the code snippet is used to add a middleware function to an
   * array called `middleware`. The `middleware` function takes three parameters:
   */
  use(middleware: (event: string, payload: any, next: Function) => void) {
    this.middleware.push(middleware)
  }

  /**
   * The `emit` function in TypeScript asynchronously processes a specified event with its
   * corresponding payload.
   * @param {K} event - The `event` parameter represents the type of event being emitted. It is a key
   * of the `UniqueEvents` type.
   * @param payload - The `payload` parameter in the `emit` function is the data associated with the
   * event being emitted. It could be any type of data that needs to be passed along with the event.
   */
  async emit<K extends keyof UniqueEvents<T>>(event: K, payload: UniqueEvents<T>[K]) {
    await this.processEvent(event as string, payload, false)
  }

  /**
   * The function "call" asynchronously processes a specified event with its corresponding payload.
   * @param {K} event - The `event` parameter is a key of the `UniqueEvents` type, which is a generic
   * type with a constraint `T`.
   * @param payload - The `payload` parameter in the `call` method is the data associated with the event
   * being triggered. It is of type `UniqueEvents<T>[K]`, which means it should match the specific
   * payload type defined for the event key `K`.
   * @returns The `call` method is returning the result of calling the `processEvent` method with the
   * provided `event` and `payload` parameters, along with the boolean value `true`.
   */
  async call<K extends keyof UniqueEvents<T>>(event: K, payload: UniqueEvents<T>[K]) {
    return this.processEvent(event as string, payload, true)
  }

  /**
   * The `group` function in TypeScript asynchronously processes an array of events with their
   * corresponding payloads.
   * @param {{ event: keyof UniqueEvents<T>; payload: UniqueEvents<T>[keyof UniqueEvents<T>] }[]} events
   * - The `events` parameter is an array of objects, where each object has two properties:
   */
  async group(
    events: { event: keyof UniqueEvents<T>; payload: UniqueEvents<T>[keyof UniqueEvents<T>] }[]
  ) {
    await Promise.all(
      events.map(({ event, payload }) => this.processEvent(event as string, payload, false))
    )
  }

  private async processEvent(eventName: string, payload: any, collectResults: boolean) {
    let results: any[] = []

    // Run middleware
    for (let i = 0; i < this.middleware.length; i++) {
      await new Promise((resolve) => {
        this.middleware[i](eventName, payload, resolve)
      })
    }

    // Call specific event listeners
    if (this.handlers[eventName]) {
      const executions = this.handlers[eventName].map((handler) => handler(payload, eventName))
      results.push(
        ...(collectResults ? await Promise.all(executions) : await Promise.allSettled(executions))
      )
    }

    // Call namespaced event listeners (e.g., 'user.*' for 'user.created')
    Object.keys(this.handlers)
      .filter(
        (registeredEvent) =>
          registeredEvent.endsWith('.*') && eventName.startsWith(registeredEvent.replace('.*', ''))
      )
      .forEach(async (namespace) => {
        const executions = this.handlers[namespace].map((handler) => handler(payload, eventName))
        results.push(
          ...(collectResults ? await Promise.all(executions) : await Promise.allSettled(executions))
        )
      })

    // Call wildcard listeners
    if (this.handlers['*']) {
      const executions = this.handlers['*'].map((handler) => handler(payload, eventName))
      results.push(
        ...(collectResults ? await Promise.all(executions) : await Promise.allSettled(executions))
      )
    }

    return collectResults ? results : undefined
  }
}

// Utility types for extracting unique event names and payloads
type UniqueEvents<T extends EventHandlers[]> = {
  [K in keyof UnionToIntersection<T[number]> as K extends string ? K : never]: UnionToIntersection<
    T[number]
  >[K extends string ? K : never] extends (payload: infer P) => any
    ? P
    : never
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

// Wrapper function for defining events
export const defineEvents = <T extends EventHandlers>(schema: T) => schema
