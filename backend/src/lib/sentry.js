// backend/lib/sentry.js
import * as Sentry from "@sentry/node";
import { ENV } from "./env.js";

export const initSentry = (app) => {
  if (ENV.NODE_ENV === "production" && ENV.SENTRY_DSN) {
    Sentry.init({
      dsn: ENV.SENTRY_DSN,
      environment: ENV.NODE_ENV,
      tracesSampleRate: 1.0,
      beforeSend(event, hint) {
        // Don't send 4xx errors to Sentry
        if (event.exception) {
          const status = hint.originalException?.status;
          if (status >= 400 && status < 500) {
            return null;
          }
        }
        return event;
      },
    });

    // Request handler must be first
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
};

export const sentryErrorHandler = () => {
  if (ENV.NODE_ENV === "production" && ENV.SENTRY_DSN) {
    return Sentry.Handlers.errorHandler();
  }
  return (err, req, res, next) => next(err);
};

export const captureException = (error, context = {}) => {
  if (ENV.NODE_ENV === "production" && ENV.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
};
