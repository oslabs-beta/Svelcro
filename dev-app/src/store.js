import {writable, get} from 'svelte/store';

export let compCountsStore = writable([]);
export let compInstancesStore = writable({});
export let compTimesStore = writable([]);
export let compArrayStore = writable([]);
export let type = writable('none')
// export let compArrayStoreVal = get(compArrayStore);

// compCounts,
// compInstance,
// compTime