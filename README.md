# dgt-scheduler
A scheduler that let you run, wait and notify non blocking tasks like synchronous code using yield and generator functions.

## Install
    npm install dgt-scheduler

## Usage
    let scheduler = require('dgt-scheduler')

## Basic
`dgt-scheduler` only works with generator functions.
Use `scheduler.add()` to add a task (a generator function), the task will be run as soon as possible.

## Wait for notify
You can wait for a notify to continue the task.

```
let t = scheduler.add(function*() {
  yield scheduler.wait()
  console.log('I am notified after 1 sec!')
})

setTimeout(function() {
  scheduler.notify(t)
}, 1000)
```

You can notify with a parameter (only one parameter).

```
let t = scheduler.add(function*() {
  let name = yield scheduler.wait()
  console.log(name) // 'Hello'
  let age = yield scheduler.wait()
  console.log(age) // 20
})

scheduler.notify(t, 'Hello')
scheduler.notify(t, 20)
```

## Sleep
The task can be sleep.

```
scheduler.add(function*() {
  yield scheduler.sleep(1000)
  console.log('1 sec has passed')
  yield scheduler.sleep(2000)
  console.log('another 2 sec has passed')
})
```

## Wait for a promise
You can wait for a promise to be fulfilled

```
scheduler.add(function*() {
  yield scheduler.waitPromise(new Promise(function(resolve, reject) {
    setTimeout(resolve, 1000)
  }))
  console.log('1 sec has passed and the promise has been fulfilled')
})
```

## Work with an object
`dgt-scheduler` can work with objects and member functions.
You have to add to scheduler as `scheduler.add(owner.func, owner)`

```
function Game() {
  this.x = 10
}

Game.prototype.run = function*() {
  let a = yield scheduler.wait()
  this.x += a
  let b = yield scheduler.wait()
  this.x += b
  console.log(this.x) // 25
}

let game = new Game()
let t = scheduler.add(game.run, game)
scheduler.notify(t, 5)
scheduler.notify(t, 10)
```

## Error handler
You can add your error handler function via `scheduler.onError()`.
Your error handler function will be called when your code throw an error, a waitPromise is rejected and when you notify the task while it is not waiting.

```
scheduler.onError(function(t, func, owner, error) {
  console.log(error)
})
```

## Multitasking
You can add many tasks as you want.

```
function Game() {
  this.t = scheduler.add(this.run, this)
}

Game.prototype.notify = function(command) {
  scheduler.notify(this.t, command)
}

Game.prototype.run = function*() {
  while (true) {
    let command = yield scheduler.wait()
    if (command.id == 'QUIT') return
    this.processCommand(command)
  }
}

Game.prototype.processCommand = function(command) {
  // do something useful
}
```

and later

```
let game1 = new Game()
let game2 = new Game()
let game3 = new Game()
let game4 = new Game()

game1.notify(quitCommand)
game2.notify(moveCommand)
game3.notify(joinCommand)
game4.notify(attackCommand)
```

## License
dgt-scheduler is released under the MIT license. See LICENSE for details.
