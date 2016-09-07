var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');
var assert = require('assert');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options, previousLayer) {
      assert(options.width, 'No width property in options object');
      assert(options.height, 'No height property in options object');
      assert(options.depth, 'No depth property in options object');
      assert(options.width === previousLayer.getForwardWidth(), 'Previous layer forward width is not the same as this layer');
      assert(options.height === previousLayer.getForwardHeight(), 'Previous layer forward height is not the same as this layer');
      assert(options.depth === previousLayer.getForwardDepth(), 'Previous layer forward depth is not the same as this layer');

      var size = options.width * options.height * options.depth;

      var layer = {
        count: size,
        width: options.width,
        height: options.height,
        depth: options.depth,
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

      return layer;
    },
    forward: function(nodeData, prevLayerNodeData) {
      var output = new Array(nodeData.forward.count);

      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {
        var val = prevLayerNodeData.forward.output[nodeIndex];
        if (val < 0) {
          val = 0;
        }

        //if (val > 20 || val < -20) {
        //  console.log('');
        //}
        if (isNaN(val) || !isFinite(val)) { // TODO: remove this!!!
          console.log();
        }

        output[nodeIndex] = val;
      }

      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData) {
      var backPropOutputs = new Array(nodeData.forward.count);

      for (var nodeIndex = 0;nodeIndex < nodeData.count;nodeIndex ++) {
        if (nodeData.forward.output[nodeIndex] <= 0) {
          backPropOutputs[nodeIndex] = 0;
        } else {
          backPropOutputs[nodeIndex] = nextLayerNodeData.back.output[nodeIndex];
        }

        if (isNaN(backPropOutputs[nodeIndex]) || !isFinite(backPropOutputs[nodeIndex])) { // TODO: remove this!!!
          console.log();
        }

        //if (backPropOutputs[nodeIndex] > 10 || backPropOutputs[nodeIndex] < -10) {
        //  console.log('');
        //}
      }



      nodeData.back.output = backPropOutputs;
    }
  });
};