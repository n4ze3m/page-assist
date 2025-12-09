// Shared timing configuration for server connection health checks.
// These values are used by both the central connection store and
// the useServerOnline hook to keep polling and throttling aligned.

// While disconnected, poll frequently so newly started or fixed
// servers are detected quickly.
export const DISCONNECTED_POLL_INTERVAL_MS = 2_000

// Once connected, back off to a light-touch health check interval.
// NOTE: If you change this value, keep CONNECTED_THROTTLE_MS slightly
// lower so throttling in the connection store does not skip scheduled
// polls from useServerOnline.
export const CONNECTED_POLL_INTERVAL_MS = 30_000

// When already connected, throttle background health checks triggered
// from the connection store so we do not spam the server. This should
// remain slightly lower than CONNECTED_POLL_INTERVAL_MS.
export const CONNECTED_THROTTLE_MS = 25_000

