import connectionManager from "../lib/sse_connection_manager";
import asyncHandler from "../utils/asyncHandler";
import { Connection } from "../utils/connection";


const handleSSEConnection = asyncHandler(async (req, res, next) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const connection = new Connection(req, res);

  connectionManager.manageConnection({ userId: req.user!.id, connection });
});

export default { handleSSEConnection };
