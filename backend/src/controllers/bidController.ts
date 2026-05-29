import connectionManager from "../lib/sse_connection_manager";
import asyncHandler from "../utils/asyncHandler";

const bid = asyncHandler(async (req, res, next) => {
  const { bid } = req.body ?? {};
  if (!bid) {
    return res
      .status(400)
      .json({ status: "fail", message: "bid is required" });
  }

  const data: SSEData = {
    id: crypto.randomUUID(),
    event: "new-bid",
    data: `${req.user?.fullName} bid ${bid}`,
  };

  connectionManager.broadcast({ data: data });

  return res.status(201).json({
    status: "success",
    message: "Bid placed successfully",
    data: {
      bid: data.data,
    },
  });
});

export default { bid };
