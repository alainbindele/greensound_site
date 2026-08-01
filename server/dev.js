/**
 * Development entry point.
 *
 * Pins the API to its own port before booting. In development the shell (or an
 * editor's run configuration) often already exports PORT for the *web* server;
 * inheriting it would make the API try to bind the port Vite is on. Production
 * uses `server/index.js` directly, where PORT is respected as usual.
 */
process.env.PORT = process.env.API_PORT || '3001';

await import('./index.js');
