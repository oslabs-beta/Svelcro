import {writable} from 'svelte/store';

export let compCountsStore = writable({test: 'test'});
export let compInstancesStore = writable({});
export let compTimesStore = writable({});

// compCounts,
// compInstance,
// compTime