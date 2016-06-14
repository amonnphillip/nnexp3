var nMixin = require('./mixin.js');

module.exports = function() {
  return nMixin(new nodeBase(), {
    forward: function(nodeData, prevLayerNodeData) {
      for (var nodeIndex = 0;nodeIndex < nodeData.count;nodeIndex ++) {

        var val = 0;
        var links = nodeData.links[nodeIndex];
        var weights = nodeData.weights[nodeIndex];
        for (var index = 0; index < links.length; index++) {
          val += prevLayerNodeData.output[links[index]] * weights[index];
        }

        val /= links.length;

        nodeData.output[nodeIndex] = Math.tanh(val);
      }
    },
    backward: function(nodeData, prevLayerNodeData, nextLayerNodeData, learnRate) {
      var dataForPrevLayer = new Array(prevLayerNodeData.count);
      var dataCountForPrevLayer = new Array(prevLayerNodeData.count);
      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.count;nodeIndex ++) {
        dataForPrevLayer[nodeIndex] = 0;
        dataCountForPrevLayer[nodeIndex] = 0;
      }

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

      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.count;nodeIndex ++) {
        dataForPrevLayer[nodeIndex] /= dataCountForPrevLayer[nodeIndex];
      }

      nodeData.dataForPrevLayer = dataForPrevLayer;
    },
    backwardWithExpectedOutput: function(nodeData, prevLayerNodeData, learnRate, expectedOutputs) {
      var dataForPrevLayer = new Array(prevLayerNodeData.count);
      var dataCountForPrevLayer = new Array(prevLayerNodeData.count);
      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.count;nodeIndex ++) {
        dataForPrevLayer[nodeIndex] = 0;
        dataCountForPrevLayer[nodeIndex] = 0;
      }

      for (var nodeIndex = 0;nodeIndex < nodeData.count;nodeIndex ++) {
        nodeData.error[nodeIndex] = (1 - nodeData.output[nodeIndex] * nodeData.output[nodeIndex]) * (expectedOutputs[nodeIndex] - nodeData.output[nodeIndex]);

        var links = nodeData.links[nodeIndex];
        var weights = nodeData.weights[nodeIndex];
        for (var weightIndex = 0; weightIndex < links.length; weightIndex++) {
          weights[weightIndex] += nodeData.error[nodeIndex] * prevLayerNodeData.output[links[weightIndex]] * learnRate;

          dataForPrevLayer[links[weightIndex]] += weights[weightIndex] * nodeData.error[nodeIndex];
          dataCountForPrevLayer[links[weightIndex]]++;
        }
      }

      for (var nodeIndex = 0;nodeIndex < prevLayerNodeData.count;nodeIndex ++) {
        dataForPrevLayer[nodeIndex] /= dataCountForPrevLayer[nodeIndex];
      }

      nodeData.dataForPrevLayer = dataForPrevLayer;
    }
  });  
};