var webpackMerge = require('webpack-merge');
var commonConfig = require('./webpack.common.js');

module.exports = webpackMerge(commonConfig, {
    devtool: 'cheap-module-eval-source-map',

    output: {
        path: __dirname,
        filename: 'bundle.js'
    },

    devServer: {
        colors: true,
        historyApiFallback: true,
        inline: true,
        progress: true
    },

});