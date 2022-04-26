<script>
  // COMPONENT IMPORTS
  import ComponentDisplay from "./displays/ComponentDisplay.svelte";
  import ProfilerDisplay from "./displays/ProfilerDisplay.svelte";
  import TimeMachineDisplay from "./displays/TimeMachineDisplay.svelte";

  import Hidden from "./Hidden.svelte";

  let child;
  let child1;
  // let child2;

  const componentShow = (passedChild) => {
    const children = [child, child1];
    children.forEach((el) => (el === passedChild ? el.show() : el.noShow()));
  };
</script>

<nav>
  <button
    on:click={() => {
      componentShow(child);
    }}>Components</button
  >
  <button
    on:click={() => {
      componentShow(child1);
    }}>Profiler</button
  >
  <!-- <button on:click={() => {componentShow(child2)}}>Time-Machine</button> -->
</nav>

<Hidden bind:this={child} on:show={(e) => (child.shown = e.detail)}>
  <ComponentDisplay />
</Hidden>

<Hidden bind:this={child1} on:show={(e) => (child1.shown = e.detail)}>
  <ProfilerDisplay />
</Hidden>

<!-- <Hidden bind:this={child2} on:show={e => child2.shown = e.detail}>
  <TimeMachineDisplay/>
</Hidden> -->
<style>
  nav {
    font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif;

    display: flex;
    justify-content: space-evenly;

    height: 6%;
  }

  button {
    background-color: rgb(45, 42, 45);
    cursor: pointer;
    border: none;
    width: 100%;
    /* font-size: 18px; */

    /* TEXT COLOR */
    color: rgba(245, 245, 245, 0.543);
  }
</style>
