export function fakeCall (randomReject = false, successRate = 0.9) {
    const duration = Math.floor(1000 * Math.random()) + 200;

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (randomReject && Math.floor(Math.random() > successRate)) {
                reject(new Error('rejected'));
                return;
            }
            resolve('resolved');
        }, duration);
    });
}
