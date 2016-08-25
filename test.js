'use strict';

const MONGODB = process.env.MONGODB || 'mongodb://localhost:27017/test';

const _ = require('lodash');
const assert = require('assert');
const Mongolass = require('mongolass');
const mongolass = new Mongolass(MONGODB);

const User = mongolass.model('User');

User.plugin('POPULATE', require('./index'));

describe('populate', function () {
  before(function* () {
    yield mongolass.model('User').insertOne({ name: 'aaa', age: 2 });
    yield mongolass.model('User').insertOne({ name: 'bbb', age: 1 });
  });

  after(function* () {
    yield mongolass.model('User').remove();
    mongolass.disconnect();
  });

  it('populate', function* () {
    let users;
    try {
      users = yield User.find().POPULATE({ path: '_id' });
    } catch(e) {
      assert.deepEqual(e.message, 'No .pouplate path or model');
    }

    users = yield User.find().POPULATE({ path: '_id', select: { _id: 0 }, model: 'User' });
    assert.deepEqual(users, [
      { _id: { name: 'aaa', age: 2 }, name: 'aaa', age: 2 },
      { _id: { name: 'bbb', age: 1 }, name: 'bbb', age: 1 }
    ]);
    users = yield User.findOne().POPULATE({ path: '_id', select: { _id: 0 }, model: 'User' });
    assert.deepEqual(users, { _id: { name: 'aaa', age: 2 }, name: 'aaa', age: 2 });

    users = yield User.find().select({ name: 1 }).POPULATE({ path: '_id', match: { name: 'bbb' }, select: { _id: 0, age: 1 }, model: 'User' });
    assert.deepEqual(users, [
      { _id: { age: 1 }, name: 'bbb' }
    ]);
    users = yield User.findOne().select({ name: 1 }).POPULATE({ path: '_id', select: { _id: 0, age: 1 }, model: 'User' });
    assert.deepEqual(users, { _id: { age: 2 }, name: 'aaa' });

    try {
      users = yield User.find().POPULATE({ path: '_id', model: 'User2' });
    } catch(e) {
      assert.ok(e.message.match(/^Not found _id: [0-9a-z]{24} in User2$/));
    }

    //deepPopulate
    users = yield User
      .find()
      .select({ name: 1 })
      .POPULATE({ path: '_id', model: 'User' })
      .POPULATE({ path: '_id._id', model: User })
      .exec()
      .then(results => {
        return _.map(results, result => {
          delete result._id._id._id;
          return result;
        });
      });
    assert.deepEqual(users, [
      { _id: { _id: { name: 'aaa', age: 2 }, name: 'aaa', age: 2 }, name: 'aaa' },
      { _id: { _id: { name: 'bbb', age: 1 }, name: 'bbb', age: 1 }, name: 'bbb' }
    ]);
  });
});
