
// console.log('contentScript chrome/runtime.id: ',chrome.runtime.id);
let extensionURL = document.querySelector('#injected-script').src;
let editorExtensionId = extensionURL.slice( 19 ,extensionURL.lastIndexOf('/'));
// console.log('Test: ', extensionURL);
// console.log('Lastindex: ',extensionURL.lastIndexOf('/'));
// console.log(extensionURL.slice( 19 ,extensionURL.lastIndexOf('/')))
(function () { 
  'use strict';

  const components = [];

  // MING TEST
  window.document.addEventListener("click", function(){
    
  }, true)


  // object to hold render counts by component
  // const compCounts = {};
  let nextId = 1;
  // MING TEST
  // Proxy object that trigger function when property values are changed
  let compCounts = new Proxy({}, {
    set: function (target, key, value) {
        console.log(`${key} set to ${value}`);
        target[key] = value;

        // console.log(target)
        // Send render count records to dev Tools
        let editorExtensionId = extensionURL.slice( 19 ,extensionURL.lastIndexOf('/'));
        chrome.runtime.sendMessage(editorExtensionId, { body: 'UPDATE_RENDER', data: JSON.stringify(target)});
        return true;
    }
  });
  // Object to track instances of components
  const compInstance = new Proxy({}, {
    set: function (target, key, value) {
        target[key] = value;

        // Send render count records to dev Tools
        let editorExtensionId = extensionURL.slice( 19 ,extensionURL.lastIndexOf('/'));
        // console.log('extension id', editorExtensionId)
        chrome.runtime.sendMessage(editorExtensionId, { body: "UPDATE_INSTANCE", data: JSON.stringify(target), components: JSON.stringify(components) });
        return true;
    }
  });
  let compTimes = new Proxy({}, {
    set: function (target, key, value) {
        console.log(`${key} set to ${value}`);
        target[key] = value;

        // TIME CHECK MING
        console.log('webpage time record: ', target);

        // Send render times records to dev Tools
        chrome.runtime.sendMessage(editorExtensionId, { body: 'UPDATE_TIMES', data: JSON.stringify(target) });
        return true;
    }
  });
  // let start = window.performance.now();
  // add all Svelte components to array
  let start;
  let first = true;
  window.document.addEventListener('SvelteRegisterComponent', (e) => {
    start = window.performance.now();
    // console.log('component rerendered:', start)
    // console.log('e:', e)
    
    let isFirstAfterUpdate = true;
    
    const { component, tagName } = e.detail;

    component.$$['tag_name'] = tagName;
    component.$$['id'] = tagName + nextId;
    nextId++;
    const curId = component.$$.id;
    compCounts[curId] = 1;
    components.push(e.detail.component)

    // capturing all instance of components
    if(!compInstance[tagName]){
      compInstance[tagName] = 1;
    } else {
      compInstance[tagName] += 1;
    }
    console.log('comp instance in Register Comp: ', compInstance)
    // console.log('is the id there?', component.$$)
    // console.log('components', components)
    // console.log('current components:', component)
    // console.log('event', e)
    if (first) {
      component.$$.on_mount.push(() => {
        let rendertime = window.performance.now() - start;
        const curId = component.$$.id;
        // console.log('component is:', component.$$.id, 'first render is:', window.performance.now() - start);
        compTimes[curId] = parseFloat(rendertime).toFixed(3);
        compCounts[curId] = 1;
      })
    }



    console.log('current components:', component)
    component.$$.before_update.push(() => {
      let time = window.performance.now()
      component.$$.before_update.time = time;
      // start = window.performance.now()
      // const curId = component.$$.ctx[0].id;
      // console.log( tagName, ' ' , component.$$.ctx[0].id, 'beforeUpdate is', window.performance.now());
      // console.log(Date.now())
      // console.log('BEFORE IS:', window.performance.now())
      // if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
      // else compCounts[curId] = 1;

      // console.log("compCounts", compCounts);
    });

    component.$$.after_update.push(() => {
      let now = window.performance.now();
      const curId = component.$$.id;
      // console.log('component is:', curId, 'and current time is:', now)
      let rendertime = now - component.$$.before_update.time;
      // let rendertime = now - component.$$.before_update.time;
      if (isFirstAfterUpdate) { return isFirstAfterUpdate = false;}
    
      // console.log( tagName, ' ' , curId , 'render time is is:', rendertime);
      // console.log(Date.now())
      // console.log('AFTER IS:', window.performance.now())
      //  if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
      // else compCounts[curId] = 1;
      compCounts[curId] += 1;
      compTimes[curId] = parseFloat(rendertime).toFixed(3);
    });

    // INSTANCE
   
    

    // console.log('is the id there?', component.$$)
    // console.log('components', components)
    // console.log('current components:', component)
    // console.log(tagName, ' event', e)

    
    //CONSOLE LOG HERE BC A COMPONENT HAS BEEN RERENDERED
    // console.log('component rerendered:', window.performance.now())
    // console.log('VERY FIRST`:', window.performance.now())
    component.$$.on_mount.push(() => {
      // MING TEST
      console.log(tagName, ' on mount');
      
    });

    component.$$.on_destroy.push(() => {
      // MING TEST
      console.log(tagName, 'on destroy')
      
      // look for component and remove it from the components array
      
      
      compInstance[tagName] -= 1;
      // For render count
      delete compCounts[curId];

    });
    
    component.$$.before_update.push(() => {
      let time = window.performance.now()
      component.$$.before_update.time = time;
      // start = window.performance.now()
      // const curId = component.$$.ctx[0].id;
      // console.log( tagName, ' ' , component.$$.ctx[0].id, 'beforeUpdate is', window.performance.now());
      // console.log(Date.now())
      // console.log('BEFORE IS:', window.performance.now())
      // if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
      // else compCounts[curId] = 1;

      console.log("compCounts before update", compCounts);
    });

    component.$$.after_update.push(() => {
      let now = window.performance.now();
      const curId = component.$$.id;
      // console.log('component is:', curId, 'and current time is:', now)
      let rendertime = now - component.$$.before_update.time;
      // let rendertime = now - component.$$.before_update.time;
      if (isFirstAfterUpdate) { return isFirstAfterUpdate = false;}
    
      // console.log( tagName, ' ' , curId , 'render time is is:', rendertime);
      // console.log(Date.now())
      // console.log('AFTER IS:', window.performance.now())
      //  if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
      // else compCounts[curId] = 1;
      compCounts[curId] += 1;
      console.log("compCounts before update", compCounts)
      
    });


  })



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

  // console.log('INJECTED SCRIPTS');
 
})();
  

