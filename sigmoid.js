var nMixin = require('./mixin.js');
var nodeBase = require('./base.js');

module.exports = function() {
  return nMixin(new nodeBase(), {
    createLayer: function(options, previousLayer) {
      var size = options.width * options.height * options.depth;

      var layer = {
        count: size,
        width: options.width,
        height: options.height,
        depth: options.depth,
        links: new Array(size),
        weights: new Array(size),
        output: new Array(size),
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

      for (var index = 0;index < size;index ++) {
        layer.links[index] = [];
        layer.weights[index] = [];
      }

      this.link(layer, previousLayer.nodeData, options);

      return layer;
    },
    forward: function(nodeData, prevLayerNodeData) {
      var output = new Array(nodeData.forward.count);

      /*
       var val = 0;
       for (var index = 0;index < this.inputs.length;index ++) {
       val += this.inputs[index].output * this.inputWeights[index];
       }

       this.output = 1.0 / (1.0 + Math.exp(-val));
       */

      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {

        var val = 0;
        var links = nodeData.links[nodeIndex];
        var weights = nodeData.weights[nodeIndex];
        for (var index = 0;index < links.length;index ++) {
          val += prevLayerNodeData.forward.output[links[index]] * weights[index];
        }

        //val /= links.length;

        var out = 1.0 / (1.0 + Math.exp(-val));
        if (out < -1) {
          out = -1;
        }
        if (out > 1) {
          out = 1;
        }
        output[nodeIndex] = out;
        //output[nodeIndex] = 1.0 / (1.0 + Math.exp(-val));



        if (isNaN(output[nodeIndex])) {
          console.log();
        }
      }

      nodeData.forward.output = output;
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData, learnRate) {
      var backPropWeights = new Array(prevLayerNodeData.forward.count);
      var backPropWeighCounts = new Array(prevLayerNodeData.forward.count);
      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        backPropWeights[nodeIndex] = 0;
        backPropWeighCounts[nodeIndex] = 0;
      }
      var backPropOutputs = new Array(nodeData.forward.count);

      /*
       var error = 0;
       for (var outputLinkIndex = 0;outputLinkIndex < this.outputLinks.length;outputLinkIndex ++) {
       error += this.outputLinks[outputLinkIndex].error * this.outputLinks[outputLinkIndex].getMatchingWeightForNode(this);
       }

       error /= this.outputLinks.length;

       this.error = this.output * (1 - this.output) * error;
       */

      for (var nodeIndex = 0;nodeIndex < nodeData.count;nodeIndex ++) {
        /*
         var tt = 0;
         var cc = 0
         for (var x = 0;x < nextLayerNodeData.count;x ++) {
         var links = nextLayerNodeData.links[x];
         var weights = nextLayerNodeData.weights[x];
         for(var l = 0;l < links.length;l ++) {
         if (links[l] === nodeIndex) {
         tt += weights[l] * nextLayerNodeData.error[x];
         if (isNaN(tt)) {
         console.log('');
         }
         cc ++;
         }
         }
         }
         tt /= cc;
         */
        nodeData.error[nodeIndex] = nodeData.forward.output[nodeIndex] * (1 - nodeData.forward.output[nodeIndex]) * nextLayerNodeData.back.weights[nodeIndex];

        var links = nodeData.links[nodeIndex];
        var weights = nodeData.weights[nodeIndex];
        for (var weightIndex = 0; weightIndex < links.length; weightIndex++) {
          weights[weightIndex] += nodeData.error[nodeIndex] * prevLayerNodeData.forward.output[links[weightIndex]] /** learnRate*/;

          if (isNaN(weights[weightIndex])) {
            console.log();
          }

          backPropWeights[links[weightIndex]] += weights[weightIndex] * nodeData.error[nodeIndex];
          backPropWeighCounts[links[weightIndex]] ++;
        }

        backPropOutputs[nodeIndex] = nodeData.forward.output[nodeIndex];
      }

      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        //backPropWeights[nodeIndex] /= backPropWeighCounts[nodeIndex];
      }

      nodeData.back.weights = backPropWeights;
      nodeData.back.output = backPropOutputs;
    },
    backwardWithExpectedOutput: function(nodeData, prevLayerNodeData, learnRate, expectedOutputs) { // TODO: REMOVE THIS FUNCTION
      var backPropWeights = new Array(prevLayerNodeData.forward.count);
      var backPropWeighCounts = new Array(prevLayerNodeData.forward.count);
      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        backPropWeights[nodeIndex] = 0;
        backPropWeighCounts[nodeIndex] = 0;
      }
      var backPropOutputs = new Array(nodeData.count);

      //this.error = this.output * ((1 - this.output) * (expectedOutput - this.output));
      //for (var weightIndex = 0;weightIndex < this.inputs.length;weightIndex ++) {
      //  this.inputWeights[weightIndex] += this.error * this.inputs[weightIndex].output * learnRate;
      // }

      for (var nodeIndex = 0;nodeIndex < nodeData.forward.count;nodeIndex ++) {

        nodeData.error[nodeIndex] = nodeData.forward.output[nodeIndex] * (1.0 - nodeData.forward.output[nodeIndex]) * (expectedOutputs[nodeIndex] - nodeData.forward.output[nodeIndex]);

        var links = nodeData.links[nodeIndex];
        var weights = nodeData.weights[nodeIndex];
        for (var weightIndex = 0; weightIndex < links.length; weightIndex++) {
          weights[weightIndex] += nodeData.error[nodeIndex] * prevLayerNodeData.forward.output[links[weightIndex]] * learnRate;

          if (isNaN(weights[weightIndex])) {
            console.log();
          }

          //console.log('weights[weightIndex] ' + weights[weightIndex]);
          //console.log('nodeData.error[nodeIndex] ' + nodeData.error[nodeIndex]);
          //console.log('prevLayerNodeData.forward.output[links[weightIndex]] ' + prevLayerNodeData.forward.output[links[weightIndex]]);

          //console.log('weights[weightIndex] ' + (nodeData.error[nodeIndex] * prevLayerNodeData.forward.output[links[weightIndex]] * learnRate));

          backPropWeights[links[weightIndex]] += weights[weightIndex] * nodeData.error[nodeIndex];
          backPropWeighCounts[links[weightIndex]] ++;
        }

        //for (var outputLinkIndex = 0;outputLinkIndex < this.outputLinks.length;outputLinkIndex ++) {
        // / error += this.outputLinks[outputLinkIndex].error * this.outputLinks[outputLinkIndex].getMatchingWeightForNode(this);
        //}
        //error /= this.outputLinks.length;



        backPropOutputs[nodeIndex] = nodeData.forward.output[nodeIndex];
      }

      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.forward.count;nodeIndex ++) {
        //backPropWeights[nodeIndex] /= backPropWeighCounts[nodeIndex];
      }

      nodeData.back.weights = backPropWeights;
      nodeData.back.output = backPropOutputs;
    }
  });
};