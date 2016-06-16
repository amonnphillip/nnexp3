var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options, previousLayer) {
      var width = (previousLayer.getForwardWidth() - options.spatailExtent) / options.stride + 1;
      var height = (previousLayer.getForwardHeight() - options.spatailExtent) / options.stride + 1;
      var depth = previousLayer.getForwardDepth();
      var size = width * height * depth;

      return {
        count: size,
        width: width,
        height: height,
        depth: depth,
        stride: options.stride,
        spatailExtent: options.spatailExtent, // TODO: Not really used!!!
        backData: [],
        forward: {
          count: size,
          width: width,
          height: height,
          depth: depth
        },
        back: {
          count: previousLayer.getForwardWidth() * previousLayer.getForwardHeight() * previousLayer.getForwardDepth(),
          width: previousLayer.getForwardWidth(),
          height: previousLayer.getForwardHeight(),
          depth: previousLayer.getForwardDepth()
        }
      };
    },
    forward: function(nodeData, prevLayerNodeData) {
      var output = new Array(nodeData.forward.count);
      for (var index = 0;index < nodeData.forward.count;index ++) {
        output[index] = Number.NEGATIVE_INFINITY;
      }

      var backData = new Array(nodeData.forward.count);

      var previousLayerWidth = prevLayerNodeData.forward.width;
      var previousLayerHeight = prevLayerNodeData.forward.height;

      for (var d = 0;d < nodeData.forward.depth;d ++) {
        for (var y = 0; y < nodeData.forward.height; y++) {
          var index = (nodeData.forward.width * nodeData.forward.height * d) + (y * nodeData.forward.width);
          for (var x = 0; x < nodeData.forward.width; x++) {

            for (var ys = 0;ys < nodeData.stride;ys ++) {
              var prevIndex = (d * previousLayerWidth * previousLayerHeight) + (((y * nodeData.stride) + ys) * previousLayerWidth) + (x * nodeData.stride);
              for (var xs = 0;xs < nodeData.stride;xs ++) {
                var prevNodeValue = prevLayerNodeData.forward.output[prevIndex];
                if (prevNodeValue > output[index]) {
                  output[index] = prevNodeValue;
                  backData[index] = prevIndex;
                }

                prevIndex ++;
              }
            }

            index++;
          }
        }
      }

      nodeData.backData = backData;
      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData) {
      var backPropOutput = new Array(nodeData.back.count);
      for (var nodeIndex = 0;nodeIndex < nodeData.back.count;nodeIndex ++) {
        backPropOutput[nodeIndex] = 0;
      }

      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {
        backPropOutput[nodeData.backData[nodeIndex]] += nextLayerNodeData.back.output[nodeIndex];
      }

      nodeData.back.output = backPropOutput;
    }
  });
};