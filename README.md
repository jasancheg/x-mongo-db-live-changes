# x-db-oplog

[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)


> Version: 0.1.0.
>
> Updated: Feb 11, 2018. 12:31 pm UTC-6
>
> Status: completed


Listening to MongoDB live changes using oplog in a simple way.

## Features

* The package has a very small footprint and requires just a few dependencies including `mongodb`, `debug` and `eventemitter3`.
* Built on top of the native NodeJS [MongoDB driver](https://github.com/mongodb/node-mongodb-native/).
* Support start and stop tailing the MongoDB `oplog` at any time.
* Support filtering `oplog` events by `namespaces` (database and collections).
* First class `Promise` support which enable the use of `async` and `await`.
* Uses `eventemitter3` for high performance event emitting.
* Strict and readable code enforced with [xo](https://github.com/sindresorhus/xo)
* Unit tested with `mocha` and built with `babel` for backward compatibility with older versions of NodeJS like `v6.x` and `v7.x`.


## Installation

``` bash
$ npm install https://github.com/jasancheg/x-mongo-db-live-changes.git
```

## Configure MongoDB with replica set

You need to configure your MongoDB instance (local instance) to have access to the [oplog](https://docs.mongodb.com/manual/core/replica-set-oplog/), here are some quick steps on how to do so:

1. Shutdown your existing mongo instance if its running.

2. Restart the instance. Use the `--replSet` option to specify the name of the replica set.

``` bash
$ sudo mongod --replSet rs0
```

3. Connect to the mongo instance by executing `mongo` in your terminal:

```bash
$ mongo
```

4. In the mongo shell run `rs.initiate()` to initiate the new replica set:

```bash
> rs.initiate()
```

Once it is initiated then you are ready to start using `x-db-oplog`.

And [here is the official MongoDB documentation](https://docs.mongodb.com/manual/tutorial/convert-standalone-to-replica-set/) if you need additional help on MongoDB replica set.

## Usage

```js
const MongoOplog = require('x-db-oplog');
const oplog = MongoOplog('mongodb://127.0.0.1:27017/local', { ns: 'test.news' });
const { log } = console;

oplog.tail();

oplog.on('op', data => log(data));
oplog.on('insert', doc => log(doc));
oplog.on('update', doc => log(doc));
oplog.on('delete', doc => log(doc.o._id));
oplog.on('error', error => log(error));
oplog.on('end', () => log('Stream ended'));
oplog.stop(() => log('server stopped'));
```

## API

### MongoOplog(uri, [options])

* `uri`: Valid MongoDB uri or a MongoDB server instance.
* `options` MongoDB connection options.

### oplog.tail([fn])

Start tailing.
This method support both `Promise` and `callback`.

```js
const { log, error } = console

oplog.tail()
  .then(() => log('tailing started'))
  .catch(err => error(err))

// or with async/await
async function tail() {
  try {
    await oplog.tail()
    log('tailing started')
  } catch (err) {
    log(err)
  }
}
```

### oplog.stop([fn])

Stop tailing and disconnect from server.
This method support both `Promise` and `callback`.

```js
const { log, error } = console

oplog.stop()
  .then(() => log('tailing stopped'))
  .catch(err => error(err))

// or with async/await
async function stop() {
  try {
    await oplog.stop()
    log('tailing stopped')
  } catch (err) {
    log(err)
  }
}
```

### oplog.destroy([fn])

Destroy the `x-db-oplog` object by stop tailing and disconnecting from server.
This method support both `Promise` and `callback`.

```js
const { log, error } = console

oplog.destroy
  .then(() => log('destroyed'))
  .catch(err => error(err))

// or with async/await
async function destroy() {
  try {
    await oplog.destroy()
    log('destroyed')
  } catch (err) {
    error(err)
  }
}
```

### oplog.ignore

Pause and resume oplog events.

```js
oplog.ignore = true; // to pause
oplog.ignore = false // to resume
```

### oplog.filter(ns)

Create and return a filter object.

```js
const filter = oplog.filter('*.news')
filter.on('op', fn)
oplog.tail()
```

### filter.destroy()

Destroy filter object.

```js
filter.destroy()
```

### filter.ignore

Pause and resume filter events.

```js
filter.ignore = true; // to pause
filter.ignore = false // to resume
```

### events

Events supported by `oplog` and `filter`;

* `op`: All bellow operations (oplog/filter).
* `insert`: Document insert (oplog/filter).
* `update`: Document update (oplog/filter).
* `delete`: Document delete (oplog/filter).
* `end`: Cursor stream ended (oplog).
* `error`: Error (oplog).

## Run tests

Configure MongoDB for active oplog, once this is done then you can run the test:

``` bash
$ npm install
$ npm run test
```


## License

© 2018 MIT License.  Made with ♥️  -  🇨🇷 - [Inidea](http://inideaweb.com) - [Tonisan](http://tonisan.com).
