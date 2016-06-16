
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
    train: function(iterations, trainingDataReader) {

      var imageCount = trainingDataReader.imageCount();

      var trainCount = 0;

      while(iterations > 0) {
        var imageIndex = 0;

        while (imageIndex < imageCount) {

          var imageBuffer = trainingDataReader.getImage(imageIndex);
          var imageLabel = trainingDataReader.getLabel(imageIndex);

          //trainingDataReader.displayImageToConsole(imageIndex);
/*
          if ((imageIndex & 1) === 0) {
            imageBuffer = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            imageLabel = 0;
          } else {
            imageBuffer = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
            imageLabel = 1;
          }
*/
          // Do forward pass
          var inputLayer = this.layers[0];
          for (var nodeIndex = 0; nodeIndex < inputLayer.getNodeCount(); nodeIndex++) {
            inputLayer.setNodeOutput(nodeIndex, imageBuffer[nodeIndex] / 255);
            //inputLayer.setNodeOutput(nodeIndex, imageBuffer[nodeIndex]);
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

          this.displayToConsole();
          console.log('imageLabel: ' + imageLabel);

          if (trainCount % 1000 === 0) {
            this.displayToConsole();
            console.log('imageLabel: ' + imageLabel);
          }

          //process.stdout.write("\u001b[2J\u001b[0;0H");
          //console.log('trainCount: ' + trainCount + ' imageIndex: ' + imageIndex);

          imageIndex++;

          if (imageIndex > 1) {
            imageIndex = 0;
          }
          
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
      this.layers[0].forward();
      for (var index = 1;index < this.layers.length;index ++) {
        this.layers[index].forward(this.layers[index - 1]);
      }
    },
    displayToConsole: function() {
      console.log('');
      console.log('-----------------------------------------------');
      for (var index = 0;index < this.layers.length;index ++) {
        this.layers[index].displayToConsole();
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
    prevLayerWidth: 24,
    prevLayerHeight: 24,
    prevLayerDepth: 1,
    width: 5,
    height: 5,
    depth: 8,
    stride: 1, // TODO: Calculate stride?
    pad: 0
  }, {
    type: 'relu',
    width: 20,
    height: 20,
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
theNetwork.train(1, new trainingDataReader('train-images-idx3-ubyte.gz', 'train-labels-idx1-ubyte.gz'));

// Test the network
//theNetwork.test(new trainingDataReader('t10k-images-idx3-ubyte.gz', 't10k-labels-idx1-ubyte.gz'));
