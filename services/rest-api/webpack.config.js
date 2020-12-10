const slsw = require('serverless-webpack');
const baseConfig = require('../../webpack.config.base');

module.exports = {
  ...baseConfig,
  entry: slsw.lib.entries,
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
};
