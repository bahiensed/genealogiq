import { createEdgeAuthConfig } from "@genealogiq/auth/edge"

// Sequoia is tenant-scoped: a logged-in User without a tenantId (e.g. a BMS-only
// operator) is not a valid Sequoia session.
export const authConfig = createEdgeAuthConfig({
  cookieName: "seq.session-token",
  requireCustomerId: true,
  routes: {
    protected: [
      "/profile", "/dashboard", "/system", "/categories",
      "/suppliers", "/products", "/services", "/customers",
      "/purchasing", "/inventory", "/sales", "/finance",
    ],
    auth: ["/sign-in", "/forgot-password"],
    afterLogin: "/dashboard",
  },
})
