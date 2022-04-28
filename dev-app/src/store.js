import {writable, get} from 'svelte/store';

export const compCountsStore = writable([]);
export const compInstancesStore = writable({});
export const compTimesStore = writable([]);
export const compArrayStore = writable([]);
export const type = writable('none');
