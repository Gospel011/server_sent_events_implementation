import connectionManager from "../lib/sse_connection_manager";
import asyncHandler from "../utils/asyncHandler";
import { Connection } from "../utils/connection";

const handleSSEConnection = asyncHandler(async (req, res, next) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const user = req.user!;
  const connection = new Connection(req, res, user.id);
  req.user = undefined;

  connectionManager.manageConnection({
    connection,
    fullName: user.fullName,
  });
});

export default { handleSSEConnection };
