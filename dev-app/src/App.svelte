<script>
  // COMPONENT IMPORTS
  import Nav from "./components/nav.svelte";
  import { onMount } from "svelte";

  onMount(() => {
    console.log("sending message from app mount");
    chrome.runtime.sendMessage({ header: "APP" });
  });

  const handleclick = () => {
    console.log("sending message from app click");
    chrome.runtime.sendMessage({ header: "APP" });
    // window.postMessage(
    //   "AY GABA GOOL",
    //   "chrome-extension://bdbhodpgbllbabnnafknafigdemaahdd"
    // );
    // console.log("window obj:", window);
  };
</script>

<main>
  <h1>Svelcro</h1>
  <Nav />
  <button on:click={handleclick}>click</button>
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
