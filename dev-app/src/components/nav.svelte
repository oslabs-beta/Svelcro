<script>
  // COMPONENT IMPORTS
  import ComponentDisplay from './componentDisplay.svelte'
  import ProfilerDisplay from './profilerDisplay.svelte'
  import TimeMachineDisplay from './timeMachineDisplay.svelte'
  // import Router, {location} from 'svelte-spa-router'

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
  <div>Componet Logic</div>
  <ComponentDisplay/>
</Hidden>

<Hidden bind:this={child1} on:show={e => child1.shown = e.detail}>
  <div>Profiler Logic</div>
  <ProfilerDisplay/>
</Hidden>

<Hidden bind:this={child2} on:show={e => child2.shown = e.detail}>
  <div>Time Machine Logic</div>
  <TimeMachineDisplay/>
</Hidden>


<style>

  nav {
    background-color: rgba(122, 122, 122, 0.8);
    font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif;
    height: 45px;
  }

</style>