import { createEdgeAuthConfig } from "@genealogiq/auth/edge"

export const authConfig = createEdgeAuthConfig({
  cookieName: "bms.session-token",
  routes: {
    protected: [
      "/profile", "/dashboard", "/system",
      "/gencodes", "/subscriptions", "/extra-unit-prices",
      "/customers", "/sales",
    ],
    auth: ["/sign-in", "/setup", "/forgot-password"],
    afterLogin: "/dashboard",
  },
})
