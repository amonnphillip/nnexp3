
const fs = require('fs');
const zlib = require('zlib');
const layer = require('./layer.js');

var network = function() {
  return {
    layers: [],
    learnRate: 0.1,
    initialize: function(layers) {
      // Create the layers
      this.layers = [];
      var previousLayer = undefined;
      for (var index = 0;index < layers.length;index ++) {
        var newLayer = new layer();
        newLayer.initialize(layers[index], previousLayer);
        this.layers.push(newLayer);

        previousLayer = newLayer;
      }
    },
    train: function(trainingDataReader, options) {
      console.log('Training Started');

      var imageCount = trainingDataReader.imageCount();

      var trainCount = 0;

      var iterations = options.trainingIterations;
      var maxIterations = options.trainingIterations;

      while(iterations > 0) {
        var imageIndex = 0;

        while (imageIndex < imageCount) {

          var imageBuffer = trainingDataReader.getImage(imageIndex);
          var imageLabel = trainingDataReader.getLabel(imageIndex);

          // Do forward pass
          var inputLayer = this.layers[0];
          for (var nodeIndex = 0; nodeIndex < inputLayer.getForwardCount(); nodeIndex++) {
            inputLayer.setNodeOutput(nodeIndex, imageBuffer[nodeIndex] / 255);
          }

          this.forward();

          // Do backward pass
          var expectedOutput = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          expectedOutput[imageLabel] = 1;

          for (var layerIndex = this.layers.length - 1; layerIndex > 0; layerIndex--) {
            var layer = this.layers[layerIndex];
            if (layerIndex === this.layers.length - 1) {
              layer.backward(this.layers[layerIndex - 1], undefined, this.learnRate, expectedOutput);
            } else {
              layer.backward(this.layers[layerIndex - 1], this.layers[layerIndex + 1], this.learnRate);
            }
          }

          //this.displayToConsole('trainCount: ' + trainCount + ' of ' + (imageCount * maxIterations), 'imageLabel: ' + imageLabel);

          //this.displayToConsole('trainCount: ' + trainCount + ' of ' + (imageCount * maxIterations), 'imageLabel: ' + imageLabel);
          if (options.displayToConsole) {
            if (trainCount % 100 === 0) {
              this.displayToConsole('trainCount: ' + trainCount + ' of ' + (imageCount * maxIterations), 'imageLabel: ' + imageLabel);
            }
          }

          imageIndex++;
          trainCount ++;
        }

        iterations --;
      }

      console.log('');
      console.log('Training complete');
      console.log('');
    },
    test: function(trainingDataReader) {
      var imageCount = trainingDataReader.imageCount();
      var imageIndex = 0;

      var maxPredictions = 300;
      var correctlyPredicted = 0;

      while(imageIndex < maxPredictions) {

        var randomImagePicked = Math.round(Math.random() * imageCount);

        var imageBuffer = trainingDataReader.getImage(randomImagePicked);
        var imageLabel = trainingDataReader.getLabel(randomImagePicked);

        // Do forward pass
        var inputLayer = this.layers[0];
        for (var nodeIndex = 0;nodeIndex < inputLayer.getForwardCount();nodeIndex ++) {
          inputLayer.setNodeOutput(nodeIndex, imageBuffer[nodeIndex] / 255);
        }

        this.forward();

        // Do backward pass
        var expectedOutput = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        expectedOutput[imageLabel] = 1;

        trainingDataReader.displayImageToConsole(randomImagePicked);
        console.log('Label ' + imageLabel);
        var displayOutOut = 'Output:   ';
        var displayOutExp = 'Expected: ';
        var displayOutErr = 'Errors:   ';

        var prediction = {
          max: 0,
          index: 0
        };
        var outputLayer = this.layers[this.layers.length - 1];
        for (var nodeIndex = 0;nodeIndex < outputLayer.getForwardCount();nodeIndex ++) {
          var output = outputLayer.getNodeOutput(nodeIndex);

          if (output > prediction.max) {
            prediction.max = output;
            prediction.index = nodeIndex;
          }

          displayOutOut += output + ' ';
          displayOutExp += expectedOutput[nodeIndex] + ' ';
          displayOutErr += output - expectedOutput[nodeIndex] + ' ';
        }
        console.log(displayOutOut);
        console.log(displayOutExp);
        console.log(displayOutErr);
        console.log('Prediction is: ' + prediction.index);
        console.log('');

        if (prediction.index === imageLabel) {
          correctlyPredicted ++;
        }

        imageIndex ++;
      }

      console.log('Correctly predicted ' + correctlyPredicted + ' out of ' + maxPredictions + ' images (' + ((correctlyPredicted / maxPredictions) * 100) + '%)');
    },
    forward: function() {
      this.layers[0].forward();
      for (var index = 1;index < this.layers.length;index ++) {
        this.layers[index].forward(this.layers[index - 1]);
      }
    },
    displayToConsole: function(preOut, postOut) {
      console.log('');
      console.log('-----------------------------------------------');
      if (typeof preOut !== 'undefined') {
        console.log(preOut);
      }
      for (var index = 0;index < this.layers.length;index ++) {
        this.layers[index].displayToConsole();
      }
      if (typeof postOut !== 'undefined') {
        console.log(postOut);
      }
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
    width: 28, // We assume the training data contains images of 28x28 pixels
    height: 28, // We assume the training data contains images of 28x28 pixels
    depth: 1
  }, {
    type: 'conv',
    width: 5,
    height: 5,
    filterCount: 8,
    stride: 1,
    pad: 2
  }, {
    type: 'relu',
    width: 28,
    height: 28,
    depth: 8,
    stride: 0,
    maxConnections: 1
  }, {
    type: 'pool',
    stride: 2,
    spatailExtent: 2
  }, {
    type: 'conv',
    width: 5,
    height: 5,
    filterCount: 8,
    stride: 1,
    pad: 2
  }, {
    type: 'relu',
    width: 14,
    height: 14,
    depth: 8,
    stride: 0,
    maxConnections: 1
  }, {
    type: 'pool',
    stride: 2,
    spatailExtent: 2
  }, {
    type: 'fullyConnected',
    width: 10,
    height: 1,
    depth: 10
  }, {
    type: 'softmax',
    width: 10,
    height: 1,
    depth: 10
  }, {
    type: 'output',
    width: 10, // We assume the output node count is the same as the label type count (0-9)
    height: 1,
    depth: 1
  }
]);

// Train it
theNetwork.train(new trainingDataReader('train-images-idx3-ubyte.gz', 'train-labels-idx1-ubyte.gz'), {
  displayToConsole: true,
  trainingIterations: 1
});

// Test the network
theNetwork.test(new trainingDataReader('t10k-images-idx3-ubyte.gz', 't10k-labels-idx1-ubyte.gz'));
