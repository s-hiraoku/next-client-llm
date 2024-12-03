import {
  pipeline,
  type PipelineType,
  type QuestionAnsweringPipeline,
  type QuestionAnsweringOutput,
  env,
} from "@xenova/transformers";
import { Answer, WorkerMessage, WorkerRequest } from "@/src/types/worker";

// モデルのインスタンス管理用のSingletonクラス
class PipelineSingleton {
  // タスクとモデルの設定
  static task: PipelineType = "question-answering";
  static model = "/onnx_model";

  private static qaInstance: QuestionAnsweringPipeline | null = null;

  static async getQuestionAnsweringInstance(
    progressCallback?: (progress: number) => void
  ): Promise<QuestionAnsweringPipeline> {
    if (!this.qaInstance) {
      const modelInstance = await pipeline(this.task, this.model, {
        progress_callback: (progress: { progress: number }) => {
          if (progress && typeof progress.progress === "number") {
            progressCallback?.(progress.progress);
          }
        },
      });
      this.qaInstance = modelInstance as QuestionAnsweringPipeline;
    }
    return this.qaInstance;
  }
}

const convertResult = (
  output: QuestionAnsweringOutput | QuestionAnsweringOutput[]
): Answer => {
  let combinedAnswer: Answer;
  if (Array.isArray(output)) {
    // 暫定処理: 複数の回答が帰ってきた場合を結果を結合
    const combinedText = output.map((o) => o.answer).join(" ");
    const finalScore = output[output.length - 1].score;
    combinedAnswer = { answer: combinedText, score: finalScore };
    return combinedAnswer;
  }
  const answer: Answer = {
    answer: output.answer,
    score: output.score,
  };
  return answer;
};

// ローカルのモデルを実行するための設定
env.allowLocalModels = true;

// メインスレッドからのメッセージを監視
self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const { question, context } = event.data;

  if (!question || !context) {
    const errorMessage: WorkerMessage = {
      status: "error",
      error: {
        errorMessage: 'Both "question" and "context" must be provided.',
      },
    };
    self.postMessage(errorMessage);
    return;
  }

  try {
    // QAパイプラインのインスタンスを取得
    const qaPipeline = await PipelineSingleton.getQuestionAnsweringInstance();

    // 質問応答タスクを実行
    const output = await qaPipeline(question, context);

    // outputが配列かどうかをチェックし、すべての回答を処理
    const answer = convertResult(output);

    // 出力をメインスレッドに送信
    const resultMessage: WorkerMessage = {
      status: "complete",
      data: answer,
    };
    self.postMessage(resultMessage);
  } catch (error: unknown) {
    const errorMessage: WorkerMessage = {
      status: "error",
      error: {
        errorMessage: (error as Error).message || "An unknown error occurred.",
      },
    };
    self.postMessage(errorMessage);
  }
});

// エラーリスナー
self.addEventListener("error", (event) => {
  console.error("Worker internal error:", event.message);
  self.postMessage({
    status: "error",
    error: { errorMessage: `Internal Worker error: ${event.message}` },
  });
});

self.addEventListener("messageerror", (event) => {
  console.error("Worker message error:", event.data);
  self.postMessage({
    status: "error",
    error: { errorMessage: `Invalid message: ${event.data}` },
  });
});

// パイプラインを事前ロード
PipelineSingleton.getQuestionAnsweringInstance((progress: number) => {
  self.postMessage({
    status: "loading",
    data: { progress: Math.round(progress) },
  });
})
  .then(() => {
    self.postMessage({ status: "ready" });
  })
  .catch((error: Error) => {
    self.postMessage({
      status: "error",
      error: error.message || "Unknown error during model loading.",
    });
  });
