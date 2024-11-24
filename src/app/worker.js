import { pipeline } from "@xenova/transformers";

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
    static task = 'question-answering';
    static model = 'Xenova/distilbert-base-uncased-distilled-squad';

    static instance = null;

    static async getInstance(progress_callback = null) {
        if (!this.instance) {
            const modelLoader = pipeline(this.task, this.model, {
                progress_callback: (progress) => {
                    if (progress && typeof progress.progress === 'number') {
                        // Extract the `progress` field for meaningful percentage
                        progress_callback(progress.progress);
                    }
                },
            });
            this.instance = modelLoader;
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { question, context } = event.data;

    if (!question || !context) {
        self.postMessage({
            status: 'error',
            error: 'Both "question" and "context" must be provided.',
        });
        return;
    }

    try {
        // Retrieve the QA pipeline
        const qaPipeline = await PipelineSingleton.getInstance((progress) => {
            self.postMessage({
                status: 'loading',
                progress: Math.round(progress), // Already a percentage
            });
        });

        // Perform the question-answering task
        const output = await qaPipeline( question, context );

        // Send the output back to the main thread
        self.postMessage({
            status: 'complete',
            output: output,
        });
    } catch (error) {
        self.postMessage({
            status: 'error',
            error: error.message || 'An unknown error occurred.',
        });
    }
});

PipelineSingleton.getInstance((progress) => {
    if (typeof progress === 'number') {
        self.postMessage({
            status: 'loading',
            progress: Math.round(progress), // Already a percentage
        });
    }
}).then(() => {
    self.postMessage({ status: 'ready' });
}).catch((error) => {
    self.postMessage({
        status: 'error',
        error: error.message || 'Unknown error during model loading.',
    });
});