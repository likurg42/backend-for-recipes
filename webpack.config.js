const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
    // optimization: {
    //     minimize: true,
    //     minimizer: [new TerserPlugin()],
    // },
    output: {
        filename: 'script.min.js',
    },
    devtool: 'eval',
    module: {
        rules: [
            {
                test: /\.(js)$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            [
                                '@babel/env',
                                {
                                    loose: true,
                                    exclude: [
                                        'transform-async-to-generator',
                                        'transform-regenerator',
                                    ],
                                },
                            ],
                        ],
                        // plugins: ['fast-async', { spec: true }],
                    },
                },
            },
        ],
    },
    externals: {
        firebase: 'firebase',
    },
};
