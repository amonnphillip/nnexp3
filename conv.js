var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options) {
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
        //links: new Array(size), // TODO: Dont need?
        weights: new Array(size),
        //output: new Array(size),
        //error: new Array(size), // TODO: Dont need?
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
      var outputCheck = new Array(nodeData.forward.count);
      var inputCheck = new Array(prevLayerNodeData.forward.count);

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

                  if (isNaN(filters[index1])) {
                    console.log();
                  }
                  if (isNaN(val)) {
                    console.log();
                  }
                  inputCheck[index2] = 1;
                }
              }
            }

            //console.log('forward: out index: ' + ((((ay * nodeData.width) + ax) * nodeData.filterDepth) + ad) + ' val: ' + val);
            val += nodeData.bias[ad];
            output[((ay * nodeData.forward.width) + ax) * nodeData.depth + ad] = val;


            outputCheck[((ay * nodeData.forward.width) + ax) * nodeData.depth + ad] = 1;
            /*
             posx += stridex;
             if (posx + stridex > prevLayerNodeData.width) {
             posx = 0;
             posy += stridey;
             // TODO: Check for y overflow
             }*/

          }
        }
      }
      /*
       var missing = 0;
       for (var i = 0;i < nodeData.forward.count;i ++) {
       if (typeof outputCheck[i] === 'undefined') {
       missing ++;
       //console.log('ERROR at output check index: ' + i);
       }
       }
       console.log('missing: ' + missing);

       var missing = 0;
       for (var i = 0;i < prevLayerNodeData.forward.count;i ++) {
       if (typeof inputCheck[i] === 'undefined') {
       missing ++;
       //console.log('ERROR at input check index: ' + i);
       }
       }
       console.log('missing: ' + missing);
       */
      nodeData.forward.output = output;

      // TODO: activation layer??
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData, learnRate) {
      var backPropWeights = new Array(prevLayerNodeData.forward.count);
      var backPropOutputs = new Array(prevLayerNodeData.forward.count);
      var backPropWeighCounts = new Array(prevLayerNodeData.forward.count);
      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        backPropWeights[nodeIndex] = 1;
        //backPropWeighCounts[nodeIndex] = 0;
      }
      var backPropOutputs = new Array(nodeData.back.count);
      for (var index = 0;index < nodeData.back.count;index ++) {
        backPropOutputs[index] = 0;
      }
      //var backPropOutputs = new Array(nodeData.back.count);
      //for (var index = 0;index < nodeData.back.count;index ++) {
      //  backPropOutputs[index] = 0;
      //}

      var outputCheck = new Array(nodeData.forward.count);
      var inputCheck = new Array(prevLayerNodeData.forward.count);
      var backPropOutputsCheck = new Array(nodeData.back.count);
      var filterCheck = new Array(nodeData.filters.length);
      for (var index = 0;index < nodeData.filters.length;index ++) {
        filterCheck[index] = new Array(nodeData.filters[index].length);
      }

      /*
       for (var nodeIndex = 0;nodeIndex < nodeData.count;nodeIndex ++) {

       nodeData.error[nodeIndex] = nodeData.output[nodeIndex] * (1 - nodeData.output[nodeIndex]) * nextLayerNodeData.dataForPrevLayer[nodeIndex];

       var links = nodeData.links[nodeIndex];
       var weights = nodeData.weights[nodeIndex];
       for (var weightIndex = 0; weightIndex < links.length; weightIndex++) {
       weights[weightIndex] += nodeData.error[nodeIndex] * prevLayerNodeData.output[links[weightIndex]] * learnRate;

       dataForPrevLayer[links[weightIndex]] += weights[weightIndex] * nodeData.error[nodeIndex];
       dataCountForPrevLayer[links[weightIndex]] ++;
       }
       }
       */
      var stridex = prevLayerNodeData.width / nodeData.width;
      var stridey = prevLayerNodeData.height / nodeData.height;

      var fstridex = nodeData.width / prevLayerNodeData.width;
      var fstridey = nodeData.height / prevLayerNodeData.height;


      var maxx = Math.round(stridex);
      var maxy = Math.round(stridey);


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

            //var startPosx = Math.floor(posx);
            //var startPosy = Math.floor(posy);

            // TODO: Need to get the error from next layer?
            //var chainGradient = nodeData.forward.output[((nodeData.forward.width * ay) + ax) * nodeData.filterDepth + ad]; // TODO: This is wrong, need to get the gradient some how
            var gradient = /*nodeData.forward.output[((nodeData.forward.width * ay) + ax) * nodeData.depth + ad] **/ nextLayerNodeData.back.output[((nodeData.forward.width * ay) + ax) * nodeData.depth + ad];
            //nodeData.error[nodeIndex] = nodeData.forward.output[nodeIndex] * (1 - nodeData.forward.output[nodeIndex]) * nextLayerNodeData.back.weights[nodeIndex];
            //console.log('chainGradient for: ' + ax + ' ' + ay + ' ' + ad + ' is: ' + chainGradient);

            if (isNaN(gradient)) {
              console.log();
            }

            outputCheck[((nodeData.forward.width * ay) + ax) * nodeData.depth + ad] = 1;

            for (var filtery = 0;filtery < nodeData.height;filtery ++) {
              var oy = startPosy + filtery;

              for (var filterx = 0;filterx < nodeData.width;filterx ++) {
                var ox = startPosx + filterx;

                if (ox < prevLayerNodeData.forward.width &&
                  oy < prevLayerNodeData.forward.height) {
                  for (var filterd = 0; filterd < nodeData.filterDepth; filterd++) {
                    var index1 = ((prevLayerNodeData.forward.width * oy) + ox) * prevLayerNodeData.forward.depth + filterd;
                    //var index1 = ((prevLayerNodeData.width * ay) + ax) * prevLayerNodeData.depth + filterd;
                    var index2 = ((nodeData.width * filtery) + filterx) * nodeData.filterDepth + filterd;
                    //console.log('index1: ' + index1 + ' index2: ' + index2);
                    filters[index2] += prevLayerNodeData.forward.output[index1] * gradient * 0.01; // How to do this when this layer is smaller than previous?
                    backPropOutputs[index1] += filters[index2] * gradient; //

                    if (isNaN(filters[index2])) {
                      console.log();
                    }

                    backPropOutputsCheck[index1] = 1;
                    filterCheck[ad][index2] = 1;
                  }
                }

              }
            }

            nodeData.bias[ad] += gradient * 0.01;
            //console.log('nodeData.bias[ad]: ' + nodeData.bias[ad] + ' gradient: ' + gradient);
          }
        }
      }

      /*
       for (var i = 0;i < filterCheck.length;i ++) {
       for (var j = 0;j < filterCheck[i].length;j ++) {
       if (typeof filterCheck[i][j] === 'undefined') {
       console.log('ERROR at filterCheck check index: ' + i + ',' + j);
       }
       }
       }*/
      /*
       for (var i = 0;i < nodeData.forward.count;i ++) {
       if (typeof outputCheck[i] === 'undefined') {
       console.log('ERROR at output check index: ' + i);
       }
       }

       for (var i = 0;i < prevLayerNodeData.forward.count;i ++) {
       if (typeof backPropOutputsCheck[i] === 'undefined') {
       //console.log('ERROR at input check index: ' + i);
       }
       }

       var missing = 0
       for (var i = 0;i < prevLayerNodeData.back.count;i ++) {
       if (typeof backPropOutputsCheck[i] === 'undefined') {
       //console.log('ERROR at input check index: ' + i);
       missing ++;
       }
       }
       console.log('missing backward: ' + missing);
       */
      /*
       for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.count;nodeIndex ++) {
       dataForPrevLayer[nodeIndex] /= dataCountForPrevLayer[nodeIndex];
       }
       */
      nodeData.back.weights = backPropWeights;
      nodeData.back.output = backPropOutputs;
    },
    link: function(nodeData, prevLayerNodeData, options) {
      // TODO: What the hell do I do here?

      /*
       // TODO: Add asserts for parameters

       for (var nodeLinkIndex = 0;nodeLinkIndex < nodeData.count;nodeLinkIndex ++) {
       for (var index = 0;index < prevLayerNodeData.count;index ++) {
       nodeData.links[nodeLinkIndex].push((nodeLinkIndex + index) % prevLayerNodeData.count);
       nodeData.weights[nodeLinkIndex].push(1);
       }
       }
       */
    }
  });
};