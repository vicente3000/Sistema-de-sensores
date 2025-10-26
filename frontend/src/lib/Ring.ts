// src/lib/Ring.ts
export class Ring<T> {
    private buf: T[] = [];
    constructor(private cap: number) {}
    push(v: T) {
        this.buf.push(v);
        if (this.buf.length > this.cap) this.buf.splice(0, this.buf.length - this.cap);
    }
    toArray() { return this.buf.slice(); }
    clear() { this.buf.length = 0; }
}

// throttle de render simple (fps máx)
export function createThrottler(ms: number) {
    let blocked = false;
    return (fn: () => void) => {
        if (blocked) return;
        blocked = true;
        setTimeout(() => { blocked = false; fn(); }, ms);
    };
}
