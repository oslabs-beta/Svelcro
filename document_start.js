let editorExtensionId = chrome.runtime.id;

const code = `let editorExtensionId = '${editorExtensionId}';

(function () { 
  'use strict';

  const components = [];

  // object to hold render counts by component
  let nextId = 1;

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

    if (first) {
      component.$$.on_mount.push(() => {
        let rendertime = window.performance.now() - start;
        const curId = component.$$.id;
        compTimes[curId] = parseFloat(rendertime).toFixed(3);
        compCounts[curId] = 1;
      })
    }

    component.$$.before_update.push(() => {
      let time = window.performance.now()
      component.$$.before_update.time = time;
    });

    component.$$.on_destroy.push(() => {
      compInstance[tagName] -= 1;
      // For render count
      delete compCounts[curId];

    });
    
    component.$$.before_update.push(() => {
      let time = window.performance.now()
      component.$$.before_update.time = time;
    });

    component.$$.after_update.push(() => {
      let now = window.performance.now();
      const curId = component.$$.id;
      let rendertime = now - component.$$.before_update.time;
      if (isFirstAfterUpdate) { return isFirstAfterUpdate = false;}

      compCounts[curId] += 1;
      compTimes[curId] = parseFloat(rendertime).toFixed(3);
    });

  })

  window.addEventListener("message", function(event) {
        chrome.runtime.sendMessage(editorExtensionId, 
        { header: "INITIAL_LOAD", compCounts: JSON.stringify(compCounts), compInstance: JSON.stringify(compInstance), compTimes: JSON.stringify(compTimes), compArray: JSON.stringify(components) });
    }, false);
 
})();`

document.documentElement.setAttribute('onreset', code);
document.documentElement.dispatchEvent(new CustomEvent('reset'));


chrome.runtime.onMessage.addListener((msg, sender, response)=> {
    window.postMessage({header : "APP MOUNTED"});
    return true;
})

