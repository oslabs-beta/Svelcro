let editorExtensionId = '${editorExtensionId}';

(function () { 
  'use strict';

  const components = [];
  let compInstanceRan = false;

  // object to hold render counts by component
  let nextId = 1;
  // MING TEST
  // Proxy object that trigger function when property values are changed
  let compCounts = new Proxy({}, {
    set: function (target, key, value) {
        target[key] = value;

        chrome.runtime.sendMessage(editorExtensionId, 
          { header: "UPDATE_RENDER", 
            compCounts: JSON.stringify(compCounts), 
            compInstance: JSON.stringify(compInstance), 
            compTimes: JSON.stringify(compTimes), 
            compArray: JSON.stringify(components) 
          });
        return true;
        }
  });
  // Object to track instances of components
  const compInstance = new Proxy({}, {
    set: function (target, key, value) {
      target[key] = value;
      
      // Send render count records to dev Tools
      // chrome.runtime.sendMessage(editorExtensionId, { body: "UPDATE_INSTANCE", data: JSON.stringify(target), components: JSON.stringify(components) });
      chrome.runtime.sendMessage(editorExtensionId, 
        { header: "UPDATE_INSTANCE", 
          compCounts: JSON.stringify(compCounts), 
          compInstance: JSON.stringify(compInstance), 
          compTimes: JSON.stringify(compTimes), 
          compArray: JSON.stringify(components) 
        });
      
      return true;
    }
  });
  let compTimes = new Proxy({}, {
    set: function (target, key, value) {
        target[key] = value;

        chrome.runtime.sendMessage(editorExtensionId, 
          { header: "UPDATE_TIMES", 
            compCounts: JSON.stringify(compCounts), 
            compInstance: JSON.stringify(compInstance), 
            compTimes: JSON.stringify(compTimes), 
            compArray: JSON.stringify(components) 
          });
        return true;
    }
  });

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


    //CONSOLE LOG HERE BC A COMPONENT HAS BEEN RERENDERED
    // console.log('component rerendered:', window.performance.now())
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
      compTimes[curId] = parseFloat(rendertime).toFixed(3);
    });

  })

  // console.log('INJECTED SCRIPTS');
  window.addEventListener("message", function(event) {
        const { header } = event.data;
        // We only accept messages from ourselves
        console.log('injected page - heard message: ', header );

        chrome.runtime.sendMessage(editorExtensionId, 
        { header: "INITIAL_LOAD", compCounts: JSON.stringify(compCounts), compInstance: JSON.stringify(compInstance), compTimes: JSON.stringify(compTimes), compArray: JSON.stringify(components) });
    }, false);
 
})();