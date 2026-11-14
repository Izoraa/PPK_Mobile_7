jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Firebase Auth Web SDK needs a real Node fetch implementation in Jest Expo.
const { fetch: nodeFetch } = require('undici');
global.fetch = nodeFetch;

jest.setTimeout(30_000);
