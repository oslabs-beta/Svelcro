<script>
  // COMPONENT IMPORTS
  import Nav from "./components/nav.svelte";
  import { onMount } from "svelte";
  // STORE IMPORTS
  import {
    compInstancesStore,
    compCountsStore,
    compTimesStore,
  } from "./store.js";

  onMount(() => {
    console.log("sending message from app mount");
    chrome.runtime.sendMessage({ header: "APP" });
  });

  // const handleclick = () => {
  //   console.log("sending message from app click");
  //   chrome.runtime.sendMessage({ header: "APP" });
  // };

  chrome.runtime.onMessageExternal.addListener((msg, sender, response) => {
    if (msg.body === "INITIAL-LOAD") {
      let { compCounts, compInstance, compTimes } = msg;

      compCounts = JSON.parse(compCounts);
      compInstance = JSON.parse(compInstance);
      compTimes = JSON.parse(compTimes);

      // Added compCounts to compCountsStore so it can be accessed in other components
      compCountsStore.set({ ...compCounts });

      // Verfiy store value
      compCountsStore.update((compCountsStore) => {
        console.log("compCountsStore: ", compCountsStore);
      });

      // Added compInstance to compInstanceStore so it can be accessed in other components
      compInstancesStore.set({ ...compInstance });

      // Verfiy store value
      compInstancesStore.update((compInstancesStore) => {
        console.log("compInstancesStore: ", compInstancesStore);
      });

      // Added compCounts to compCountsStore so it can be accessed in other components
      compTimesStore.set({ ...compTimes });

      // Verfiy store value
      compTimesStore.update((compTimesStore) => {
        console.log("compTimeStore: ", compTimesStore);
      });
    }
  });
</script>

<main>
  <h1>Svelcro</h1>
  <Nav />
  <!-- <button on:click={handleclick}>click</button> -->
</main>

<style>
  main {
    text-align: center;
    max-width: auto;
    margin: 0 auto;
    height: 100%;
    /* Background Color */
    background-color: rgb(37, 35, 37);
  }
  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
    margin: 0;
  }
  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
