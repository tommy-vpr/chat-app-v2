// backend/middleware/csrf.js
import csurf from "csurf";
import { ENV } from "../lib/env.js";

export const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: "strict",
  },
});

// Endpoint to get CSRF token
export const getCsrfToken = (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
};
