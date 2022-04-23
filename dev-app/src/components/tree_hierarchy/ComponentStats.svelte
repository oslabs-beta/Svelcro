<script>
import ComponentTree from "./ComponentTree.svelte";



let compRecord = [];

chrome.runtime.onMessageExternal.addListener((msg, sender, response) => {

  if (msg.body === "UPDATE_INSTANCE") {
    const { components } = msg;
    console.log('CompStats - components in UPDATE_INSTANCE: ', JSON.parse(components))


    // Updating Component Record
    compRecord = JSON.parse(components);
  }
  return true;
  
});

</script>

<div id="component-stats">
  Component stats

  <ul>
    {#each compRecord as comp}
      <li>
        {`${comp.$$.id}: ${JSON.stringify(comp.$$.ctx[0])}`}
      </li>
    {/each}
  </ul>

</div>

  

<style>

#component-stats{
  border-left: 1px solid rgb(1, 1, 1);

  width: 50%;
  height: 100%;
}

</style>