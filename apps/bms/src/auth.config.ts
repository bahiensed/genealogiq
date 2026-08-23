import { createEdgeAuthConfig } from "@genealogiq/auth/edge"

export const authConfig = createEdgeAuthConfig({
  cookieName: "bms.session-token",
  routes: {
    protected: [
      "/profile", "/dashboard", "/system",
      "/gencodes", "/packages", "/subscriptions", "/extra-unit-prices",
      "/categories", "/customers", "/sales",
    ],
    auth: ["/sign-in", "/setup", "/forgot-password"],
    afterLogin: "/dashboard",
  },
})
