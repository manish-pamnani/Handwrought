import { Environment, LogLevel, Paddle, type PaddleOptions } from "@paddle/paddle-node-sdk";

// Sandbox and live are fully separate Paddle accounts — each with its own
// API key. Previously this always used PADDLE_API_KEY (sandbox) regardless
// of environment, which would authenticate with the wrong key the moment
// NEXT_PUBLIC_PADDLE_ENV flips to "production" (the SDK would be told to
// call Paddle's live API but sign requests with a sandbox key — every
// server-side call, including the refund webhook's transaction lookup,
// would fail outright).
export function getPaddleInstance(): Paddle {
  const isLive = process.env.NEXT_PUBLIC_PADDLE_ENV === "production";
  const apiKey = isLive ? process.env.PADDLE_API_KEY_LIVE : process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error(`${isLive ? "PADDLE_API_KEY_LIVE" : "PADDLE_API_KEY"} is not set`);
  }
  const options: PaddleOptions = {
    environment: isLive ? Environment.production : Environment.sandbox,
    logLevel: LogLevel.error,
  };
  return new Paddle(apiKey, options);
}
