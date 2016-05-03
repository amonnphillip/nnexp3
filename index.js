
const fs = require('fs');
const zlib = require('zlib');

var mixin = function(base, obj) {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      base[prop] = obj[prop];
    }
  }

  return base;
};

var nodeBase = function() {
  return {
    createLayer: function(size) {
      var layer = {
        count: size,
        links: new Array(size),
        weights: new Array(size),
        output: new Array(size),
        error: new Array(size)
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
    getOutput: function(nodeData, nodeIndex) {
      return nodeData.output[nodeIndex];
    },
    link: function(nodeData, prevNodeData, nodeIndex, prevNodeIndex) {
      nodeData.links[nodeIndex].push(prevNodeIndex);
      nodeData.weights[nodeIndex].push(1);
    }
  }
};

var nodeTanh = function() {
  return mixin(new nodeBase(), {
    forward: function() {
      var val = 0;
      for (var index = 0;index < this.inputs.length;index ++) {
        val += this.inputs[index].output * this.inputWeights[index];
      }

      this.output = Math.tanh(val);
    },
    backward: function(learnRate) {
      var error = 0;
      for (var outputLinkIndex = 0;outputLinkIndex < this.outputLinks.length;outputLinkIndex ++) {
        var n = this.outputLinks[outputLinkIndex].getMatchingWeightForNode(this);
        error += this.outputLinks[outputLinkIndex].error * n;
      }

      this.error = (1 - this.output * this.output) * error;

      for (var weightIndex = 0;weightIndex < this.inputs.length;weightIndex ++) {
        var tweakAmount = this.error * this.inputs[weightIndex].output;
        tweakAmount *= learnRate;
        this.inputWeights[weightIndex] += tweakAmount;
      }
    },
    backwardWithExpectedOutput: function(learnRate, expectedOutput) {
      this.error = (1 - this.output * this.output) * (expectedOutput - this.output);
      for (var weightIndex = 0;weightIndex < this.inputs.length;weightIndex ++) {
        var tweakAmount = this.error * this.inputs[weightIndex].output;
        tweakAmount *= learnRate;
        this.inputWeights[weightIndex] += tweakAmount;
      }
    }
  });
};




var nodeSigmoid = function() {
  return mixin(new nodeBase(), {
    forward: function(nodeData, prevLayerNodeData) {
      for (var nodeIndex = 0;nodeIndex < nodeData.count;nodeIndex ++) {

        var val = 0;
        var links = nodeData.links[nodeIndex];
        var weights = nodeData.weights[nodeIndex];
        for (var index = 0;index < links.length;index ++) {
          val += prevLayerNodeData.output[links[index]] * weights[index];
        }

        val /= links.length;

        nodeData.output[nodeIndex] = 1.0 / (1.0 + Math.exp(-val));
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

        nodeData.error[nodeIndex] = nodeData.output[nodeIndex] * (1.0 - nodeData.output[nodeIndex]) * (expectedOutputs[nodeIndex] - nodeData.output[nodeIndex]);

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
    }
  });
};

var inputNode = function() {
  return mixin(new nodeBase(), {
    setOutput: function(nodeData, index, value) {
      nodeData.output[index] = value;
    },
    forward: function() {
      // Do nothing
    },
    backward: function() {
      // Do nothing
    }
  });
};

var layer = function() {
  return {
    type: '',
    node: {},
    nodeData: {},
    initialize: function(layerSize, layerType) {
      this.node = {};
      this.nodeData = [];
      switch(layerType) {
        case 'input':
          this.node = new inputNode();
          break;
        case 'tanh':
          this.node = new nodeTanh();
          break;
        default:
          this.node = new nodeSigmoid();
          break;
      }

      this.type = layerType;
      this.nodeData = this.node.createLayer(layerSize);
    },
    linkLayer: function(prevLayer) { // TODO: Need an indication of how to link the layer
      for (var nodeLinkIndex = 0;nodeLinkIndex < this.nodeData.count;nodeLinkIndex ++) {
        for (var index = 0;index < prevLayer.nodeData.count;index ++) {
          // TODO: Convolution links

          this.node.link(this.nodeData, prevLayer.nodeData, nodeLinkIndex, (nodeLinkIndex + index) % prevLayer.nodeData.count); // TODO: Need to redo the order somehow
        }
      }
    },
    forward: function(prevLayer) {
      this.node.forward(this.nodeData, prevLayer.nodeData);
    },
    backward: function(prevLayer, nextLayer, learnRate) {
      this.node.backward(this.nodeData, prevLayer.nodeData, nextLayer.nodeData, learnRate);
    },
    backwardOutputLayer: function(prevLayer, learnRate, expectedOutputs) {
      this.node.backwardWithExpectedOutput(this.nodeData, prevLayer.nodeData, learnRate, expectedOutputs);
    },
    setNodeOutput: function(nodeIndex, value) {
      this.node.setOutput(this.nodeData, nodeIndex, value);
    },
    getNodeOutput: function(nodeIndex) {
      return this.node.getOutput(this.nodeData[nodeIndex]);
    },
    getNodeCount: function() {
      return this.nodeData.count;
    },
    displayToConsole: function() {
      console.log('layer type: ' + this.type);

      var out = '';

      if (this.type !== 'input') {
        out = 'weights: ';
        for (var index = 0;index < this.nodeData.weights.length;index ++) {
          for (var weightIndex = 0;weightIndex < this.node.getWeightCount(this.nodeData, index);weightIndex ++) {
            out += this.node.getWeight(this.nodeData, index, weightIndex).toString() + ' ';
          }
          out += ','
        }
        console.log(out);

        out = 'error:   ';
        for (var index = 0;index < this.nodeData.count;index ++) {
          if (typeof this.nodeData.error[index] !== 'undefined') {
            out += this.nodeData.error[index].toString() + ',';
          } else {
            out += ' ,';
          }
        }
        console.log(out);
      }

      out = 'output:  ';
      for (var index = 0;index < this.nodeData.count;index ++) {
        if (typeof this.nodeData.output[index] !== 'undefined') {
          out += this.nodeData.output[index].toString() + ',';
        } else {
          out += ' ,';
        }
      }
      console.log(out);
    }
  }
};

var network = function() {
  return {
    layers: [],
    learnRate: 0.01,
    initialize: function(layers) {
      // Create the layers
      this.layers = [];
      for (var index = 0;index < layers.length;index ++) {
        var newLayer = new layer();
        newLayer.initialize(layers[index].count, layers[index].type);
        this.layers.push(newLayer);
      }

      // link the layers
      for (var index = 1;index < layers.length;index ++) {
        this.layers[index].linkLayer(this.layers[index - 1]);
      }
    },
    train: function(iterations, trainingDataReader) {

      var imageCount = trainingDataReader.imageCount();

      var trainCount = 0;

      while(iterations > 0) {
        var imageIndex = 0;

        while (imageIndex < imageCount) {

          var imageBuffer = trainingDataReader.getImage(imageIndex);
          var imageLabel = trainingDataReader.getLabel(imageIndex);

          //trainingDataReader.displayImageToConsole(imageIndex);

          // Do forward pass
          var inputLayer = this.layers[0];
          for (var nodeIndex = 0; nodeIndex < inputLayer.getNodeCount(); nodeIndex++) {
            inputLayer.setNodeOutput(nodeIndex, imageBuffer[nodeIndex] / 255);
          }

          this.forward();

          // Do backward pass
          var expectedOutput = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          expectedOutput[imageLabel] = 0.999;

          for (var layerIndex = this.layers.length - 1; layerIndex > 0; layerIndex--) {
            var layer = this.layers[layerIndex];
            if (layerIndex === this.layers.length - 1) {
              layer.backwardOutputLayer(this.layers[layerIndex - 1], this.learnRate, expectedOutput);
            } else {
              layer.backward(this.layers[layerIndex - 1], this.layers[layerIndex + 1], this.learnRate);
            }
          }


          if (trainCount % 1000 === 0) {
            this.displayToConsole();
            console.log('imageLabel: ' + imageLabel);
          }

          //process.stdout.write("\u001b[2J\u001b[0;0H");
          //console.log('trainCount: ' + trainCount + ' imageIndex: ' + imageIndex);

          //imageIndex++;
          trainCount ++;
        }

        iterations --;
      }
    },
    test: function(trainingDataReader) {
      var imageCount = trainingDataReader.imageCount();
      var imageIndex = 0;

      imageCount = 1000; // TODO: Remove!

      while(imageIndex < imageCount) {

        var imageBuffer = trainingDataReader.getImage(imageIndex);
        var imageLabel = trainingDataReader.getLabel(imageIndex);

        // Do forward pass
        var inputLayer = this.layers[0];
        for (var nodeIndex = 0;nodeIndex < inputLayer.getNodeCount();nodeIndex ++) {
          inputLayer.setNodeOutput(nodeIndex, imageBuffer[nodeIndex] / 255);
        }

        this.forward();

        // Do backward pass
        var expectedOutput = [0,0,0,0,0,0,0,0,0,0];
        expectedOutput[imageLabel] = 0.999;

        console.log('Test ' + imageIndex);
        console.log('Label ' + imageLabel);
        var displayOutOut = 'Output:   ';
        var displayOutExp = 'Expected: ';
        var displayOutErr = 'Errors:   ';

        var outputLayer = this.layers[this.layers.length - 1];
        for (var nodeIndex = 0;nodeIndex < outputLayer.nodes.length;nodeIndex ++) {
          var output = outputLayer.getNodeOutput(nodeIndex);

          displayOutOut += output + ' ';
          displayOutExp += expectedOutput[nodeIndex] + ' ';
          displayOutErr += output - expectedOutput[nodeIndex] + ' ';
        }
        console.log(displayOutOut);
        console.log(displayOutExp);
        console.log(displayOutErr);
        console.log('');

        imageIndex ++;
      }
    },
    forward: function() {
      for (var index = 1;index < this.layers.length;index ++) {
        this.layers[index].forward(this.layers[index - 1]);
      }
    },
    displayToConsole: function() {
      for (var index = 0;index < this.layers.length;index ++) {
        this.layers[index].displayToConsole();
      }
      console.log('');
    }
  }
};

// Training data reader
const trainingDataReader = function(imageFileName, labelFileName) {
  var ret = {
    imageFileOffsets: {
      MAGIC_NUMBER: 0,
      NUMBER_OF_ITEMS: 4,
      NUMBER_OF_ROWS: 8,
      NUMBER_OF_COLUMNS: 12,
      IMAGE_DATA: 16
    },
    labelFileOffsets: {
      MAGIC_NUMBER: 0,
      NUMBER_OF_ITEMS: 4,
      LABEL_DATA: 8
    },
    imageBuffer: '',
    labelBuffer: '',
    readData: function(imageFileName, labelFileName) {
      const imageZip = fs.readFileSync(imageFileName);
      this.imageBuffer = zlib.unzipSync(imageZip);

      const labelZip = fs.readFileSync(labelFileName);
      this.labelBuffer = zlib.unzipSync(labelZip);
    },
    getInt: function(buffer, index) {
      return (buffer[index] << 24) + (buffer[index + 1] << 16) + (buffer[index + 2] << 8) + buffer[index + 3];
    },
    imageCount: function() {
      return this.getInt(this.imageBuffer, this.imageFileOffsets.NUMBER_OF_ITEMS);
    },
    imageSize: function() {
      return {
        width: this.getInt(this.imageBuffer, this.imageFileOffsets.NUMBER_OF_ROWS),
        height: this.getInt(this.imageBuffer, this.imageFileOffsets.NUMBER_OF_COLUMNS)
      }
    },
    labelCount: function() {
      return this.getInt(this.labelBuffer, this.labelFileOffsets.NUMBER_OF_ITEMS);
    },
    getLabel: function(index) {
      return this.labelBuffer[this.labelFileOffsets.LABEL_DATA + index];
    },
    getImage: function(index) {
      var imageSize = this.imageSize();
      var buffer = new Buffer.allocUnsafe(imageSize.width * imageSize.height);
      this.imageBuffer.copy(buffer, 0, this.imageFileOffsets.IMAGE_DATA + (index * imageSize.width * imageSize.height), this.imageFileOffsets.IMAGE_DATA + ((index + 1) * imageSize.width * imageSize.height));
      return buffer;
    },
    displayImageToConsole: function(index) {
      console.log('Label: ' + this.getLabel(index));

      var imageSize = this.imageSize();
      var buf = this.getImage(index);
      for (var y = 0;y < imageSize.height;y ++) {
        var out = '';
        for (var x = 0;x < imageSize.width;x ++) {
          var v = buf[(imageSize.width * y) + x];
          if (v > 100) {
            out += v;
          } else if (v > 10) {
            out += ' ' + v;
          } else {
            out += '  ' + v;
          }
          out += ' ';
        }


        console.log(out);
      }
    }
  };

  ret.readData(imageFileName, labelFileName);
  return ret;
};

// Initialize our network with the layers we want
const theNetwork = new network();
theNetwork.initialize([
  {
    type: 'input',
    count: 28 * 28// We assume the training data contains images of 28x28 pixels
  }, {
    type: 'sigmoid',
    count: 30
  }, {
    type: 'sigmoid',
    count: 30
  }, {
    type: 'sigmoid',
    count: 30
  }, {
    type: 'sigmoid',
    count: 30
  }, {
    type: 'sigmoid',
    count: 30
  }, {
    type: 'sigmoid',
    count: 10 // We assume the output node count is the same as the label type count (0-9)
  }
]);

// Train it
theNetwork.train(1, new trainingDataReader('train-images-idx3-ubyte.gz', 'train-labels-idx1-ubyte.gz'));

// Test the network
//theNetwork.test(new trainingDataReader('t10k-images-idx3-ubyte.gz', 't10k-labels-idx1-ubyte.gz'));
