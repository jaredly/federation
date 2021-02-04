// A reference counter to keep track of rust pointers, which have to be manually destructed.

// This data structure represents an individual "borrow". The number is just
// for debugging purposes -- borrows are compared via reference equality,
// not structural.
type Borrow = {num: number};

export default class RefCounter<T> {
  private contents: T | null;
  private destruct: (arg: T) => void;
  private refSet: Array<Borrow> = [];
  private ownRef: Borrow | null;
  private refCount: number = 0;

  constructor(value: T, destruct: (arg: T) => void) {
    this.contents = value;
    this.destruct = destruct;
    // Have to keep track of our "own" reservation, so that the contents
    // don't get cleaned up until after `.cleanupWhenReady()` is called.
    this.ownRef = {num: this.refCount++};
    this.refSet.push(this.ownRef);
  }

  private borrow(): [T, Borrow] {
    if (this.contents == null) {
      throw new Error(`Cannot borrow a destructed value.`);
    }
    const ref = {num: this.refCount++}
    this.refSet.push(ref);
    return [this.contents, ref];
  }

  private release(ref: Borrow) {
    const idx = this.refSet.indexOf(ref)
    if (idx === -1) {
      console.warn(`Double release! #${ref.num}`, new Error().stack)
      return;
    }
    if (this.contents == null) {
      console.warn(`Contents were destroyed before a borrow #${ref.num} was released.`)
      return;
    }
    this.refSet.splice(idx, 1);
    if (this.refSet.length === 0) {
      this.destruct(this.contents);
      this.contents = null;
    }
  }

  // Indicate that the contained value should be cleaned up after any
  // outstanding borrows have been returned.
  public cleanupWhenReady() {
    if (this.ownRef) {
      this.release(this.ownRef);
      this.ownRef = null;
    } else {
      console.warn(`Trying to cleanupWhenReady() twice. This is a no-op.`);
    }
  }

  // Safely borrow the contained value for an async procedure; the contents
  // will not be destructed before the function's return promise has resolved.
  public async withBorrow<R>(fn: (arg: T) => Promise<R> | R): Promise<R> {
    let res;
    const [value, ref] = this.borrow();
    try {
      res = await fn(value);
    } catch (err) {
      this.release(ref);
      throw err;
    }
    this.release(ref);
    return res;
  }
}
