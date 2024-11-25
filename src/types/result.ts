export type Answer = {
  answer: string;
  score: number;
};

export type Progress = {
  progress: number;
};

export type Error = {
  errorMessage: string;
};

export type Result =
  | { status: "ready" }
  | { status: "loading"; data: Progress }
  | { status: "complete"; data: Answer }
  | { status: "error"; error: Error };
