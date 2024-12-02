export type Status = "ready" | "loading" | "complete" | "error";

export interface Answer {
  answer: string;
  score: number;
}

export interface Progress {
  progress: number;
}

export interface Error {
  errorMessage: string;
}

export type Result =
  | { status: "ready" }
  | { status: "loading"; data: Progress }
  | { status: "complete"; data: Answer }
  | { status: "error"; error: Error };

export interface WorkerMessage {
  status: Status;
  data?: Answer | Progress;
  error?: Error;
}

export interface WorkerRequest {
  question: string;
  context: string;
}
