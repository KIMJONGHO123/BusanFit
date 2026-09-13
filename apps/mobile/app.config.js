const appJson = require('./app.json');

module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo,

  android: {
    ...appJson.expo.android,
    package: appJson.expo.android?.package ?? 'com.busanfit.mobile',
  },

  ios: {
    ...appJson.expo.ios,
    bundleIdentifier:
      appJson.expo.ios?.bundleIdentifier ?? 'com.busanfit.mobile',
  },

  plugins: [
    ...(appJson.expo.plugins ?? []),
    'expo-image',
    'expo-status-bar',
    'expo-web-browser',
  ],
});
