import { createEdgeAuthConfig } from "@genealogiq/auth/edge"

// /profile is intentionally public — memorials must be reachable by anyone scanning a QR.
export const authConfig = createEdgeAuthConfig({
  cookieName: "app.session-token",
  routes: {
    protected: ["/home", "/tree"],
    auth: ["/sign-in", "/sign-up", "/forgot-password"],
    afterLogin: "/home",
  },
})
