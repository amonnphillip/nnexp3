var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');
var assert = require('assert');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options, previousLayer) {
      assert(options.width, 'No width property in options object');
      assert(options.height, 'No height property in options object');
      assert(options.filterCount, 'No depth property in options object');
      assert(Number.isInteger(options.pad), 'No pad property in options object');
      assert(options.stride, 'No stride property in options object');
      //var size = options.width * options.height * options.depth;
      //var forwardWidth = Math.floor((options.prevLayerWidth + options.pad * 2 - options.width) / options.stride + 1);
      //var forwardHeight = Math.floor((options.prevLayerHeight + options.pad * 2 - options.height) / options.stride + 1);
      var forwardWidth = Math.floor((previousLayer.getForwardWidth() + options.pad * 2 - options.width) / options.stride + 1);
      var forwardHeight = Math.floor((previousLayer.getForwardHeight()+ options.pad * 2 - options.height) / options.stride + 1);

      if (forwardWidth < 1) {
        forwardWidth = 1;
      }

      if (forwardHeight < 1) {
        forwardHeight = 1;
      }

      var layer = {
        count: options.width * options.height * previousLayer.getForwardDepth(), // TODO: Maybe not needed
        width: options.width, // TODO: Maybe not needed
        height: options.height, // TODO: Maybe not needed
        depth: previousLayer.getForwardDepth(), // TODO: Maybe not needed
        filterCount: options.filterCount,
        filterWidth: options.width,
        filterHeight: options.height,
        filterDepth: previousLayer.getForwardDepth(), // TODO: Is this wrong??
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
          count: previousLayer.getForwardCount(), // TODO: depth should probably always be 1
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

      var backPropOutputsCheck = new Array(nodeData.back.count); // TODO: remove!!
      for (var index = 0;index < nodeData.back.count;index ++) {
        backPropOutputsCheck[index] = 0;
      }

      var output = new Array(nodeData.forward.count);

      var inputStridex = prevLayerNodeData.width / nodeData.forward.width;
      var inputStridey = prevLayerNodeData.height / nodeData.forward.height;

      //var filterStridex = nodeData.width / nodeData.forward.width;
      //var filterStridey = nodeData.height / nodeData.forward.height;

      //var maxx = Math.round(inputStridex);
      //var maxy = Math.round(inputStridey);

      inputStridex = 1;
      inputStridey = 1;

      for (var ad = 0;ad < nodeData.filterCount;ad ++) {
        //var posx = 0;
        //var posy = 0;
        var filters = nodeData.filters[ad];
        for (var ay = 0;ay < nodeData.forward.height;ay ++) {
          for (var ax = 0;ax < nodeData.forward.width;ax ++) {


            var startPosx = Math.floor(ax * inputStridex) - nodeData.pad;
            var startPosy = Math.floor(ay * inputStridey) - nodeData.pad;

            //var filterx = Math.floor(ax * filterStridex);
            //var filtery = Math.floor(ay * filterStridey);

            //var dlog = [];
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
                    //console.log('filter d: ' + ad + ' filter index ' + index1 + ' : ' + 'prev layer x,y: ' + (startPosx + filterPosx) + ',' + (startPosy + filterPosy));
                    //console.log('index1: ' + index1);
                    val += filters[index1] * prevLayerNodeData.forward.output[index2];


                    backPropOutputsCheck[index2] ++;

                    //dlog.push('filter d: ' + ad + ' filter index ' + index1 + ' : ' + 'prev layer x,y: ' + (startPosx + filterPosx) + ',' + (startPosy + filterPosy));
                    //dlog.push('index1: ' + index1);
                    //dlog.push('filters[index1] * prevLayerNodeData.forward.output[index2]: ' + filters[index1] * prevLayerNodeData.forward.output[index2]);
                  }
                } else {
                  //console.log('filter d: ' + ad + ' filter index N/A : ' + 'prev layer x,y: ' + (startPosx + filterPosx) + ',' + (startPosy + filterPosy));
                }
              }
            }

            //console.log('-');
            //console.log('forward: out index: ' + ((((ay * nodeData.width) + ax) * nodeData.filterDepth) + ad) + ' val: ' + val);

            val += nodeData.bias[ad];

            //if (val > 10 || val < -10) {
            //  console.log('');
            //}

            //console.log('output[' + (((ay * nodeData.forward.width) + ax) * nodeData.depth + ad) + '] = ' +val);
            output[((ay * nodeData.forward.width) + ax) * nodeData.forward.depth + ad] = val;
          }
        }
      }

