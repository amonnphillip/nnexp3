var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');
var assert = require('assert');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options) {
      assert(options.width, 'No width property in options object');
      assert(options.height, 'No height property in options object');
      assert(options.depth, 'No depth property in options object');
      assert(options.prevLayerWidth, 'No prevLayerWidth property in options object');
      assert(Number.isInteger(options.pad), 'No pad property in options object');
      assert(options.stride, 'No stride property in options object');
      var size = options.width * options.height * options.depth;
      var forwardWidth = Math.floor((options.prevLayerWidth + options.pad * 2 - options.width) / options.stride + 1);
      var forwardHeight = Math.floor((options.prevLayerHeight + options.pad * 2 - options.height) / options.stride + 1);

      if (forwardWidth < 1) {
        forwardWidth = 1;
      }

      if (forwardHeight < 1) {
        forwardHeight = 1;
      }

      var layer = {
        count: size,
        width: options.width,
        height: options.height,
        depth: options.depth,
        filterDepth: options.prevLayerDepth, // TODO: Is thie wrong??
        weights: new Array(size),
        filters: new Array(options.depth),
        bias: new Array(options.depth),
        pad: options.pad,
        stride: options.stride,
        forward: {
          count: forwardWidth * forwardHeight * options.depth,
          width: forwardWidth,
          height: forwardHeight,
          depth: options.depth
        },
        back: {
          count: options.prevLayerWidth * options.prevLayerHeight * options.prevLayerDepth, // TODO: depth should probably always be 1
          width: options.prevLayerWidth,
          height: options.prevLayerHeight,
          depth: options.prevLayerDepth // TODO: should probably always be 1
        }
      };

      /*
       for (var index = 0;index < size;index ++) {
       layer.links[index] = [];
       layer.weights[index] = [];
       }*/

      for (var biasIndex = 0;biasIndex < layer.bias.length;biasIndex ++) {
        layer.bias[biasIndex] = 0.1;
      }

      for (var depthIndex = 0;depthIndex < options.depth;depthIndex ++) {
        layer.filters[depthIndex] = new Array(options.width * options.height * options.prevLayerDepth);
        for (var filterIndex = 0;filterIndex < options.width * options.height * options.prevLayerDepth;filterIndex ++) {
          layer.filters[depthIndex][filterIndex] = 1.0;
        }
      }

      return layer;
    },
    forward: function(nodeData, prevLayerNodeData) {
      var output = new Array(nodeData.forward.count);

      var inputStridex = prevLayerNodeData.width / nodeData.forward.width;
      var inputStridey = prevLayerNodeData.height / nodeData.forward.height;

      var filterStridex = nodeData.width / nodeData.forward.width;
      var filterStridey = nodeData.height / nodeData.forward.height;

      var maxx = Math.round(inputStridex);
      var maxy = Math.round(inputStridey);

      for (var ad = 0;ad < nodeData.depth;ad ++) {
        var posx = 0;
        var posy = 0;
        var filters = nodeData.filters[ad];
        for (var ay = 0;ay < nodeData.forward.height;ay ++) {
          for (var ax = 0;ax < nodeData.forward.width;ax ++) {


            var startPosx = Math.floor(ax * inputStridex);
            var startPosy = Math.floor(ay * inputStridey);

            var filterx = Math.floor(ax * filterStridex);
            var filtery = Math.floor(ay * filterStridey);

            var val = 0;
            for (var filterPosy = 0;filterPosy < nodeData.height;filterPosy ++) {
              for (var filterPosx = 0;filterPosx < nodeData.width;filterPosx ++) {
                for (var prevLayerd = 0;prevLayerd < prevLayerNodeData.forward.depth;prevLayerd ++) {
                  var index1 = ((filterPosy * nodeData.width) + filterPosx) * nodeData.filterDepth + prevLayerd;
                  var index2 = (((startPosy + filterPosy) * prevLayerNodeData.forward.width) + startPosx + filterPosx) * prevLayerNodeData.forward.depth + prevLayerd;
                  //console.log('filter d: ' + ad + ' filter index ' + index1 + ' : ' + 'prev layer x,y: ' + (startPosx + filterPosx) + ',' + (startPosy + filterPosy));
                  if (index2 < prevLayerNodeData.forward.output.length) {
                    val += filters[index1] * prevLayerNodeData.forward.output[index2];
                  }
                }
              }
            }

            //console.log('forward: out index: ' + ((((ay * nodeData.width) + ax) * nodeData.filterDepth) + ad) + ' val: ' + val);
            val += nodeData.bias[ad];
            output[((ay * nodeData.forward.width) + ax) * nodeData.depth + ad] = val;
          }
        }
      }

      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData, learnRate) {
      var backPropWeights = new Array(prevLayerNodeData.forward.count);
      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        backPropWeights[nodeIndex] = 1;
      }
      var backPropOutputs = new Array(nodeData.back.count);
      for (var index = 0;index < nodeData.back.count;index ++) {
        backPropOutputs[index] = 0;
      }

      var stridex = prevLayerNodeData.width / nodeData.width;
      var stridey = prevLayerNodeData.height / nodeData.height;

      var inputStridex = prevLayerNodeData.width / nodeData.forward.width;
      var inputStridey = prevLayerNodeData.height / nodeData.forward.height;

      for (var ad = 0;ad < nodeData.depth;ad ++) {
        var posx = 0;
        var posy = 0;

        var filters = nodeData.filters[ad];

        for (var ay = 0; ay < nodeData.forward.height;ay++) {
          posx = 0;

          for (var ax = 0; ax < nodeData.forward.width;ax++) {

            var startPosx = Math.floor(ax * inputStridex);
            var startPosy = Math.floor(ay * inputStridey);

            // TODO: Need to get the error from next layer?
            var gradient = nextLayerNodeData.back.output[((nodeData.forward.width * ay) + ax) * nodeData.depth + ad];

            for (var filtery = 0;filtery < nodeData.height;filtery ++) {
              var oy = startPosy + filtery;

              for (var filterx = 0;filterx < nodeData.width;filterx ++) {
                var ox = startPosx + filterx;

                if (ox < prevLayerNodeData.forward.width &&
                  oy < prevLayerNodeData.forward.height) {
                  for (var filterd = 0; filterd < nodeData.filterDepth; filterd++) {
                    var index1 = ((prevLayerNodeData.forward.width * oy) + ox) * prevLayerNodeData.forward.depth + filterd;
                    var index2 = ((nodeData.width * filtery) + filterx) * nodeData.filterDepth + filterd;
                    filters[index2] += prevLayerNodeData.forward.output[index1] * gradient * learnRate;
                    backPropOutputs[index1] += filters[index2] * gradient; //
                  }
                }

              }
            }

            nodeData.bias[ad] += gradient * learnRate;
          }
        }
      }

      nodeData.back.weights = backPropWeights;
      nodeData.back.output = backPropOutputs;
    }
  });
};