// CRA's build script forces NODE_ENV=production. Keep the requested NODE_ENV
// in the browser bundle while retaining CRA's static build output and tooling.
const nodeEnv = process.env.NODE_ENV || "production";
process.env.NODE_ENV = nodeEnv;
const configPath = require.resolve("react-scripts/config/webpack.config");
const createConfig = require(configPath);

require.cache[configPath].exports = (webpackEnv) => {
  const config = createConfig(webpackEnv);
  const environmentPlugin = config.plugins.find(
    (plugin) => plugin.definitions?.["process.env"]?.NODE_ENV,
  );
  if (!environmentPlugin) throw new Error("Cannot configure the build's NODE_ENV");
  environmentPlugin.definitions["process.env"].NODE_ENV = JSON.stringify(nodeEnv);
  // Avoid webpack mode independently defining a conflicting NODE_ENV.
  config.optimization.nodeEnv = false;
  return config;
};

require("react-scripts/scripts/build");
