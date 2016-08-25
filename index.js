'use strict';

const _ = require('lodash');
const dotProp = require('dot-prop');

module.exports = {
  afterFind: function (results, opt) {
    return bindPopulate.call(this, results, opt);
  },
  afterFindOne: function (result, opt) {
    return bindPopulate.call(this, [result], opt).then(result => result[0]);
  }
};

function bindPopulate(results, opt) {
  if (!opt.path || !opt.model) {
    throw new TypeError('No .pouplate path or model');
  }
  let keys = _.map(results, opt.path);
  let query = opt.match || {};
  let options = {};
  let omitId = false;
  query._id = { $in: keys };
  if (opt.select) {
    options.fields = opt.select;
    /* istanbul ignore else */
    if (options.fields._id === 0) {
      omitId = true;
      if (Object.keys(options.fields).length > 1) {
        options.fields._id = 1;
      } else {
        delete options.fields._id;
      }
    }
  }
  let model = ('string' === typeof opt.model) ? this.model(opt.model, null, opt.options) : opt.model;
  return model
    .find(query, options)
    .exec()
    .then(populates => {
      return _.reduce(populates, function(obj, value) {
        obj[value._id.toString()] = value;
        return obj;
      }, {});
    })
    .then(obj => {
      return _.filter(results, result => {
        let refe = dotProp.get(result, opt.path).toString();
        if (!obj[refe]) {
          return false;
        }
        /* istanbul ignore else */
        if (omitId) delete obj[refe]._id;
        dotProp.set(result, opt.path, obj[refe]);
        return true;
      });
    });
}
