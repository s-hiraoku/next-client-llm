import {
  pipeline,
  type PipelineType,
  type QuestionAnsweringPipeline,
  env,
} from "@xenova/transformers";

// モデルのインスタンス管理用のSingletonクラス
class PipelineSingleton {
  static task: PipelineType = "question-answering";
  static model = "/onnx_model";

  private static qaInstance: QuestionAnsweringPipeline | null = null;

  static async getQuestionAnsweringInstance(
    progressCallback: (progress: number) => void
  ): Promise<QuestionAnsweringPipeline> {
    if (!this.qaInstance) {
      const modelInstance = await pipeline(this.task, this.model, {
        progress_callback: (progress: { progress: number }) => {
          if (progress && typeof progress.progress === "number") {
            progressCallback(progress.progress);
          }
        },
      });
      this.qaInstance = modelInstance as QuestionAnsweringPipeline;
    }
    return this.qaInstance;
  }
}

// ローカルのモデルを実行するための設定
env.allowLocalModels = true;

// メインスレッドからのメッセージを監視
self.addEventListener(
  "message",
  async (event: MessageEvent<{ question: string; context: string }>) => {
    const { question, context } = event.data;

    if (!question || !context) {
      self.postMessage({
        status: "error",
        error: 'Both "question" and "context" must be provided.',
      });
      return;
    }

    try {
      // QAパイプラインを取得
      const qaPipeline = await PipelineSingleton.getQuestionAnsweringInstance(
        (progress: number) => {
          self.postMessage({
            status: "loading",
            data: { progress: Math.round(progress) }, // 進捗をパーセントに丸める
          });
        }
      );

      // 質問応答タスクを実行
      const output = await qaPipeline(question, context);

      // 出力をメインスレッドに送信
      self.postMessage({
        status: "complete",
        data: output,
      });
    } catch (error: unknown) {
      self.postMessage({
        status: "error",
        error: {
          errorMessage:
            (error as Error).message || "An unknown error occurred.",
        },
      });
    }
  }
);

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
