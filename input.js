var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options) {
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