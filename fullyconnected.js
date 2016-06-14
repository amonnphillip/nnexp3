const nMixin = require('./mixin.js');
const nodeBase = require('./base.js');
const assert = require('assert');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options, previousLayer) {
      assert(options.width);
      assert(options.height);
      assert(options.depth);

      var layer = {
        weights: new Array(options.depth),
        bias: new Array(options.depth),
        forward: {
          count: options.width * options.height,
          width: options.width,
          height: options.height,
          depth: 1
        },
        back: {
          count: previousLayer.getForwardCount(),
          width: 1,
          height: 1,
          depth: previousLayer.getForwardCount()
        }
      };

      for (var biasIndex = 0;biasIndex < options.depth;biasIndex ++) {
        layer.bias[biasIndex] = 0;
      }

      for (var filterIndex = 0;filterIndex < options.depth;filterIndex ++) {
        var weights = new Array(previousLayer.getForwardCount());
        for (var weightIndex = 0;weightIndex < weights.length;weightIndex ++) {
          weights[weightIndex] = 1;
        }
        layer.weights[filterIndex] = weights;
      }

      return layer;
    },
    forward: function(nodeData, prevLayerNodeData) {
      var output = new Array(nodeData.forward.count);

      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {
        var out = 0;
        var weights = nodeData.weights[nodeIndex];
        for (var inputIndex = 0;inputIndex < weights.length; inputIndex ++) {
          out += prevLayerNodeData.forward.output[inputIndex] * weights[inputIndex];
        }

        output[nodeIndex] = out + nodeData.bias[nodeIndex];
      }

      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData) {
      var backPropOutputs = new Array(prevLayerNodeData.forward.count);
      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        backPropOutputs[nodeIndex] = 0;
      }

      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {
        var gradient = nextLayerNodeData.back.output[nodeIndex];

        var weights = nodeData.weights[nodeIndex];
        for (var weightIndex = 0; weightIndex < weights.length; weightIndex++) {
          backPropOutputs[weightIndex] += weights[weightIndex] * gradient;
          weights[weightIndex] += prevLayerNodeData.forward.output[weightIndex] * gradient;

          if (isNaN(weights[weightIndex])) { // TODO: remove this!!!
            console.log();
          }
        }

        nodeData.bias[nodeIndex] += gradient;
      }

      nodeData.back.output = backPropOutputs;
    }
  });
};