// No-op stand-in for Next.js marker packages ("server-only" / "client-only")
// that exist only to fail builds when imported from the wrong environment.
// In Vitest (node) we alias them here so server modules can be unit-tested.
export {}
