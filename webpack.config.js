const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');
const path = require('path');

const devMode = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/js/bundle.[fullhash:8].js'
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(__dirname, 'src/index.html')
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/assets/vendors',
          to: 'assets/vendors'
        }
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        resolve: {
          extensions: ['.js']
        },
        include: [
          path.resolve(__dirname, 'src')
        ],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { modules: false }]
              ],
              plugins: ['@babel/plugin-transform-runtime']
            }
          }
        ]
      },
      {
        test: /\.(dat)$/i,
        include: [
          path.resolve(__dirname, 'src/assets/data')
        ],
        type: 'asset/resource',
        generator: {
          filename: 'assets/data/[name].[hash:8][ext]'
        }
      },
      {
        test: /\.(patt)$/i,
        include: [
          path.resolve(__dirname, 'src/assets/targets')
        ],
        type: 'asset/resource',
        generator: {
          filename: 'assets/targets/[name].[hash:8][ext]'
        }
      },
      {
        test: /\.(glb|fbx)$/i,
        include: [
          path.resolve(__dirname, 'src/assets/models')
        ],
        type: 'asset/resource',
        generator: {
          filename: 'assets/models/[name].[hash:8][ext]'
        }
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        include: [
          path.resolve(__dirname, 'src/assets/textures')
        ],
        type: 'asset/resource',
        generator: {
          filename: 'assets/textures/[name].[hash:8][ext]'
        },
        use: [
          {
            loader: ImageMinimizerPlugin.loader,
            options: {
              minimizer: {
                implementation: ImageMinimizerPlugin.imageminMinify,
                options: {
                  plugins: [
                    ['gifsicle', {}],
                    ['jpegtran', {}],
                    ['optipng', {}]
                  ]
                }
              }
            }
          }
        ]
      },
      {
        test: /\.(mp4|ogv|webm)$/i,
        include: [
          path.resolve(__dirname, 'src/assets/videos')
        ],
        type: 'asset/resource',
        generator: {
          filename: 'assets/videos/[name].[hash:8][ext]'
        }
      }
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/')
    }
  },
  ...(devMode ? {
    devtool: 'eval-source-map',
    devServer: {
      hot: true
    }
  } : {})
};
