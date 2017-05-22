var webpack = require('webpack');

module.exports = {
    // ENTRY FILE
    // Initial file for webpack to start traversing dependecies
    // Update this refernce to your app file
    entry: {
        app: './app.js'
    },


    module: {
        loaders: [{
            // JS LOADER
            // Reference: https://github.com/babel/babel-loader
            // Transpile .js files using babel-loader
            // Compiles ES6 and ES7 into ES5 code
            test: /\.js$/,
            loader: 'babel-loader?presets[]=es2015',
            exclude: /node_modules/

        }, {
            // HTML LOADER
            // Reference: https://github.com/webpack/raw-loader
            // Allow loading html through js
            test: /\.html$/,
            loader: 'raw-loader'
        }]
    }
};