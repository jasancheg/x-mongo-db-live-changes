'use strict'

const should = require('should')
const { MongoClient } = require('mongodb')
const MongoOplog = require('../src/index')

const conn = {
  mongo: 'mongodb://127.0.0.1:27017/optest',
  oplog: 'mongodb://127.0.0.1:27017/local',
  error: 'mongodb://127.0.0.1:8888/error'
}

let oplog
let opdb
let db

describe('mongo-oplog', () => {
  before(done => {
    MongoClient.connect(conn.mongo, (err, database) => {
      if (err) return done(err)
      db = database
      done()
    })
  })

  it('should be a function', () => {
    should(MongoOplog).be.a.Function
  })

  it('should have required methods', done => {
    oplog = MongoOplog(opdb)
    should(oplog.tail).be.a.Function
    should(oplog.stop).be.a.Function
    should(oplog.filter).be.a.Function
    should(oplog.destroy).be.a.Function
    done()
  })

  it('should accept mongodb object as connection', done => {
    MongoClient.connect(conn.oplog, (err, db) => {
      if (err) return done(err)
      oplog = MongoOplog(db)

      should(oplog.db).eql(db)
      db.dropDatabase(() => {
        db.close(done)
      })
    })
  })

  it('should emit `op` event', done => {
    const coll = db.collection('a')
    oplog = MongoOplog(conn.oplog, { ns: 'optest.a' })
    oplog.on('op', doc => {
      should(doc.op).be.eql('i')
      should(doc.o.n).be.eql('JA')
      should(doc.o.c).be.eql(1)
      done()
    })
    oplog.tail(err => {
      if (err) return done(err)
      coll.insert({ n: 'JA', c: 1 }, err => {
        if (err) return done(err)
      })
    })
  })

  it('should emit `insert` event', done => {
    const coll = db.collection('b')
    oplog = MongoOplog(conn.oplog, { ns: 'optest.b' })
    oplog.on('insert', doc => {
      should(doc.op).be.eql('i')
      should(doc.o.n).be.eql('JASG')
      should(doc.o.c).be.eql(1)
      done()
    })
    oplog.tail(err => {
      if (err) return done(err)
      coll.insert({ n: 'JASG', c: 1 }, err => {
        if (err) return done(err)
      })
    })
  })

  it('should emit `update` event', done => {
    const coll = db.collection('c')
    oplog = MongoOplog(conn.oplog, { ns: 'optest.c' })
    oplog.on('update', doc => {
      should(doc.op).be.eql('u')
      should(doc.o.$set.n).be.eql('US')
      should(doc.o.$set.c).be.eql(7)
      done()
    })
    oplog.tail(err => {
      if (err) return done(err)
      coll.insert({ n: 'CR', c: 3 }, (err, doc) => {
        if (err) return done(err)
        coll.update({_id: {$exists: true}, n: 'CR', c: 3 }, { $set: { n: 'US', c: 7 } },  err => {
          if (err) return done(err)
        })
      })
    })
  })

  it('should emit `delete` event', function(done) {
    this.timeout(0)
    const coll = db.collection('d')
    oplog = MongoOplog(conn.oplog, { ns: 'optest.d' })
    oplog.tail(err => {
      if (err) return done(err)
      coll.insert({ n: 'PM', c: 4 }, (err, doc) => {
        if (err) return done(err)
        var id = (doc.ops || doc)[0]._id
        oplog.on('delete', doc => {
          should(doc.op).be.eql('d')
          should(doc.o._id).be.eql(id)
          done()
        })
        coll.remove({_id: {$exists: true}, n: 'PM', c: 4 }, err => {
          if (err) return done(err)
        })
      })
    })
  })

  it('should emit cursor `end` event', done => {
    oplog = MongoOplog(conn.oplog)
    oplog.tail((err, stream) => {
      if (err) return done(err)
      oplog.once('end', () => {
        done()
      })
      stream.emit('end')
    })
  })

  it('should emit `error` event', done => {
    oplog = MongoOplog(conn.error)
    oplog.tail()
    oplog.on('error', err => {
      should(err).be.an.Error
      done()
    })
  })

  it('should filter by collection', done => {
    const e1 = db.collection('e1')
    const e2 = db.collection('e2')
    oplog = MongoOplog(conn.oplog)

    const filter = oplog.filter('*.e2')

    filter.on('op', doc => {
      should(doc.o.n).be.eql('L2')
      done()
    })

    oplog.tail(err => {
      if (err) return done(err)
      e1.insert({ n: 'L1' }, err => {
        if (err) return done(err)
      })
      e2.insert({ n: 'L2' }, err => {
        if (err) return done(err)
      })
    })
  })

  it('should filter by the exact namespace', done => {
    const cs = db.collection('cs')
    const css = db.collection('css')
    oplog = MongoOplog(conn.oplog)
    const filter = oplog.filter('optest.cs')

    filter.on('op', doc => {
      if ('L1' !== doc.o.n) done('should not throw')
      else done()
    })

    oplog.tail(err => {
      if (err) return done(err)
      css.insert({ n: 'L2' }, err => {
        if (err) return done(err)
        cs.insert({ n: 'L1' }, err => {
          if (err) return done(err)
        })
      })
    })
  })

  it('should filter by namespace in constructor', done => {
    const f1 = db.collection('f1')
    const f2 = db.collection('f2')
    oplog = MongoOplog(conn.oplog, { ns: '*.f1' })
    oplog.on('op', doc => {
      should(doc.o.n).be.eql('L1')
      done()
    })
    oplog.tail(err => {
      if (err) return done(err)
      f1.insert({ n: 'L1' }, err => {
        if (err) return done(err)
      })
      f2.insert({ n: 'L2' }, err => {
        if (err) return done(err)
      })
    })
  })

  it('should destroy filter', done => {
    const coll = db.collection('g')
    oplog = MongoOplog(conn.oplog)
    const filter = oplog.filter('*.g')
    filter.on('op', doc => {
      filter.destroy()
      done()
    })
    oplog.tail(err => {
      if (err) return done(err)
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
    })
  })

  it('should stop tailing', done => {
    const coll = db.collection('h')
    oplog = MongoOplog(conn.oplog, { ns: '*.h' })
    oplog.on('op', doc => {
      oplog.stop()
      done()
    })
    oplog.tail(err => {
      if (err) return done(err)
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
    })
  })

  it('should destroy oplog', done => {
    const coll = db.collection('i')
    oplog = MongoOplog(conn.oplog)
    oplog.on('op', doc => {
      oplog.destroy(done)
    })
    oplog.tail(err => {
      if (err) return done(err)
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
    })
  })

  it('should ignore oplog op events', done => {
    const coll = db.collection('j')
    oplog = MongoOplog(conn.oplog, { ns: '*.j' })
    oplog.on('op', doc => {
      oplog.ignore = true
      done()
    })
    oplog.tail(err => {
      if (err) return done(err)
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
    })
  })

  it('should ignore filter op events', done => {
    const coll = db.collection('k')
    oplog = MongoOplog(conn.oplog)
    const filter = oplog.filter('*.k')

    filter.on('op', doc => {
      filter.ignore = true
      done()
    })

    oplog.tail(err => {
      if (err) return done(err)
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
      coll.insert({ n: 'CR' }, err => {
        if (err) return done(err)
      })
    })
  })

  it('should start from last ts when re-tailing', function (done) {
    this.timeout(0)
    let c = 0
    const v = {}
    const coll = db.collection('i')
    oplog = MongoOplog(conn.oplog, { ns: 'optest.i' })
    oplog.on('op', doc => {
      v[doc.o.c] = 1
      should(Object.keys(v).length).be.equal(++c)
      if (6 === c) done()
      else if (c > 6) done('Not valid')
    })

    oplog.tail(() => {
      coll.insert({ c: 1 })
      coll.insert({ c: 2 })
      coll.insert({ c: 3 })
      setTimeout(() => {
        oplog.stop(() => {
          coll.insert({ c: 4 })
          coll.insert({ c: 5 })
          coll.insert({ c: 6 })
          oplog.tail(() => {
            setTimeout(() => {
              oplog.stop(() => {
                oplog.tail()
              })
            }, 500)
          })
        })
      }, 500)
    })
  })

  it('should start re-tailing on timeout', function (done) {
    this.timeout(0)
    let c = 0
    const v = {}
    const coll = db.collection('n')
    const oplog = MongoOplog(conn.oplog, { ns: 'optest.n' })
    const values = {}
    const valueSize = 0
    oplog.on('op', doc => {
      v[doc.o.c] = 1
      should(Object.keys(v).length).be.equal(++c)
      if (6 === c) {
        setTimeout(() => {
          oplog.destroy(done)
        }, 100)
      } else if (c > 6) done('Not valid')
    })
    oplog.tail((err, stream) => {
      coll.insert({ c: 1 })
      coll.insert({ c: 2 })
      coll.insert({ c: 3 })

      // Mimic a timeout error
      setTimeout(() => {
        stream.emit('error', {
          message: 'cursor killed or timed out',
          stack: {}
        })
        stream.close()
      }, 500)
      stream.on('error', () => {
        setTimeout(() => {
          coll.insert({ c: 4 })
          coll.insert({ c: 5 })
          coll.insert({ c: 6 })
        }, 500)
      })
    })
  })

  it('should not throw if `destroy` called before connecting', done => {
    oplog = MongoOplog()
    done()
  })

  afterEach(done => {
    if (oplog) oplog.destroy(done)
    else setTimeout(done, 10)
  })

  after(done => {
    db.dropDatabase(() => {
      db.close(done)
    })
  })
})
