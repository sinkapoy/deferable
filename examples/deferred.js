/* eslint-disable no-console */
import {
    defer,
} from '../src/Deferable.js';

import { fakeCall } from '../src/helpers/utils.js';

const deferred = defer(fakeCall);

deferred
    .promise
    .then(console.log)
    .catch(console.error)
    .finally(() => { console.log('finally promise'); });

console.log(`called: ${deferred.called}`);

deferred
    .execute(() => {
        console.log('...all is finished');
    });

console.log(`called: ${deferred.called}`);

deferred.execute();

deferred
    .execute(() => {
        console.log('...all is finished');
    });
