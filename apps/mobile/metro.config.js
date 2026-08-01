// apps/mobile được cài cô lập (npm install --no-workspaces) nên dùng cấu hình Metro mặc định.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
