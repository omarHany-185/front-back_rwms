const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');

module.exports = (_, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: './src/main.js',
        output: {
            filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
            chunkFilename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
            path: path.resolve(__dirname, 'dist'),
            clean: true,
            publicPath: '/'
        },
        resolve: {
            extensions: ['.js'],
            alias: {
                vue$: 'vue/dist/vue.esm-bundler.js'
            }
        },
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: ['style-loader', 'css-loader']
                }
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './index.html',
                filename: 'index.html'
            }),
            new DefinePlugin({
                __VUE_OPTIONS_API__: JSON.stringify(true),
                __VUE_PROD_DEVTOOLS__: JSON.stringify(false)
            })
        ],
        devServer: {
            static: {
                directory: path.resolve(__dirname, 'public')
            },
            port: 3000,
            open: true,
            hot: true,
            historyApiFallback: true,
            proxy: [
                {
                    context: ['/auth', '/users', '/manager', '/projects', '/tasks', '/submissions', '/timer', '/progress', '/api'],
                    target: 'http://localhost:8080',
                    changeOrigin: true
                }
            ]
        },
        optimization: {
            splitChunks: {
                chunks: 'all'
            }
        },
        stats: 'minimal'
    };
};

