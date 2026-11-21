const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('@expo/config-plugins');

const LEAFLET_FILES = [
  'leaflet.js',
  'leaflet.css',
  'images/layers.png',
  'images/layers-2x.png',
  'images/marker-icon.png',
  'images/marker-icon-2x.png',
  'images/marker-shadow.png',
];

module.exports = function withLeafletMapAssets(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const platformRoot = modConfig.modRequest.platformProjectRoot;
      const leafletSource = path.join(projectRoot, 'assets', 'maps', 'dist');
      const htmlSource = path.join(projectRoot, 'assets', 'maps', 'web', 'index.html');
      const targetRoot = path.join(platformRoot, 'app', 'src', 'main', 'assets', 'labcheckin-map');

      fs.mkdirSync(targetRoot, { recursive: true });
      fs.mkdirSync(path.join(targetRoot, 'leaflet', 'images'), { recursive: true });

      for (const relativePath of LEAFLET_FILES) {
        const source = path.join(leafletSource, relativePath);
        const target = path.join(targetRoot, 'leaflet', relativePath);
        if (!fs.existsSync(source)) {
          throw new Error(`Leaflet asset tidak ditemukan: ${source}`);
        }
        fs.copyFileSync(source, target);
      }

      if (!fs.existsSync(htmlSource)) {
        throw new Error(`HTML peta tidak ditemukan: ${htmlSource}`);
      }
      fs.copyFileSync(htmlSource, path.join(targetRoot, 'index.html'));
      return modConfig;
    },
  ]);
};
