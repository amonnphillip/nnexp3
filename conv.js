const nMixin = require('./mixin.js');
const nodeBase = require('./base.js');
const assert = require('assert');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options, previousLayer) {
      assert(options.width, 'No width property in options object');
      assert(options.height, 'No height property in options object');
      assert(options.filterCount, 'No depth property in options object');
      assert(Number.isInteger(options.pad), 'No pad property in options object');
      assert(options.stride, 'No stride property in options object');
      var forwardWidth = Math.floor((previousLayer.getForwardWidth() + options.pad * 2 - options.width) / options.stride + 1);
      var forwardHeight = Math.floor((previousLayer.getForwardHeight()+ options.pad * 2 - options.height) / options.stride + 1);

      if (forwardWidth < 1) {
        forwardWidth = 1;
      }

      if (forwardHeight < 1) {
        forwardHeight = 1;
      }

      var layer = {
        count: options.width * options.height * previousLayer.getForwardDepth(),
        width: options.width,
        height: options.height,
        depth: previousLayer.getForwardDepth(),
        filterCount: options.filterCount,
        filterWidth: options.width,
        filterHeight: options.height,
        filterDepth: previousLayer.getForwardDepth(),
        filters: new Array(options.filterCount),
        bias: new Array(options.filterCount),
        pad: options.pad,
        stride: options.stride,
        forward: {
          count: forwardWidth * forwardHeight * options.filterCount,
          width: forwardWidth,
          height: forwardHeight,
          depth: options.filterCount
        },
        back: {
          count: previousLayer.getForwardCount(),
          width: previousLayer.getForwardWidth(),
          height: previousLayer.getForwardHeight(),
          depth: previousLayer.getForwardDepth()
        }
      };

      for (var biasIndex = 0;biasIndex < layer.bias.length;biasIndex ++) {
        layer.bias[biasIndex] = 0;
      }

      var weightCount = options.width * options.height * previousLayer.getForwardDepth();
      for (var filterIndex = 0;filterIndex < options.filterCount;filterIndex ++) {
        layer.filters[filterIndex] = new Array(weightCount);
        for (var index = 0;index < weightCount;index ++) {
          layer.filters[filterIndex][index] = 0.5;
        }
        
        this.normalizeWeights(layer.filters[filterIndex], weightCount);
      }

      return layer;
    },
    forward: function(nodeData, prevLayerNodeData) {
      var output = new Array(nodeData.forward.count);

      for (var ad = 0;ad < nodeData.filterCount;ad ++) {
        var filters = nodeData.filters[ad];
        for (var ay = 0;ay < nodeData.forward.height;ay ++) {
          for (var ax = 0;ax < nodeData.forward.width;ax ++) {

            var startPosx = Math.floor(ax) - nodeData.pad;
            var startPosy = Math.floor(ay) - nodeData.pad;

            var val = 0;
            for (var filterPosy = 0;filterPosy < nodeData.filterHeight;filterPosy ++) {
              for (var filterPosx = 0;filterPosx < nodeData.filterWidth;filterPosx ++) {

                if ((startPosy + filterPosy) >= 0
                  && (startPosy + filterPosy) < prevLayerNodeData.forward.height &&
                  (startPosx + filterPosx) >= 0 &&
                  (startPosx + filterPosx) < prevLayerNodeData.forward.width) {
                  for (var prevLayerd = 0;prevLayerd < nodeData.filterDepth;prevLayerd ++) {
                    var index1 = ((filterPosy * nodeData.filterWidth) + filterPosx) * nodeData.filterDepth + prevLayerd;
                    var index2 = (((startPosy + filterPosy) * prevLayerNodeData.forward.width) + startPosx + filterPosx) * prevLayerNodeData.forward.depth + prevLayerd;
                    val += filters[index1] * prevLayerNodeData.forward.output[index2];
                  }
                }
              }
            }

            val += nodeData.bias[ad];

            output[((ay * nodeData.forward.width) + ax) * nodeData.forward.depth + ad] = val;
          }
        }
      }

      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData, learnRate) {
      var backPropOutputs = new Array(nodeData.back.count);
      for (var index = 0;index < nodeData.back.count;index ++) {
        backPropOutputs[index] = 0;
      }

      var backFilters = new Array(nodeData.filterCount);
      for (var filterIndex = 0;filterIndex < nodeData.filterCount;filterIndex ++) {
        backFilters[filterIndex] = new Array(nodeData.filters[filterIndex].length);
        for (var index = 0; index < nodeData.filters[filterIndex].length; index++) {
          backFilters[filterIndex][index] = 0;
        }
      }

      var gradSum = 0;

      for (var ad = 0;ad < nodeData.filterCount;ad ++) {
        var filters = nodeData.filters[ad];
        var backFilter = backFilters[ad];

        for (var ay = 0; ay < nodeData.forward.height;ay++) {
          for (var ax = 0; ax < nodeData.forward.width;ax++) {

            var startPosx = Math.floor(ax) - nodeData.pad;
            var startPosy = Math.floor(ay) - nodeData.pad;

            var gradient = nextLayerNodeData.back.output[((nodeData.forward.width * ay) + ax) * nextLayerNodeData.back.depth + ad];
            gradSum += gradient;

            for (var filtery = 0;filtery < nodeData.filterHeight;filtery ++) {
              var oy = startPosy + filtery;

              for (var filterx = 0;filterx < nodeData.filterWidth;filterx ++) {
                var ox = startPosx + filterx;

                if (ox >= 0 &&
                  ox < nodeData.forward.width &&
                  oy >= 0 &&
                  oy < nodeData.forward.height) {
                  for (var filterd = 0; filterd < nodeData.filterDepth; filterd++) {
                    var index1 = ((nodeData.forward.width * oy) + ox) * prevLayerNodeData.depth + filterd;
                    var index2 = ((nodeData.filterWidth * filtery) + filterx) * nodeData.filterDepth + filterd;

                    backFilter[index2] += prevLayerNodeData.forward.output[index1] * gradient;
                    backPropOutputs[index1] += filters[index2] * gradient;
                  }
                }
              }
            }

            nodeData.bias[ad] += gradient * learnRate;
          }
        }
      }

      nodeData.back.output = backPropOutputs;

      for (var filterIndex = 0;filterIndex < nodeData.filterCount;filterIndex ++) {
        var filters = nodeData.filters[filterIndex];
        var backFilter = backFilters[filterIndex];
        for (var index = 0; index < nodeData.filters[filterIndex].length; index++) {
          filters[index] += backFilter[index] * learnRate;
        }
      }
    }
  });
};