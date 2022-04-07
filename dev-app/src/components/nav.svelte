<script>
  // COMPONENT IMPORTS
  import ComponentDisplay from './displays/ComponentDisplay.svelte'
  import ProfilerDisplay from './displays/ProfilerDisplay.svelte'
  import TimeMachineDisplay from './displays/TimeMachineDisplay.svelte'

  import Hidden from './Hidden.svelte';

  let child;
  let child1;
  let child2;
  
  const componentShow = (passedChild) => {
    const children = [child, child1, child2];
    children.forEach(el => el === passedChild ? el.show() : el.noShow())
  };

  const navItems = [
        {label: "Component"},
        {label: "Profiler"},
        {label: "Time Machine"},
    ];


</script>



<nav>
  <!-- {#each navItems as item}
  <button on:click={() => {componentShow(item.feat)}}>{item.label}</button>
  {/each} -->

  <button on:click={() => {componentShow(child)}}>Component Show</button>
  <button on:click={() => {componentShow(child1)}}>Profiler Show</button>
  <button on:click={() => {componentShow(child2)}}>Time-Machine Show</button>
  
</nav>

<Hidden bind:this={child} on:show={e => child.shown = e.detail}>
  <ComponentDisplay/>
</Hidden>

<Hidden bind:this={child1} on:show={e => child1.shown = e.detail}>
  <ProfilerDisplay/>
</Hidden>

<Hidden bind:this={child2} on:show={e => child2.shown = e.detail}>
  <TimeMachineDisplay/>
</Hidden>


<style>

  nav {
    /* background-color: rgb(37,35,37); */
    font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif;

    display: flex;
    justify-content: space-evenly;

    height: 8%;
  }

  button {
    background-color: rgb(45, 42, 45);
    cursor: pointer;
    border: none;
    width: 100%;

    /* TEXT COLOR */
    color: rgba(245, 245, 245, 0.543);
  }



</style>