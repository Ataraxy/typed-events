# TypedEvents

A shared event emitter with some useful features.

* Shared event names across files
* Fully typed client
* Emit multiple events in a group
* Call an event and wait for a response req/res
* Wildcard Events
* Namespaced Events
* Middleware

### Define Events

`defineEvents()`

```typescript
// Define event schemas
const userEvents = defineEvents({
  'user.created': async (data: { id: string; name: string }) => {
    console.log(`[User] User created: ${data.name}`)
    return { success: true, userId: data.id }
  },
  'user.updated': async (data: { id: string; changes: Partial<{ name: string }> }) => {
    console.log(`[User] User updated: ${JSON.stringify(data.changes)}`)
    return { updated: true }
  },
  'user.*': async (data, eventName) => {
    console.log(`[User Namespace] ${eventName} →`, data)
  }
})

const orderEvents = defineEvents({
  'order.created': async (data: { orderId: string; total: number }) => {
    console.log(`[Order] Order created: ${data.orderId}, Total: ${data.total}`)
    return { orderConfirmed: true }
  }
})

const globalEvents = defineEvents({
  '*': async (data, eventName) => {
    console.log(`[Wildcard] ${eventName} →`, data)
  }
})
```

### Typed Client

`new TypedEvents([eventSchema])`

```typescript
// Schema map as an array
const eventSchemas = [userEvents, orderEvents, globalEvents]

// Create the event system
const events = new TypedEvents(eventSchemas)
```

### Emit Events

`emit(event, payload)`

```typescript
// Emit events
events.emit('user.created', { id: '123', name: 'Alice' })
```

### Grouped Events

`group([{ event: '', payload: {}, { event: '', payload: {}}])`

```typescript
// Emit multiple events
events.group([
  { event: 'order.created', payload: { id: '123', name: 'example'}},
  { event: 'user.updated', payload: { id: '123', name: 'example' }}
])
```

### Call Events

`await call(event, payload)`

```typescript
// Call an event and wait for a response
const response = await events.call('user.updated', { id: '123', changes: {}})
```

### Midddleware

`use()`

```typescript
// Add middleware for logging
events.use((event, payload, next) => {
  console.log(`[Middleware] Event: ${event}, Payload:`, payload)
  next()
})
```
