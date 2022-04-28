<script>
  // COMPONENT IMPORTS
  import ComponentDisplay from "./displays/ComponentDisplay.svelte";
  import ProfilerDisplay from "./displays/ProfilerDisplay.svelte";

  import Hidden from "./Hidden.svelte";

  let child;
  let child1;

  const componentShow = (passedChild) => {
    const children = [child, child1];
    children.forEach((el) => (el === passedChild ? el.show() : el.noShow()));
  };
</script>

<nav data-testid = 'nav-bar'>
  <button
    data-testid = 'comp-button'
    on:click={() => {
      componentShow(child);
    }}>Components</button
  >
  <button
    data-testid = 'profiler-button'
    on:click={() => {
      componentShow(child1);
    }}>Profiler</button
  >
</nav>

<Hidden bind:this={child} on:show={(e) => (child.shown = e.detail)}>
  <ComponentDisplay />
</Hidden>

<Hidden bind:this={child1} on:show={(e) => (child1.shown = e.detail)}>
  <ProfilerDisplay />
</Hidden>

<style>
  nav {
    font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif;
    display: flex;
    justify-content: space-evenly;
    height: 6%;
    min-height: 35px;
  }

  button {
    background-color: rgb(45, 42, 45);
    cursor: pointer;
    border: none;
    width: 100%;
    color: rgba(245, 245, 245, 0.543);
  }
</style>
