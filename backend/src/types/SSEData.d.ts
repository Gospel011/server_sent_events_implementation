type EventName = 'new-user'
interface SSEData {
  id: number;
  data: string;
  event: EventName;
  retry?: number;
}
