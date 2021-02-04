// A reference counter to keep track of the rust pointer.

export default class RefCounter<T> {
  private contents: T | null;
  private destruct: (arg: T) => void;
  // RefCount starts at one, so that we don't destruct until
  // `counter.cleanup()` is called.
  private refCounts: number = 1;

  constructor(value: T, destruct: (arg: T) => void) {
    this.contents = value;
    this.destruct = destruct;
  }

  private borrow(): T {
    if (this.contents == null) {
      throw new Error(`Cannot borrow a destructed value.`);
    }
    this.refCounts += 1;
    return this.contents;
  }

  private release() {
    if (this.contents == null) {
      // releasing a destructed value is a no-op
      return;
    }
    this.refCounts -= 1;
    if (this.refCounts <= 0) {
      this.destruct(this.contents);
      this.contents = null;
    }
  }

  public cleanup() {
    this.release();
  }

  public withSyncBorrow<R>(fn: (arg: T) => R): R {
    let res;
    try {
      res = fn(this.borrow());
    } catch (err) {
      this.release();
      throw err;
    }
    this.release();
    return res;
  }

  public async withBorrow<R>(fn: (arg: T) => Promise<R> | R): Promise<R> {
    let res;
    try {
      res = await fn(this.borrow());
    } catch (err) {
      this.release();
      throw err;
    }
    this.release();
    return res;
  }
}
