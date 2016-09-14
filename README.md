# nnexp3
neural network experiment 3, convolution neural networks and hand drawn number recognition

This is my attempt at understanding the convolution (and pool and relu) layer of a neural network. This experiment uses the MNIST data set of hand drawn numeric characters to train a neural network to recognize numeric characters. I use the traditional conv->pool->relu layer composition, simply because I am learning and this looked like a sensible route to take :). 

I lean heavily on other examples and papers namely the work done by [Andrej Kaparthy](https://github.com/karpathy), [Grzegorz Gwardys](https://grzegorzgwardys.wordpress.com/2016/04/22/8/), and others.

This experiment has been purposely written from scratch, because I want to learn how neural networks function at the lowest level. How to write layer management and how to debug a neural network. 

Run the experiment. The network will train, then test against images of hand written numberical digits from the MNIST test set. After testing you should see results of around 96% correct image recognition.

To run this experiment you need to have [NPM](https://www.npmjs.com/) (v3.8.7 +) and [NodeJS](https://nodejs.org) installed (v4.2.4 +). 
Once you have installed NPM and NodeJS open a command prompt where the package.json file in this project is located and type: 

`npm install`

After all the dependent packages are installed you can now run the demo.

`node index.js`

The demo will summarize its results at the end of training and testing.
