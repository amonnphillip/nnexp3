var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options, previousLayer) {
      // TODO: Should be the same size as next layer
      var size = options.width * options.height * options.depth;

      var layer = {
        count: size,
        width: options.width,
        height: options.height,
        depth: options.depth,
        bias: new Array(size),
        error: new Array(size),
        forward: {
          count: size,
          width: options.width,
          height: options.height,
          depth: options.depth
        },
        back: {
          count: previousLayer.getForwardWidth() * previousLayer.getForwardHeight() * previousLayer.getForwardDepth(),
          width: previousLayer.getForwardWidth(),
          height: previousLayer.getForwardHeight(),
          depth: previousLayer.getForwardDepth()
        }
      };

      for (var biasIndex = 0;biasIndex < layer.bias.length;biasIndex ++) {
        layer.bias[biasIndex] = 0.1; // TODO: Use bias?
      }

      return layer;
    },
    forward: function(nodeData, prevLayerNodeData) {
      var output = new Array(nodeData.forward.count);

      var activations = 0;

      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {
        var val = prevLayerNodeData.forward.output[nodeIndex];
        if (val < 0) {
          val = 0;
        } else {
          activations ++;
        }

        output[nodeIndex] = val;
      }

      console.log('activations forward: ' + activations);

      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData, learnRate) {
      var backPropOutputs = new Array(nodeData.forward.count);

      var activations = 0;

      for (var nodeIndex = 0;nodeIndex < nodeData.count;nodeIndex ++) {
        if (nodeData.forward.output[nodeIndex] <= 0) {
          backPropOutputs[nodeIndex] = 0;
        } else {
          backPropOutputs[nodeIndex] = nextLayerNodeData.back.output[nodeIndex];

          activations ++;
        }
      }

      console.log('activations backward: ' + activations);

      nodeData.back.output = backPropOutputs;
    }
  });
};