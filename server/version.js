/**
 * Asset version — appended to CSS/JS URLs (?v=…) so browsers download fresh
 * files after every deploy while still caching them between deploys.
 * Railway sets RAILWAY_GIT_COMMIT_SHA; otherwise the server start time is used.
 */
export const ASSET_VERSION = (process.env.RAILWAY_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 10);
