import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  default: {
    fetch: (request: Request) => Promise<Response> | Response;
  };
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry") as Promise<ServerEntry>;
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function handleRequest(request: Request): Promise<Response> {
  try {
    const mod = await getServerEntry();
    const handler = mod.default ?? (mod as unknown as ServerEntry["default"]);
    return await handler.fetch(request);
  } catch (error) {
    const captured = consumeLastCapturedError();
    console.error(captured ?? error);
    return brandedErrorResponse();
  }
}

export default handleRequest;
