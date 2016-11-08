'use strict'

var should = require('should')
var scheduler = require('./index')


describe('testScheduler', function() {
  this.timeout(5000)

  it('works', function(done) {
    done()
  })

  it('can add to scheduler', function(done) {
    scheduler.add(function*() {
      return done()
    })
  })

  it('can sleep', function(done) {
    scheduler.add(function*() {
      yield scheduler.sleep(1000)
      return done()
    })
  })

  it('can handle error', function(done) {
    scheduler.onError(function(taskId, func, owner, error) {
      error.message.should.be.equal('Test throwing an error')
      done()
    })

    scheduler.add(function*() {
      throw new Error('Test throwing an error')
    })
  })

  it('can notify without parameter', function(done) {
    let taskId = scheduler.add(function*() {
      yield scheduler.wait()
      return done()
    })
    scheduler.notify(taskId)
  })

  it('can notify', function(done) {
    let taskId = scheduler.add(function*() {
      let a = yield scheduler.wait()
      a.should.be.equal(10)
      return done()
    })
    scheduler.notify(taskId, 10)
  })

  it('can notify again', function(done) {
    let taskId = scheduler.add(function*() {
      let a = yield scheduler.wait()
      a.should.be.equal(10)
      let b = yield scheduler.wait()
      b.should.be.equal(30)
      let c = a + b
      c.should.be.equal(40)
      return done()
    })
    scheduler.notify(taskId, 10)
    scheduler.notify(taskId, 30)
  })

  it('can work with member function', function() {
    function Game() {
      this.y = 50
    }

    Game.prototype.foo = function() {
      this.y += 10
    }

    let game = new Game()
    let foo = game.foo
    foo = foo.bind(game)
    foo()
    game.y.should.be.equal(60)
  })

  it('test object', function(done) {
    function Game() {
      this.x = 10
    }

    Game.prototype.run = function*() {
      let a = yield 10
      this.x += a
      let b = yield 10
      return done()
    }

    let game = new Game()
    let it = game.run()
    it.next()
    it.next(10)
    it.next()
    game.x.should.be.equal(20)
  })

  it('can work with object', function(done) {
    function Game() {
      this.x = 10
    }

    Game.prototype.run = function*() {
      let a = yield scheduler.wait()
      this.x += a
      let b = yield scheduler.wait()
      this.x += b
      this.x.should.be.equal(25)
      return done()
    }

    let game = new Game()
    let taskId = scheduler.add(game.run, game)
    scheduler.notify(taskId, 5)
    scheduler.notify(taskId, 10)
  })

  it('can work with object and handle error', function(done) {
    function Game() {
      this.x = 10
    }

    Game.prototype.run = function*() {
      throw new Error('Test throwing an error')
    }

    let game = new Game()
    let id = scheduler.add(game.run, game)

    scheduler.onError(function(taskId, func, owner, error) {
      taskId.should.be.equal(id)
      func.should.be.equal(game.run)
      owner.should.be.equal(game)
      error.message.should.be.equal('Test throwing an error')
      done()
    })
  })

  it('can handle error: Notify task that is not in waiting state 1', function(done) {
    scheduler.onError(function(taskId, func, owner, error) {
      error.message.should.be.equal('Notify task that is not in waiting state')
      done()
    })

    function Game(name) {
      this.name = name
      this.x = 10
    }

    Game.prototype.run = function*() {
      yield scheduler.sleep(3000)
      yield scheduler.sleep(3000)
    }

    let game = new Game('game_1')
    let taskId = scheduler.add(game.run, game)
    scheduler.notify(taskId, 5)
  })

  it('can handle error: Notify task that is not in waiting state 2', function(done) {
    scheduler.onError(function(taskId, func, owner, error) {
      error.message.should.be.equal('Notify task that is not in waiting state')
      done()
    })

    function Game(name) {
      this.name = name
      this.x = 10
    }

    Game.prototype.run = function*() {
      let a = yield scheduler.wait()
      this.x += a
      yield scheduler.sleep(3000)
      yield scheduler.sleep(3000)
    }

    let game = new Game('game_1')
    let taskId = scheduler.add(game.run, game)
    setTimeout(function() {
      scheduler.notify(taskId, 5)
    }, 1000)
    setTimeout(function() {
      scheduler.notify(taskId, 10)
    }, 2000)
  })

  it('can handle error: Notify task that is not in waiting state 3', function(done) {
    scheduler.onError(function(taskId, func, owner, error) {
      error.message.should.be.equal('Notify task that is not in waiting state')
      done()
    })

    function Game(name) {
      this.name = name
      this.x = 10
    }

    Game.prototype.run = function*() {
      let a = yield scheduler.wait()
      this.x += a
      yield scheduler.sleep(3000)
      yield scheduler.sleep(3000)
    }

    let game = new Game('game_1')
    let taskId = scheduler.add(game.run, game)
    scheduler.notify(taskId, 5)
    scheduler.notify(taskId, 10)
  })

  it('can wait for a promise', function(done) {
    scheduler.add(function*() {
      let i = 0
      yield scheduler.waitPromise(new Promise(function(resolve, reject) {
        setTimeout(function() {
          i = 1
          resolve()
        }, 1)
      }))
      i.should.be.equal(1)
      return done()
    })
  })

  it('can wait for a promise and handle error in that promise', function(done) {
    scheduler.onError(function(taskId, func, owner, error) {
      error.message.should.be.equal('Test throwing an error in a promise')
      done()
    })

    scheduler.add(function*() {
      yield scheduler.waitPromise(new Promise(function(resolve, reject) {
        setTimeout(function() {
          reject(new Error('Test throwing an error in a promise'))
        }, 1)
      }))
    })
  })
})
