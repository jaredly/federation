export default class RefCounter<T> {
    private contents;
    private destruct;
    private refSet;
    private ownRef;
    private refCount;
    constructor(value: T, destruct: (arg: T) => void);
    private borrow;
    private release;
    cleanupWhenReady(): void;
    withBorrow<R>(fn: (arg: T) => Promise<R> | R): Promise<R>;
}
//# sourceMappingURL=refCounter.d.ts.map