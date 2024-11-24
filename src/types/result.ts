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

export type Result<T, E> = {
  status: "ready" | "loading" | "complete" | "error";
  data?: T;
  error?: E;
};
