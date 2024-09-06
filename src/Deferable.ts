/**
 * @desc
 * implements deferred pattern
 * extended promise with exposed resolve and reject handlers
 *
 * passed resolver function
 *
 * @param? {Function} resolver function taking two params: function resolve and function reject
 *         this parameter is provided as default
 */
export class DeferredPromise<T = any> extends Promise<T> {
    resolve!: (arg: T) => void;
    reject!: (arg: any) => void;

    constructor (resolver?: (resolve: (arg: T) => void, reject: (arg: any) => void) => void) {
        const resolvers = {};
        super(function (resolve, reject) {
            Object.assign(resolvers, { resolve, reject });
        });
        Object.assign(this, resolvers);
        if (resolver) {
            resolver(this.resolve, this.reject);
        }
    }

    // return a Promise for then/catch/finally
    static get [Symbol.species] () {
        return Promise;
    }

    // Promise overrides his Symbol.toStringTag
    get [Symbol.toStringTag] () {
        return 'DeferredPromise';
    }
}

/**
 * @description
 * extended Deferred
 *
 * example:
 * new Deferred(() => http.get(url))
 *
 * if we need to pass promise but we do not want to do the actual work yet
 * like e.g. REST calls throttling.
 *
 * @param {Function} takes as argument factory returning promise
 */
export class DeferredTrigger<T> extends DeferredPromise<T> {
    /**
     *
     * @param callback function wich will be invoked on trigger() call
     */
    constructor (private readonly callback: () => (Promise<T> | T)) {
        super();
    }

    async trigger (): Promise<T> {
        const result = this.callback();
        if (result instanceof Promise) {
            result.catch((reason) => { this.reject(reason); });
        }
        const resolved = await result;
        this.resolve(resolved);
        return resolved;
    }
}

class DeferWrapper<T, ArgsT extends (any[]  | []) = []> {
    constructor (private readonly _p: Promise<T>, private readonly onTriggerArray: (() => void)[], private readonly executor: (...args: any[]) => any) { }

    get promise () {
        return this._p;
    }

    /**
     * @description
     * hook to notify subscribes that the promise fullfilment had been triggered
     * without this we only know when the promise gets settled by subscribing to
     * then or catch or finally
     * @param callback
     */
    onTrigger (callback: () => void) {
        // @ts-expect-error callback shape always returns call? as true
        if (callback.apply && callback.call) {
            this.onTriggerArray.push(callback);
        } else {
            throw Error('Callback must be type of function.');
        }
    }

    /**
     * @description
     * triggers the fullfilment of the Promise
     * after calling this lever the Promise gets setteld
     *
     * @param {...any} any number of parameters passed to executor function
     * @returns {Promise} returns the Promise which is returned from the executor function
     */
    trigger (...args: ArgsT): Promise<T> {
        return this.executor(...(args));
    }
}

/**
 * @description
 * factory method returning a deferred object containing a promise and the lever to trigger
 * to settle the promise.
 *
 * @param {Function} workload factory function returning a Promise (which needs to be deffered)
 *
 * @returns {DeferWrapper} a wrapper with deferred promise and an executor which triggers the promise fullfillment
 **/
export function defer<T, ArgsT extends any[] | []> (workload: (...args: ArgsT) => Promise<T>): DeferWrapper<T, ArgsT> {
    const _onTrigger: (() => void)[] = [];
    const promise = new DeferredPromise<T>();

    const executor = (function (workload) {
        let _executorCache: Promise<any> | undefined;

        return function (...args: ArgsT) {
            if (_executorCache) {
                return _executorCache;
            }
            // emit onTrigger only first time the workload is executed
            _onTrigger.forEach((fn) => { fn(); });
            _executorCache = workload(...args)
                .then(data => {
                    promise.resolve(data);
                })
                .catch(reason => {
                    promise.reject(reason);
                });
            return _executorCache;
        };
    })(workload);

    return new DeferWrapper(promise, _onTrigger, executor);
}
