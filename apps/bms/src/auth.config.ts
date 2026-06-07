import { createEdgeAuthConfig } from "@genealogiq/auth/edge"

export const authConfig = createEdgeAuthConfig({
  cookieName: "bms.session-token",
  routes: {
    protected: [
      "/profile", "/dashboard", "/system", "/categories",
      "/suppliers", "/subscriptions", "/products", "/services", "/customers",
      "/purchasing", "/inventory", "/sales", "/finance",
    ],
    auth: ["/sign-in", "/setup", "/forgot-password"],
    afterLogin: "/dashboard",
  },
})
