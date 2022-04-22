<script>
  // COMPONENT IMPORTS
  import Nav from "./components/nav.svelte";

  // MING TEST
  //   import { current_component } from "svelte/internal";

  const compCountRecord = {};
  const compInstanceRecord = {};

  //   chrome.runtime.onMessageExternal.addListener((msg, sender, response) => {
  //     if (msg.header === "UPDATE_RENDER") {
  //       const { data, body } = msg;
  //       //   console.log(
  //       //     "APP - recieving at Dev Tools! Coming from injected scripts",
  //       //     JSON.parse(data)
  //       //   );
  //       //   console.log("APP - body.components: ", body.components);

  //       for (const key in compCountRecord) {
  //         delete compCountRecord[key];
  //       }
  //       const tempObj = { ...JSON.parse(data) };
  //       for (const property in tempObj) {
  //         compCountRecord[property] = tempObj[property];
  //       }

  //       console.log("compCountRecord: ", compCountRecord);
  //     } else if (msg.header === "UPDATE_INSTANCE") {
  //       const { data } = msg;

  //       for (const key in compInstanceRecord) {
  //         delete compInstanceRecord[key];
  //       }
  //       const tempObj = { ...JSON.parse(data) };
  //       for (const property in tempObj) {
  //         compInstanceRecord[property] = tempObj[property];
  //       }

  //       console.log("compInstanceRecord: ", compInstanceRecord);
  //     }
  //     return true;
  //   });
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
