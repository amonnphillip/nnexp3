module.exports = function() {
  return {
    getForwardWidth: function(nodeData) {
      return nodeData.forward.width;
    },
    getForwardHeight: function(nodeData) {
      return nodeData.forward.height;
    },
    getForwardDepth: function(nodeData) {
      return nodeData.forward.depth;
    },
    getForwardOutput: function(nodeData, nodeIndex) {
      return nodeData.forward.output[nodeIndex];
    },
    normalizeWeights: function(weights, count) {
      /*var scale = Math.sqrt(1.0/count);
      for (var index = 0;index < weights.length;index ++) {
        weights[index] *= scale;
      }*/

      var max = 0;
      for (var index = 0;index < weights.length;index ++) {
        max += weights[index];
      }

      for (var index = 0;index < weights.length;index ++) {
        weights[index] /= max;
      }

    },
    link: function(nodeData, prevLayerNodeData, options) {
      var connections = prevLayerNodeData.forward.count -1;
      if (typeof options.maxConnections !== 'undefined') {
        connections = options.maxConnections;
      }

      var stride = 0;
      if (typeof options.stride !== 'undefined') {
        stride = options.stride;
      }
      var strideAt = 0;

      for (var nodeLinkIndex = 0;nodeLinkIndex < nodeData.count;nodeLinkIndex ++) {
        for (var index = 0;index < connections;index ++) {
          nodeData.links[nodeLinkIndex].push((nodeLinkIndex + index + strideAt) % prevLayerNodeData.forward.count);
          nodeData.weights[nodeLinkIndex].push(1);
        }

        strideAt + stride;
      }
    }
  }
};