const inputNode = require('./input.js');
const nodeTanh = require('./tanh.js');
const nodeConv = require('./conv.js');
const nodeRelu = require('./relu.js');
const nodeSigmoid = require('./sigmoid.js');
const nodePool = require('./pool.js');
const nodeSoftmax = require('./softmax.js');
const nodeOutput = require('./output.js');
const nodeFullyConnected = require('./fullyconnected.js');

module.exports = function() {
  return {
    type: '',
    node: {},
    nodeData: {},
    initialize: function(options, previousLayer) {
      this.node = {};
      this.nodeData = [];
      switch(options.type) {
        case 'input':
          this.node = new inputNode();
          break;
        case 'tanh':
          this.node = new nodeTanh();
          break;
        case 'conv':
          this.node = new nodeConv();
          break;
        case 'relu':
          this.node = new nodeRelu();
          break;
        case 'pool':
          this.node = new nodePool();
          break;
        case 'softmax':
          this.node = new nodeSoftmax();
          break;
        case 'output':
          this.node = new nodeOutput();
          break;
        case 'sigmoid':
          this.node = new nodeSigmoid();
          break;
        case 'fullyConnected':
          this.node = new nodeFullyConnected();
          break;
        default:
          throw('Invalid node type');
          break;
      }

      this.type = options.type;
      this.nodeData = this.node.createLayer(options, previousLayer);
    },
    forward: function(prevLayer) {
      if (typeof prevLayer !== 'undefined') {
        this.node.forward(this.nodeData, prevLayer.nodeData);
      } else {
        this.node.forward(this.nodeData);
      }
    },
    backward: function(prevLayer, nextLayer, learnRate, expectedOutputs) {
      var prevLayerNodeData;
      if (typeof prevLayer !== 'undefined') {
        prevLayerNodeData = prevLayer.nodeData;
      }
      var nextLayerNodeData;
      if (typeof nextLayer !== 'undefined') {
        nextLayerNodeData = nextLayer.nodeData;
      }
      this.node.backward(this.nodeData, prevLayerNodeData, nextLayerNodeData, learnRate, expectedOutputs);
    },
    setNodeOutput: function(nodeIndex, value) {
      this.node.setOutput(this.nodeData, nodeIndex, value);
    },
    getNodeData: function() {
      return this.nodeData;
    },
    getNodeOutput: function(nodeIndex) {
      return this.nodeData.forward.output[nodeIndex];
    },
    getForwardCount: function() {
      return this.nodeData.forward.count;
    },
    getForwardWidth: function() {
      return this.node.getForwardWidth(this.nodeData);
    },
    getForwardHeight: function() {
      return this.node.getForwardHeight(this.nodeData);
    },
    getForwardDepth: function() {
      return this.node.getForwardDepth(this.nodeData);
    },
    displayListToConsole: function(listType, listLabel, listData, maxOut) {
      var displayList = function(list, label) {
        var out = label;
        for (var index = 0;index < list.length;index ++) {
          out += list[index];
          if (index < list.length) {
            out += ',';
          }

          if (out.length >= maxOut) {
            out.length = maxOut;
            break;
          }
        }

        console.log(out);
      };

      console.log(listLabel);
      switch(listType) {
        case 'listOfList':
          listData.forEach((l) => {
            displayList(l, '');
          });
          break;
        case 'list':
          displayList(listData, '');
          break;
      }
    },
    displayToConsole: function() {
      console.log('layer type: ' + this.type);

      var maxOutCount = 260;

      switch(this.type) {
        case 'input':
          this.displayListToConsole('list', 'output:', this.nodeData.forward.output, maxOutCount);
          break;
        case 'conv':
          this.displayListToConsole('listOfList', 'filters:', this.nodeData.filters, maxOutCount);
          this.displayListToConsole('list', 'output:', this.nodeData.forward.output, maxOutCount);
          this.displayListToConsole('list', 'gradient:', this.nodeData.back.output, maxOutCount);
          break;
        case 'relu':
          this.displayListToConsole('list', 'output:', this.nodeData.forward.output, maxOutCount);
          this.displayListToConsole('list', 'gradient:', this.nodeData.back.output, maxOutCount);
          break;
        case 'sigmoid':
          this.displayListToConsole('listOfList', 'weights:', this.nodeData.weights, maxOutCount);
          this.displayListToConsole('list', 'error:', this.nodeData.error, maxOutCount);
          this.displayListToConsole('list', 'gradient:', this.nodeData.back.output, maxOutCount);
          this.displayListToConsole('list', 'output:', this.nodeData.forward.output, maxOutCount);
          break;
        case 'pool':
          this.displayListToConsole('list', 'backdata:', this.nodeData.backData, maxOutCount);
          this.displayListToConsole('list', 'gradient:', this.nodeData.back.output, maxOutCount);
          this.displayListToConsole('list', 'output:', this.nodeData.forward.output, maxOutCount);
          break;
        case 'softmax':
          this.displayListToConsole('list', 'gradient:', this.nodeData.back.output, maxOutCount);
          this.displayListToConsole('list', 'output:', this.nodeData.forward.output, maxOutCount);
          break;
        case 'fullyConnected':
          this.displayListToConsole('listOfList', 'weights:', this.nodeData.weights, maxOutCount);
          this.displayListToConsole('list', 'bias:', this.nodeData.bias, maxOutCount);
          this.displayListToConsole('list', 'gradient:', this.nodeData.back.output, maxOutCount);
          this.displayListToConsole('list', 'output:', this.nodeData.forward.output, maxOutCount);
          break;
        case 'output':
          this.displayListToConsole('list', 'gradient:', this.nodeData.back.output, maxOutCount);
          this.displayListToConsole('list', 'output:', this.nodeData.forward.output, maxOutCount);
          break;
      }

      console.log('');
    }
  }
};