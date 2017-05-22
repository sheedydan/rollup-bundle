var webpack = require('webpack');
var webpackMerge = require('webpack-merge');
var commonConfig = require('./webpack.common.js');
var helpers = require('./helpers');

module.exports = webpackMerge(commonConfig, {
    devtool: 'source-map',

    output: {
        path: helpers.root('dist'),
        filename: 'bundle.[hash].js'
    },

    // plugins: [
    //     // Reference: http://webpack.github.io/docs/list-of-plugins.html#noerrorsplugin
    //     // Only emit files when there are no errors
    //     new webpack.NoErrorsPlugin(),

    //     // Reference: http://webpack.github.io/docs/list-of-plugins.html#dedupeplugin
    //     // Dedupe modules in the output
    //     new webpack.optimize.DedupePlugin(),

    //     // Reference: http://webpack.github.io/docs/list-of-plugins.html#uglifyjsplugin
    //     // Minify all javascript, switch loaders to minimizing mode
    //     new webpack.optimize.UglifyJsPlugin(),
    // ]
});