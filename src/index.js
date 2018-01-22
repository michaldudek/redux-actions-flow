const AFTER = 'AFTER'
const BEFORE = 'BEFORE'

export const after = (type, callback) => ({
  on: AFTER,
  type: type,
  callback: assertFunction(callback)
})

export const before = (type, callback) => ({
  on: BEFORE,
  type: type,
  callback: assertFunction(callback)
})

export default function createMiddleware (flows) {
  flows = Array.isArray(flows) ? flows : [flows]
  return ({ dispatch, getState }) => {
    let initialized = false
    const dispatchQueue = []
    const enqueue = (action) => initialized ? dispatch(action) : dispatchQueue.push(action)

    const listeners = {
      [AFTER]: {},
      [BEFORE]: {}
    }

    flows.map((registerFlow) => {
      if (typeof registerFlow !== 'function') {
        throw new Error('Flow needs to be a function.')
      }

      const events = registerFlow(enqueue)
      if (!Array.isArray(events)) {
        throw new Error('Flow needs to be a function that returns an array of events.')
      }

      events.map(({ on, type, callback }) => {
        if (!listeners[on][type]) {
          listeners[on][type] = []
        }
        listeners[on][type].push(callback)
      })
    })

    initialized = true
    dispatchQueue.map(dispatch)

    return (next) => (action) => {
      const { type } = action

      callAll(listeners[BEFORE][type], action, getState(), dispatch)

      const result = next(action)

      callAll(listeners[AFTER][type], action, getState(), dispatch)

      return result
    }
  }
}

function callAll (listeners, action, state, dispatch) {
  if (listeners) {
    listeners.map((callback) => callback(action, state, dispatch))
  }
}

function assertFunction (func) {
  if (typeof func !== 'function') {
    throw new Error('Passed callback must be a function.')
  }
  return func
}
