const nMixin = require('./mixin.js');
const nodeBase = require('./base.js');
const assert = require('assert');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options, previousLayer) {
      assert(previousLayer.getNodeData().forward.width === options.width);
      assert(previousLayer.getNodeData().forward.height === options.height);
      assert(previousLayer.getNodeData().forward.depth === options.depth);

      const size = options.width * options.height * options.depth;

      return {
        forward: {
          count: size,
          width: options.width,
          height: options.height,
          depth: options.depth
        },
        back: {
          count: size,
          width: options.width,
          height: options.height,
          depth: options.depth
        }
      };
    },
    forward: function(nodeData, prevLayerNodeData) {
      var output = new Array(nodeData.forward.count);
      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {
        output[nodeIndex] = prevLayerNodeData.forward.output[nodeIndex];
      }

      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData, learnRate, expectedOutputs) {
      assert(Array.isArray(expectedOutputs));
      assert(expectedOutputs.length === nodeData.back.count);

      var backPropOutput = new Array(nodeData.back.count);
      for (var nodeIndex = 0;nodeIndex < nodeData.back.count;nodeIndex ++) {
        backPropOutput[nodeIndex] = expectedOutputs[nodeIndex];
      }

      nodeData.back.output = backPropOutput;
    }
  });
};