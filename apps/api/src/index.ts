import { ApiServerConfig } from "./config.js";
import { makeApiRuntime } from "./runtime.js";

const runtime = makeApiRuntime();

let shutdownStarted = false;

const shutdown = async (signal: NodeJS.Signals) => {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;
  console.info(`WhatTax API received ${signal}; shutting down`);

  try {
    await runtime.dispose();
    console.info("WhatTax API stopped");
    process.exit(0);
  } catch (error) {
    console.error("WhatTax API shutdown failed", error);
    process.exit(1);
  }
};

process.once("SIGINT", (signal) => {
  void shutdown(signal);
});
process.once("SIGTERM", (signal) => {
  void shutdown(signal);
});

try {
  const config = await runtime.runPromise(ApiServerConfig.asEffect());
  console.info(`WhatTax API listening on http://${config.host}:${config.port}`);
} catch (error) {
  console.error("WhatTax API failed to start", error);
  await runtime.dispose();
  process.exit(1);
}
