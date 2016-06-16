var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');
var assert = require('assert');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options, previousLayer) {
      assert(previousLayer.getForwardWidth() === options.width);
      assert(previousLayer.getForwardHeight() === options.height);
      assert(previousLayer.getForwardDepth() === 1);

      var size = options.width * options.height;

      return {
        count: size,
        width: options.width,
        height: options.height,
        depth: 1,
        forward: {
          count: size,
          width: options.width,
          height: options.height,
          depth: 1
        },
        back: {
          count: size,
          width: options.width,
          height: options.height,
          depth: 1
        }
      };
    },
    forward: function(nodeData, prevLayerNodeData) {
      var output = new Array(nodeData.forward.count);
      var exp = new Array(nodeData.forward.count);
      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {
        output[nodeIndex] = 0;
      }



      var max = Number.NEGATIVE_INFINITY;
      var prevForwards = prevLayerNodeData.forward.output;
      //var prevForwards = [71.001353325644,71.001353325644,71.001353325644,71.001353325644,71.001353325644,163.35091118800426,71.001353325644,71.001353325644,71.001353325644,71.001353325644]
      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        if (prevForwards[nodeIndex] > max) {
          max = prevForwards[nodeIndex];
        }
      }

      var sum = 0;
      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        exp[nodeIndex] = Math.exp(prevForwards[nodeIndex] - max);
        sum += exp[nodeIndex];

        if (isNaN(exp[nodeIndex])) { // TODO: remove this!!!
          console.log();
        }
      }

      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        output[nodeIndex] = exp[nodeIndex] / sum;
      }

      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData) {
      var backPropOutput = new Array(nodeData.back.count);

      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {

        if (nodeData.forward.output[nodeIndex] > 1) {
          console.log('');
        }
        //backPropOutput[nodeIndex] = nextLayerNodeData.back.output[nodeIndex] - nodeData.forward.output[nodeIndex];
        backPropOutput[nodeIndex] = -(nodeData.forward.output[nodeIndex] - nextLayerNodeData.back.output[nodeIndex]);
        //backPropOutput[nodeIndex] = nextLayerNodeData.back.output[nodeIndex];

        if (isNaN(backPropOutput[nodeIndex])) { // TODO: remove this!!!
          console.log();
        }
      }

      nodeData.back.output = backPropOutput;
    }
  });
};