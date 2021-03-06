const webpack = require('webpack');
const path = require('path');

module.exports = function(env) {

	return {
		entry: {
			all: './index.js'
		},

		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'utils.[name].min.js'
		},

		module: {
			rules: [
				{
					test: /\.(ng)html$/,
					use: 'raw-loader'
				},
				{
					test: /\.css$/,
					use: ['style-loader', 'css-loader']
				},
				{
					test: /\.scss$/,
					loaders: ['style', 'css', 'sass']
				},
				{
					test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
					loader: 'url-loader',
					options: {
						limit: 10000
					}
				}
			]
		},
		plugins: [
			new webpack.optimize.UglifyJsPlugin({minimize: true})
		]
	}
};
