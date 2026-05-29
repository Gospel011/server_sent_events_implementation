import apiClient from "../api/apiClient";

interface BidApiResponse {
  status: "success" | "fail";
  message: string;
  data?: {
    bid: string;
  };
}

export interface CreateBidPayload {
  bid: string;
}

export async function createBid(payload: CreateBidPayload) {
  const response = await apiClient.post<BidApiResponse>("/bids", payload);
  return response.data;
}
