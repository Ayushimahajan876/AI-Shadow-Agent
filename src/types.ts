export type Priority = "High" | "Medium" | "Low";

export interface Task {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  priority: Priority;
  dependencyId?: string;
  // Dynamic schedule fields computed client-side based on duration, sequence and work start times
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  isCompleted?: boolean;
}

export interface AssistantLogicChunk {
  text: string;
  status: "completed" | "active" | "pending";
}

export interface ParsingResult {
  logic: string[];
  tasks: Task[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  bulletTasks?: Task[];
}

