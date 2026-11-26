import { Readable } from "node:stream";
import { Router, type IRouter, type Request, type Response } from "express";

// Proxies requests to the Python hiring-agent service in services/hiring-agent.
const HIRING_AGENT_URL = (process.env.HIRING_AGENT_URL ?? "http://localhost:8000").replace(/\/+$/, "");

const router: IRouter = Router();

async function forwardResponse(upstream: globalThis.Response, res: Response) {
  const text = await upstream.text();
  res.status(upstream.status);
  res.type(upstream.headers.get("content-type") ?? "application/json");
  res.send(text);
}

function unavailable(req: Request, res: Response, err: unknown) {
  req.log.error({ err }, "hiring-agent service unreachable");
  res.status(503).json({
    detail: `The HackerRank scoring service is not reachable at ${HIRING_AGENT_URL}. Start it with: pnpm run hiring-agent`,
  });
}

router.get("/hackerrank/roles", async (req, res) => {
  try {
    const upstream = await fetch(`${HIRING_AGENT_URL}/roles`);
    await forwardResponse(upstream, res);
  } catch (err) {
    unavailable(req, res, err);
  }
});

async function forwardMultipart(path: string, req: Request, res: Response) {
  const contentType = req.headers["content-type"];
  if (!contentType?.startsWith("multipart/form-data")) {
    res.status(415).json({ detail: "Send the resume as multipart/form-data" });
    return;
  }
  try {
    // Stream the multipart body straight through; express.json/urlencoded leave it untouched.
    const upstream = await fetch(`${HIRING_AGENT_URL}${path}`, {
      method: "POST",
      headers: { "content-type": contentType },
      body: Readable.toWeb(req) as unknown as RequestInit["body"],
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    await forwardResponse(upstream, res);
  } catch (err) {
    unavailable(req, res, err);
  }
}

router.post("/hackerrank/score", (req, res) => forwardMultipart("/score", req, res));
router.post("/ats/grade", (req, res) => forwardMultipart("/ats/grade", req, res));

export default router;
