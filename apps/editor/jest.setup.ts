import '@testing-library/jest-dom';

// Ensure MongoDB Memory Server globals are available
// These are set by @shelf/jest-mongodb preset
declare global {
  var __MONGO_URI__: string;
  var __MONGO_DB_NAME__: string;
  // Legacy names for backwards compatibility
  var __ATLAS_URI__: string;
  var __ATLAS_DATABASE_NAME__: string;
}

// Map the new global names to legacy names if needed
if (typeof globalThis.__MONGO_URI__ !== 'undefined' && typeof globalThis.__ATLAS_URI__ === 'undefined') {
  globalThis.__ATLAS_URI__ = globalThis.__MONGO_URI__;
}

if (typeof globalThis.__MONGO_DB_NAME__ !== 'undefined' && typeof globalThis.__ATLAS_DATABASE_NAME__ === 'undefined') {
  globalThis.__ATLAS_DATABASE_NAME__ = globalThis.__MONGO_DB_NAME__;
}
