'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export default function Home() {
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(false); // Default is false
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');

  const workerRef = useRef(null);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      });
    }

const onMessageReceived = (e) => {
    switch (e.data.status) {
        case 'loading':
            setReady(false); // Ensure ready is false during loading
            setLoadingProgress(e.data.progress ?? 0);
            break;
        case 'ready':
            console.log("Model is ready!");
            setReady(true);
            setLoadingProgress(null); // Clear progress after loading
            break;
        case 'complete':
            setResult(e.data.output);
            break;
        case 'error':
            console.error("Error from worker:", e.data.error);
            setResult({ error: e.data.error });
            break;
    }
};

    workerRef.current.addEventListener('message', onMessageReceived);

    return () => {
      if (workerRef.current) {
        workerRef.current.removeEventListener('message', onMessageReceived);
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

 const handleSubmit = useCallback(() => {
    if (workerRef.current && question && context) {
        if (typeof question !== 'string' || typeof context !== 'string') {
            console.error("Invalid input types: question and context must be strings.");
            return;
        }
        workerRef.current.postMessage({ question, context });
        setResult(null);
    }
}, [question, context]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12 bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-3xl">
        <h1 className="text-5xl font-bold mb-2 text-center">Transformer.js QA</h1>
        <h2 className="text-2xl mb-4 text-center">Next.js with QuestionAnswering LLM </h2>

        {loadingProgress !== null && (
          <div className="mb-4 flex justify-center">
            <p>Loading Model... {loadingProgress}%</p>
          </div>
        )}

        <textarea
          className="w-full p-2 border border-gray-300 rounded mb-4"
          rows={8}
          placeholder="Enter context here"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />

        <input
          type="text"
          className="w-full  p-2 border border-gray-300 rounded mb-4"
          placeholder="Enter your question here"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div className="flex justify-end">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
            onClick={handleSubmit}
            disabled={!ready}
          >
            {ready ? 'Get Answer' : 'Loading...'}
          </button>
        </div>

        {result && !result.error && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h2 className="font-semibold mb-2">Answer:</h2>
              <p className="mb-2">{result.answer}</p>
              <p className="text-sm text-gray-600">
                score: {result.score.toFixed(2)}
              </p>
            </div>
        )}

        {result?.error && <div className="text-red-500">{result.error}</div>}
      </div>
    </main>
  );
}