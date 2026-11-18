type Job = () => Promise<void>;

export interface JobQueue {
  enqueue(job: Job): void;
  /** Resolves when all running/queued jobs have completed. */
  drain(): Promise<void>;
}

export function createJobQueue(concurrency = 2): JobQueue {
  let running = 0;
  const queue: Job[] = [];
  const drainResolvers: Array<() => void> = [];

  function checkDrain(): void {
    if (running === 0 && queue.length === 0) {
      for (const resolve of drainResolvers.splice(0)) resolve();
    }
  }

  async function run(job: Job): Promise<void> {
    running++;
    try {
      await job();
    } catch {
      // Jobs are responsible for their own error handling (updating item status)
    } finally {
      running--;
      const next = queue.shift();
      if (next) {
        run(next);
      } else {
        checkDrain();
      }
    }
  }

  return {
    enqueue(job: Job): void {
      if (running < concurrency) {
        run(job);
      } else {
        queue.push(job);
      }
    },

    drain(): Promise<void> {
      if (running === 0 && queue.length === 0) return Promise.resolve();
      return new Promise((resolve) => drainResolvers.push(resolve));
    },
  };
}

export const jobQueue = createJobQueue(2);
