<script>
  // COMPONENT IMPORTS
  import ComponentDisplay from './componentDisplay.svelte'
  import ProfilerDisplay from './profilerDisplay.svelte'
  import TimeMachineDisplay from './timeMachineDisplay.svelte'
  import Router, {location} from 'svelte-spa-router'

  import Hidden from './Hidden.svelte';

  
    const navItems = [
        {label: "Component"},
        {label: "Profiler"},
        {label: "Time Machine"},
    ];

    ///create onclick function
     const onclick = () => {
         console.log('user clicked')

     }

</script>


<nav>
  <a href="/#/componentDisplay">Components</a>
  <a href="/#/profiler">Profiler</a>
  <a href="/#/timeMachineDisplay">TimeMachine</a>
    <!-- <ul class ='navbar'>
        <li>
            <button on:click={ComponentDisplay.show}>Component</button>
            <button on:click={ProfilerDisplay.show}>Profiler</button>
            <button on:click={TimeMachineDisplay.show}>Time Machine</button>
        </li>
    </ul> -->
    
    
</nav>

<Router routes={{
  '/componentDisplay': ComponentDisplay,
  '/profiler': ProfilerDisplay,
  '/timeMachineDisplay': TimeMachineDisplay
}}/>

<style>

  nav {
    background-color: rgba(122, 122, 122, 0.8);
    font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif;
    height: 45px;
  }

  ul{
    display: flex;
    list-style: none;
    align-items: stretch;
    justify-content: space-evenly;
  }

</style>