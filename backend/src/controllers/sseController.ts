import asyncHandler from "../utils/asyncHandler";
import SSEConnectionManager from "../utils/sse_connection_manager";
const connectionManager = new SSEConnectionManager();

const handleSSEConnection = asyncHandler(async (req, res, next) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
});

export default { handleSSEConnection };
