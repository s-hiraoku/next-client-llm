"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Result, Answer, Error, Progress } from "@/src/types/result";

const Loading = ({ progress }: { progress: number | null }) =>
  progress !== null ? (
    <div className="mb-4 text-center">Loading Model... {progress}%</div>
  ) : null;

const AnswerDisplay = ({ answer, score }: Answer) => (
  <div className="mt-4 p-4 bg-gray-50 rounded-md dark:bg-gray-700">
    <h2 className="font-semibold mb-2">Answer:</h2>
    <p className="mb-2">{answer}</p>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Score: {score.toFixed(2)}
    </p>
  </div>
);

const ErrorDisplay = ({ errorMessage }: Error) => (
  <div className="text-red-500 dark:text-red-400 mt-4">
    <h2 className="font-semibold mb-2">Error:</h2>
    <p className="text-sm">{errorMessage}</p>
  </div>
);

export default function Home() {
  const [result, setResult] = useState<Answer | Error | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
    }

    const onMessageReceived = (event: MessageEvent<Result>) => {
      const { status } = event.data;

      switch (status) {
        case "loading":
          setReady(false);
          setLoadingProgress(event.data.data.progress);
          break;
        case "ready":
          setReady(true);
          setLoadingProgress(null);
          break;
        case "complete":
          setResult(event.data.data);
          break;
        case "error":
          console.error("Error from worker:", event.data.error.errorMessage);
          setResult(event.data.error);
          break;
      }
    };

    workerRef.current.addEventListener("message", onMessageReceived);

    return () => {
      workerRef.current?.removeEventListener("message", onMessageReceived);
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (workerRef.current && question && context) {
      workerRef.current.postMessage({ question, context });
      setResult(null);
    }
  }, [question, context]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 shadow-lg rounded-lg p-8 w-full max-w-3xl">
        <h1 className="text-5xl font-bold mb-2 text-center">
          Transformer.js QA
        </h1>
        <h2 className="text-2xl mb-4 text-center">
          Next.js with QuestionAnswering LLM
        </h2>
        <Loading progress={loadingProgress} />
        <textarea
          className="w-full p-2 border rounded mb-4 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          rows={20}
          placeholder="Enter context here"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <input
          type="text"
          className="w-full p-2 border rounded mb-4 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          placeholder="Enter your question here"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4 w-full"
          onClick={handleSubmit}
          disabled={!ready}
        >
          {ready ? "Get Answer" : "Loading..."}
        </button>
        {result && "answer" in result && <AnswerDisplay {...result} />}
        {result && "errorMessage" in result && <ErrorDisplay {...result} />}
      </div>
    </main>
  );
}
