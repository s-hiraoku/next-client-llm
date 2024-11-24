"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Result, Answer, Error, Progress } from "../types/result";

export default function Home() {
  const [result, setResult] = useState<Answer | Error | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [question, setQuestion] = useState<string>("");
  const [context, setContext] = useState<string>("");

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
    }

    const onMessageReceived = (
      event: MessageEvent<Result<Answer | Progress, Error>>
    ) => {
      switch (event.data.status) {
        case "loading": {
          const message = event.data.data as Progress;
          setReady(false);
          setLoadingProgress(message.progress ?? 0);
          break;
        }
        case "ready": {
          console.log("Model is ready!");
          setReady(true);
          setLoadingProgress(null);
          break;
        }
        case "complete": {
          const answer = event.data.data as Answer;
          setResult(answer);
          break;
        }
        case "error": {
          const error = event.data.error as Error;
          console.error("Error from worker:", error.errorMessage);

          setResult(error);
          break;
        }
      }
    };

    workerRef.current.addEventListener("message", onMessageReceived);

    return () => {
      if (workerRef.current) {
        workerRef.current.removeEventListener("message", onMessageReceived);
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (workerRef.current && question && context) {
      if (typeof question !== "string" || typeof context !== "string") {
        console.error(
          "Invalid input types: question and context must be strings."
        );
        return;
      }
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
          Next.js with QuestionAnswering LLM{" "}
        </h2>
        {loadingProgress !== null && (
          <div className="mb-4 flex justify-center">
            <p>Loading Model... {loadingProgress}%</p>
          </div>
        )}
        <textarea
          className="w-full p-2 border border-gray-300 rounded mb-4 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          rows={20}
          placeholder="Enter context here"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded mb-4 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          placeholder="Enter your question here"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className="flex justify-end">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
            onClick={handleSubmit}
            disabled={!ready}
          >
            {ready ? "Get Answer" : "Loading..."}
          </button>
        </div>

        {result && typeof result === "object" && "answer" in result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md dark:bg-gray-700">
            <h2 className="font-semibold mb-2">Answer:</h2>
            <p className="mb-2">{result.answer}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              score: {result.score.toFixed(2)}
            </p>
          </div>
        )}
        {result && typeof result === "object" && "errorMessage" in result && (
          <div className="text-red-500 dark:text-red-400">
            {result.errorMessage}
          </div>
        )}
      </div>
    </main>
  );
}
