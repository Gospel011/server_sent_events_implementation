type EventName = "new-user" | "new-bid";
interface SSEData {
  id: string | number;
  data: string | Record<string, any>;
  event: EventName;
  retry?: number;
}
