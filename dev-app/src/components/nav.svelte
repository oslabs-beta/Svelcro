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

  let mainToBgPort;

// connect devtool to inspected webpage
function connect() {
  // chrome.runtime.sendMessage({ body: "runContentScript" }, (response) => {});

  mainToBgPort = chrome.runtime.connect(); // attempt to open port to background.js
  // mainToBgPort.onMessage.addListener((msg, sender, sendResponse) => {
  //   if (!snapshots.includes(msg.body)) {
  //     const moment = [];
  //     msg.body.componentStates.forEach((state) => {
  //       const obj = {};
  //       obj[state[2]] = state[1];
  //       moment.push(obj);
  //     });
  //     snapshots = [...snapshots.slice(0, msg.body.cacheLength), moment];
  //   }
  // });
  let connectButton = document.getElementById('connectButton');
  connectButton.style.visibility = 'hidden';
}

// injects logic into inspected webpage's DOM
function updateScript() {
  mainToBgPort.postMessage({
    body: 'runContentScript',
  });
  mainToBgPort.postMessage({
    body: 'updateScript',
    script: bundleResource,
  });
}

// handles click and invokes connect() then updateScript()
function handleClick() {
  connect();
  updateScript();
}
  

  const navItems = [
        {label: "Component"},
        {label: "Profiler"},
        {label: "Time Machine"},
    ];

    
  let bundleResource;
  chrome.devtools.inspectedWindow.getResources((resources) => {
    // search for bundle file, probably first thing in resources array with type 'script'
    for (let i = 0; i < resources.length; i++) {
      console.log('resources', resources)
      if (resources[i].type === 'script') {
        resources[i].getContent((content, encoding) => {
          // console.log('content is', content)
          bundleResource = content;
          console.log('BUNDLE', bundleResource)
        });
        break;
      }
    }
  });

  

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