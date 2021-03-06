'use strict';

const parsers = require('./parsers');

class Resolver {
  static create() {
    return new Resolver();
  }

  resolve(device) {
    return parsers.map(resolver => resolver.parse(device)).filter(model => model !== null);
  }
}

module.exports = Resolver;
