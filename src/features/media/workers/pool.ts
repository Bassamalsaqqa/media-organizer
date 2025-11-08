type Job<T, R> = {
  data: T;
  resolve: (result: R) => void;
  reject: (error: any) => void;
};

type ProgressCallback = (progress: { completed: number; total: number }) => void;

class WorkerPool<T, R> {
  private workerFactory: () => Worker;
  private numWorkers: number;
  private workers: Worker[] = [];
  private jobQueue: Job<T, R>[] = [];
  private isRunning = false;
  private onProgressCallback?: ProgressCallback;
  private completedJobs = 0;
  private totalJobs = 0;

  constructor(workerFactory: () => Worker, numWorkers: number = navigator.hardwareConcurrency || 8) {
    this.workerFactory = workerFactory;
    this.numWorkers = numWorkers;
  }

  addJob(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const job: Job<T, R> = { data, resolve, reject };
      this.jobQueue.push(job);
      this.totalJobs++;
      if (this.isRunning) {
        this.assignJob();
      }
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.completedJobs = 0;
    this.totalJobs = this.jobQueue.length;

    for (let i = 0; i < this.numWorkers; i++) {
      const worker = this.workerFactory();
      worker.onmessage = (event) => {
        const job = this.workers[i].__job as Job<T, R> | undefined;
        if (job) {
          this.completedJobs++;
          job.resolve(event.data);
          if (this.onProgressCallback) {
            this.onProgressCallback({ completed: this.completedJobs, total: this.totalJobs });
          }
        }
        this.assignJobToWorker(worker);
      };
      worker.onerror = (error) => {
        const job = this.workers[i].__job as Job<T, R> | undefined;
        if (job) {
          job.reject(error);
        }
      };
      this.workers.push(worker);
      this.assignJobToWorker(worker);
    }
  }

  stop() {
    this.isRunning = false;
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.jobQueue = [];
  }

  onProgress(callback: ProgressCallback) {
    this.onProgressCallback = callback;
  }

  private assignJob() {
    const availableWorker = this.workers.find(w => !(w as any).__job);
    if (availableWorker) {
      this.assignJobToWorker(availableWorker);
    }
  }

  private assignJobToWorker(worker: Worker) {
    const job = this.jobQueue.shift();
    if (job) {
      (worker as any).__job = job;
      worker.postMessage(job.data);
    } else {
      (worker as any).__job = undefined;
    }
  }
}

declare global {
    interface Worker {
        __job?: any;
    }
}

export function createWorkerPool<T, R>(workerFactory: () => Worker, opts?: { numWorkers: number }) {
  return new WorkerPool<T, R>(workerFactory, opts?.numWorkers);
}
