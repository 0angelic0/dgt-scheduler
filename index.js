'use strict'


//--------------------------------------------------------------------
// Task
//--------------------------------------------------------------------

const TASK_STATE_INIT = 'init'
const TASK_STATE_RUN = 'run'
const TASK_STATE_WAIT = 'wait'
const TASK_STATE_WAIT_PROMISE = 'wait_promise'
const TASK_STATE_SLEEP = 'sleep'
const TASK_STATE_DONE = 'done'

let s_idleTaskPool = []

function Task(id, func, owner) {
  this.init(id, func, owner)
}

Task.prototype.init = function(id, func, owner) {
  this.id = id
  this.func = func
  this.owner = owner
  this.state = TASK_STATE_INIT
  this.gen = this._initGenerator()
}

Task.prototype._initGenerator = function() {
  let func = this.func
  if (this.owner != undefined) {
    func = this.func.bind(this.owner)
  }
  return func()
}

Task.getTask = function(id, func, owner) {
  if (s_idleTaskPool.length == 0) {
    return new Task(id, func, owner)
  }
  else {
    let reuseTask = s_idleTaskPool.pop()
    reuseTask.init(id, func, owner)
    return reuseTask
  }
}

Task.addToIdlePool = function(task) {
  task.state = TASK_STATE_DONE
  s_idleTaskPool.push(task)
}


//--------------------------------------------------------------------
// Scheduler
//--------------------------------------------------------------------

function Scheduler() {
  this.tasks = {}
  this.lastTaskId = 1
  this.errorHandler = null
}

/**
 * func is only generator function (function*)
 * owner is the func's owner that will be bind as this in func.
 */
Scheduler.prototype.add = function(func, owner) {
  let taskId = '' + this.lastTaskId
  this.lastTaskId++

  let task = Task.getTask(taskId, func, owner)
  this.tasks[taskId] = task
  this._runNextTick(taskId)
  return taskId;
}

Scheduler.prototype._runNextTick = function(taskId, param) {
  process.nextTick(() => {
    this._run(taskId, param)
  })
}

Scheduler.prototype._run = function(taskId, param) {
  let task = this.tasks[taskId]
  task.state = TASK_STATE_RUN

  let result
  try {
    result = task.gen.next(param)
  }
  catch (e) {
    this._handleError(task, e)
    delete this.tasks[taskId]
    Task.addToIdlePool(task)
    return
  }

  if (result.done) {
    delete this.tasks[taskId]
    Task.addToIdlePool(task)
    return
  }
  // Assume that result.value is an object that has properties
  // state
  // promise
  let taskFeedback = result.value
  if (taskFeedback) {
    task.state = taskFeedback.state
    if (taskFeedback.promise) {
      taskFeedback.promise.then(() => {
        this._runNextTick(taskId)
      }).catch((reason) => {
        this._handleError(task, reason)
        delete this.tasks[taskId]
        Task.addToIdlePool(task)
      })
    }
  }
}

Scheduler.prototype._handleError = function(task, error) {
  if (this.errorHandler) {
    this.errorHandler(task.id, task.func, task.owner, error)
  }
  else {
    throw error
  }
}

Scheduler.prototype.notify = function(taskId, param) {
  process.nextTick(() => {
    const task = this.tasks[taskId]
    if (task.state == TASK_STATE_WAIT) {
      this._run(taskId, param)
    }
    else {
      const error = new Error('Notify task that is not in waiting state')
      this._handleError(task, error)
    }
  })
}

Scheduler.prototype.sleep = function(time) {
  const taskFeedback = {
    state: TASK_STATE_SLEEP,
    promise: new Promise(function(resolve, reject) {
      setTimeout(resolve, time)
    })
  }
  return taskFeedback
}

Scheduler.prototype.wait = function() {
  const taskFeedback = {
    state: TASK_STATE_WAIT
  }
  return taskFeedback
}

Scheduler.prototype.waitPromise = function(promise) {
  const taskFeedback = {
    state: TASK_STATE_WAIT_PROMISE,
    promise: promise
  }
  return taskFeedback
}

/**
 * errorHandler = function(taskId, func, owner, error)
 * Error handler will be replaced!
 */
Scheduler.prototype.onError = function(errorHandler) {
  this.errorHandler = errorHandler
}

let scheduler = (function () {
  return new Scheduler()
})()

// Return Singleton Scheduler Object
module.exports = scheduler
