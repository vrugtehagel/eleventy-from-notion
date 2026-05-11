export class Queue {
  #running = new Set<Promise<void>>();
  #other: Array<() => Promise<void>> = [];
  concurrency: number = 6;

  add(item: () => Promise<unknown>): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>();
    this.#other.push(() => item().then(() => resolve(undefined)));
    queueMicrotask(() => this.#batch());
    return promise;
  }

  #next(): void {
    const item = this.#other.shift();
    if (!item) return;
    const remove = (promise: Promise<void>) => this.#running.delete(promise);
    const promise: Promise<void> = item().then(() => void remove(promise));
    this.#running.add(promise);
  }

  #batch(): void {
    if (this.#other.length == 0) return;
    let amount = this.concurrency - this.#running.size;
    if (amount <= 0) return;
    while (amount--) this.#next();
    Promise.any(this.#running).then(() => this.#batch());
  }
}
