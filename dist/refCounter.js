"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RefCounter {
    constructor(value, destruct) {
        this.refSet = [];
        this.refCount = 0;
        this.contents = value;
        this.destruct = destruct;
        this.ownRef = { num: this.refCount++ };
        this.refSet.push(this.ownRef);
    }
    borrow() {
        if (this.contents == null) {
            throw new Error(`Cannot borrow a destructed value.`);
        }
        const ref = { num: this.refCount++ };
        this.refSet.push(ref);
        return [this.contents, ref];
    }
    release(ref) {
        const idx = this.refSet.indexOf(ref);
        if (idx === -1) {
            console.warn(`Double release! #${ref.num}`, new Error().stack);
            return;
        }
        if (this.contents == null) {
            console.warn(`Contents were destroyed before a borrow #${ref.num} was released.`);
            return;
        }
        this.refSet.splice(idx, 1);
        if (this.refSet.length === 0) {
            this.destruct(this.contents);
            this.contents = null;
        }
    }
    cleanupWhenReady() {
        if (this.ownRef) {
            this.release(this.ownRef);
            this.ownRef = null;
        }
        else {
            console.warn(`Trying to cleanupWhenReady() twice. This is a no-op.`);
        }
    }
    async withBorrow(fn) {
        let res;
        const [value, ref] = this.borrow();
        try {
            res = await fn(value);
        }
        catch (err) {
            this.release(ref);
            throw err;
        }
        this.release(ref);
        return res;
    }
}
exports.default = RefCounter;
//# sourceMappingURL=refCounter.js.map