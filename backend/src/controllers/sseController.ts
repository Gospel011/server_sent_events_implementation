import asyncHandler from "../utils/asyncHandler";

const handleSSEConnection = asyncHandler(async (req, res, next) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
});


export default {handleSSEConnection}
