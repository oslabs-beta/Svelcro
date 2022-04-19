
// window.tag = document.createElement('script');
// const root = document.getElementById('root');
// while (root.children.length) {
//   root.children[0].remove();
// }

(function () { 
  'use strict';

  const parse = (event) => JSON.parse(JSON.stringify(event));
  let cacheState = [];
  const components = [];
  let lastIndex = 0;

  const sendMessages = (componentStates) => {
    window.postMessage({ 
      body: { 
        componentStates: componentStates, 
        cacheLength: cacheState.length 
      }
    });
  };



  const allComps = [];
  const getAllComps = () => {
    const root2 = document.getElementById("root")
    console.log(root2)
    
  }
  getAllComps();
  window.document.addEventListener("click", function(){
    console.log("PAGE LOADED")
    
  }, true)


  // window.document.addEventListener("SvelteDOMSetData", (e) => {
  //   console.log(e)
  // })

  // object to hold render counts by component
  const compCounts = {};
  let nextId = 1;
  // add all Svelte components to array
    window.document.addEventListener('SvelteRegisterComponent', (e) => {
      
      let isFirstAfterUpdate = true;
      
      const { component, tagName } = e.detail;

      component.$$['id'] = tagName + nextId;
      nextId++;
      const curId = component.$$.id;
      compCounts[curId] = 1;
      components.push(e.detail.component)

      console.log('is the id there?', component.$$)
      console.log('components', components)
      // console.log('event', e)

      

    console.log('VERY FIRST`:', window.performance.now())
    
    component.$$.before_update.push(() => {
      //////
      // const curId = component.$$.ctx[0].id;
      // console.log( tagName, ' ' ,component.$$.ctx[0].id, 'beforeUpdate');
      // console.log(Date.now())
      console.log('BEFORE IS:', window.performance.now())
      // if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
      // else compCounts[curId] = 1;

      console.log("compCounts", compCounts);
    });

    component.$$.after_update.push(() => {
      if (isFirstAfterUpdate) { return isFirstAfterUpdate = false;}
      const curId = component.$$.id;
      console.log( tagName, ' ' , curId , 'AfterUpdate');
      // console.log(Date.now())
      // console.log('AFTER IS:', window.performance.now())
      //  if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
      // else compCounts[curId] = 1;
      compCounts[curId] += 1;
     
      
    });

    // let performance = window.performance;
    // let performanceEntries = performance.getEntriesByType('paint');
    // console.log('performance:', performanceEntries)
    // performanceEntries.forEach( (performanceEntry, i, entries) => {
    //   console.log("The time to " + performanceEntry.name + " was " + performanceEntry.startTime + " milliseconds.")})
})


  
  // setTimeout(saveAndDispatchState, 0);

  // function checkIfChanged(componentState, i) {
  //   // if caches state is empty... or the most recent cache state is different
  //   // and the state at the last sent index is different, then state has truly changed
  //   if (!cacheState.length ||
  //     (JSON.stringify(cacheState[cacheState.length - 1][i][1]) !== JSON.stringify(componentState[1])
  //     && JSON.stringify(cacheState[lastIndex][i][1]) !== JSON.stringify(componentState[1]))) {
  //     return true;
  //   } else return false;
  // }

  // function saveAndDispatchState() {
  //   const curState = [];
  //   components.forEach((component) => {
  //     curState.push([component, component.$capture_state(), component.constructor.name]);
  //   })
  //   // only add to cache & send messages if any state has actually changed
  //   if (curState.some(checkIfChanged)) {
  //   // if cacheState is logner than the last index, we are back in time and should start a new branch
  //     if (cacheState.length > lastIndex){
  //       cacheState = cacheState.slice(0, lastIndex + 1)
  //     }
  //     sendMessages(parse(curState));
  //     cacheState.push([...curState]);
  //     lastIndex = cacheState.length - 1;
  //   }
  // }

  function setupListeners(root) {
    // root.addEventListener('SvelteRegisterBlock', (e) => saveAndDispatchState());
    // root.addEventListener('SvelteDOMSetData', (e) => saveAndDispatchState());
    // root.addEventListener('SvelteDOMInsert', (e) => saveAndDispatchState());

    // These event listeners aren't being used in this version, but could provide valuable data for future versions of this product
    // root.addEventListener('SvelteDOMRemove', (e) => (e) => sendMessages(parseEvent(e.detail)));
    // root.addEventListener('SvelteDOMAddEventListener', (e) => sendMessages(parseEvent(e.detail)));
    // root.addEventListener('SvelteDOMRemoveEventListener',(e) => sendMessages(parseEvent(e.detail)));
    // root.addEventListener('SvelteDOMSetProperty', (e) => sendMessages(parseEvent(e.detail)));
    // root.addEventListener('SvelteDOMSetAttribute', (e) => sendMessages(parseEvent(e.detail)));
    // root.addEventListener('SvelteDOMRemoveAttribute', (e) => sendMessages(parseEvent(e.detail)));
  };

  // setTimeout(() => setupListeners(window.document));



  // window.addEventListener(
  //   "message",
  //   (messageEvent) => {
  //     if (messageEvent.data.body === 'TIME_TRAVEL') {
  //       const i = messageEvent.data.ctxIndex;
  //       lastIndex = i;
  //       if (cacheState[i]) {
  //         cacheState[i].forEach((componentState) => {
  //           componentState[0].$inject_state(componentState[1])
  //         })
  //       }
  //     }
  //   },
  //   false
  // );
  })();
  

