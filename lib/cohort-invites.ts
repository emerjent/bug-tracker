// Re-export of the cohort invitation link helpers.
//
// Ziki's shareable invitation links ("cohort invitation links") are
// implemented in `./share-invites`. This module keeps a stable, feature-named
// entry point so callers and tests can import either name.
export * from "./share-invites";
