<script>
  // COMPONENT IMPORTS
  import Nav from "./components/Nav.svelte";
  import { onMount } from "svelte";
  // STORE IMPORTS
  import {
    compInstancesStore,
    compCountsStore,
    compTimesStore,
    compArrayStore,
  } from "./store.js";


  onMount(() => {
    console.log("sending message from app mount");
    chrome.runtime.sendMessage({ header: "APP" });
  });

  chrome.runtime.onMessageExternal.addListener((msg, sender, response) => {
    if (
      msg.header === "INITIAL_LOAD" ||
      msg.header === "UPDATE_INSTANCE" ||
      msg.header === "UPDATE_RENDER" ||
      msg.header === "UPDATE_TIMES"
    ) {
      let { compCounts, compInstance, compTimes, compArray } = msg;

      // parse all incoming data
      compCounts = JSON.parse(compCounts);
      compInstance = JSON.parse(compInstance);
      compTimes = JSON.parse(compTimes);
      compArray = JSON.parse(compArray);

      // Get count data in correct format
      const adjustedCompCounts = [];
      for (const comp in compCounts) {
        const tempObj = {};
        tempObj.component = comp;
        tempObj.count = compCounts[comp];
        adjustedCompCounts.push(tempObj);
      }

      // Get time data in correct format
      const adjustedCompTimes = [];
      for (let comp in compTimes) {
        let timeObj = {};
        timeObj.component = comp;
        timeObj.time = compTimes[comp];
        adjustedCompTimes.push(timeObj);
      }

      // Added compCounts to compCountsStore so it can be accessed in other components
      compCountsStore.set([...adjustedCompCounts]);

      // Added compInstance to compInstanceStore so it can be accessed in other components
      compInstancesStore.set({ ...compInstance });

      // Added compCounts to compCountsStore so it can be accessed in other components
      compTimesStore.set([...adjustedCompTimes]);

      // Added compCounts to compCountsStore so it can be accessed in other components
      compArrayStore.set([...compArray]);

    }
  });
</script>

<main>
  <h1>Svelcro</h1>
  <Nav />
</main>

<style>
  main {
    text-align: center;
    max-width: auto;
    margin: 0 auto;
    height: 100%;
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