/*
      var missing = 0; // TODO: REMOVE!
      var dupes = 0;
      var dupeSums = 0;
      for (var i = 0;i < backPropOutputsCheck.length;i ++) {
        if (backPropOutputsCheck[i] === 0) {
          missing ++;
        }
        if (backPropOutputsCheck[i] > 1) {
          dupes ++
        }
        dupeSums += backPropOutputsCheck[i];
      }
      console.log('missing: ' + missing + ' dupes: ' + dupes + ' dupeSums: ' + dupeSums);
*/
      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData, learnRate) {

      var preValuesSum = 0; // TODO: remove!!
      var backPropOutputsCheck = new Array(nodeData.back.count); // TODO: remove!!

      var backPropOutputs = new Array(nodeData.back.count);
      for (var index = 0;index < nodeData.back.count;index ++) {
        backPropOutputs[index] = 0;
        backPropOutputsCheck[index] = 0;
      }

      var stridex = prevLayerNodeData.width / nodeData.width;
      var stridey = prevLayerNodeData.height / nodeData.height;

      var inputStridex = prevLayerNodeData.width / nodeData.forward.width;
      var inputStridey = prevLayerNodeData.height / nodeData.forward.height;

      inputStridex = 1;
      inputStridey = 1;

      var gradSum = 0;

      for (var ad = 0;ad < nodeData.filterCount;ad ++) {
        var posx = 0;
        var posy = 0;

        var filters = nodeData.filters[ad];

        for (var ay = 0; ay < nodeData.forward.height;ay++) {
          posx = 0;

          for (var ax = 0; ax < nodeData.forward.width;ax++) {

            var startPosx = Math.floor(ax * inputStridex) - nodeData.pad;
            var startPosy = Math.floor(ay * inputStridey) - nodeData.pad;

            var gradient = nextLayerNodeData.back.output[((nodeData.forward.width * ay) + ax) * nextLayerNodeData.back.depth + ad]; // TODO: nextLayerNodeData.back.depth must = nodeData.filterCount
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

                    //console.log('index1: ' + index1 + ' ox: ' + ox + ' oy: ' + oy + ' ax: ' + ax + ' ay: ' + ay + ' ad: ' + ad + ' filterx: ' + filterx + ' filtery: ' + filtery + ' filterd: ' + filterd);
                    //console.log('filter d: ' + ad + ' filter index ' + index2 + ' : ' + 'prev layer x,y: ' + ox + ',' + oy);

                    //preValuesSum += prevLayerNodeData.forward.output[index1] * gradient * learnRate; // TODO: Remove!!

                    if (index1 > nodeData.forward.output.length || index1 < 0) { // TODO: remove this!!!
                      console.log();
                    }
                    if (index2 > filters.length || index2 < 0) { // TODO: remove this!!!
                      console.log();
                    }

                    //filters[index2] += nodeData.forward.output[index1] * gradient;
                    filters[index2] += prevLayerNodeData.forward.output[index1] * gradient * 0.01;
                    backPropOutputs[index1] += filters[index2] * gradient * 0.01;// * gradient;

                    //backPropOutputs[index1] += filters[index2];

                    if (isNaN(backPropOutputs[index1]) || !isFinite(backPropOutputs[index1])) { // TODO: remove this!!!
                      console.log();
                    }

                    //if (backPropOutputs[index1] > 10 || backPropOutputs[index1] < -10) {
                    //  console.log('');
                    //}
                    backPropOutputsCheck[index1] ++;
                  }
                } else {
                  //console.log('filter d: ' + ad + ' filter index N/A : ' + 'prev layer x,y: ' + ox + ',' + oy);

                }/*else { // TODO: Remove!!
                  for (var filterd = 0; filterd < nodeData.filterDepth; filterd++) {
                    var index1 = ((prevLayerNodeData.forward.width * oy) + ox) * prevLayerNodeData.forward.depth + filterd;
                    //console.log('skipping index1: ' + index1);
                  }
                }*/

              }
            }

            nodeData.bias[ad] += gradient;
          }
        }
      }

      //console.log('preValuesSum: ' + preValuesSum);

      if (backPropOutputsCheck.length != nodeData.back.count) {
        console.log('BAD!');
      }
/*
      var missing = 0; // TODO: REMOVE!
      var dupes = 0;
      var dupeSums = 0;
      for (var i = 0;i < backPropOutputsCheck.length;i ++) {
        if (backPropOutputsCheck[i] === 0) {
          missing ++;
        }
        if (backPropOutputsCheck[i] > 1) {
          dupes ++
        }
        dupeSums += backPropOutputsCheck[i];
      }
      console.log('missing: ' + missing + ' dupes: ' + dupes + ' dupeSums: ' + dupeSums);
*/
      //console.log('gradSum: ' + gradSum);
      nodeData.back.output = backPropOutputs;
    }
  });
};