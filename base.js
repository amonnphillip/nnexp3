module.exports = function() {
  return {
    createLayer: function(options, previousLayer) { // TODO: Remove this!
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

      return layer;
    },
    getWeightCount: function(nodeData, nodeIndex) {
      return nodeData.weights[nodeIndex].length;
    },
    getWeight: function(nodeData, nodeIndex, weightIndex) {
      return nodeData.weights[nodeIndex][weightIndex];
    },
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