var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');
var assert = require('assert');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options) {
      assert(options.width, 'No width property in options object');
      assert(options.height, 'No height property in options object');
      assert(options.depth, 'No depth property in options object');

      var size = options.width * options.height * options.depth;

      return {
        count: size,
        width: options.width,
        height: options.height,
        depth: options.depth,
        forward: {
          count: size,
          width: options.width,
          height: options.height,
          depth: options.depth,
          output: new Array(size)
        }
      };
    },
    setOutput: function(nodeData, index, value) {
      nodeData.forward.output[index] = value;
    },
    forward: function(nodeData) {
      // Do nothing
    },
    backward: function() {
      // Do nothing
    }
  });
};