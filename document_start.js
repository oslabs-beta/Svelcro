let editorExtensionId = chrome.runtime.id;

// const code = `
// let editorExtensionId = '${editorExtensionId}';

// console.log('editorExtensionId:', editorExtensionId);

// (function () { 
//   'use strict';

//   const components = [];

//   // object to hold render counts by component
//   let nextId = 1;
//   // MING TEST
//   // Proxy object that trigger function when property values are changed
//   let compCounts = new Proxy({}, {
//     set: function (target, key, value) {
//         target[key] = value;

//         // console.log(target)
//         // Send render count records to dev Tools
//         chrome.runtime.sendMessage(editorExtensionId, { body: 'UPDATE_RENDER', data: JSON.stringify(target)});
//         return true;
//     }
//   });
//   // Object to track instances of components
//   const compInstance = new Proxy({}, {
//     set: function (target, key, value) {
//         target[key] = value;

//         // Send render count records to dev Tools
//         chrome.runtime.sendMessage(editorExtensionId, { body: "UPDATE_INSTANCE", data: JSON.stringify(target), components: JSON.stringify(components) });
//         return true;
//     }
//   });
//   let compTimes = new Proxy({}, {
//     set: function (target, key, value) {
//         target[key] = value;

//         // TIME CHECK MING
//         console.log('webpage time record: ', target);

//         // Send render times records to dev Tools
//         chrome.runtime.sendMessage(editorExtensionId, { body: 'UPDATE_TIMES', data: JSON.stringify(target) });
//         return true;
//     }
//   });

//   // add all Svelte components to array
//   let start;
//   let first = true;

//   window.document.addEventListener('SvelteRegisterComponent', (e) => {
    
//     start = window.performance.now();
//     // console.log('component rerendered:', start)
//     // console.log('e:', e)
    
//     let isFirstAfterUpdate = true;
    
//     const { component, tagName } = e.detail;

//     component.$$['tag_name'] = tagName;
//     component.$$['id'] = tagName + nextId;
//     nextId++;
//     const curId = component.$$.id;
//     compCounts[curId] = 1;
//     components.push(e.detail.component)

//     // capturing all instance of components
//     if(!compInstance[tagName]){
//       compInstance[tagName] = 1;
//     } else {
//       compInstance[tagName] += 1;
//     }
//     console.log('comp instance in Register Comp: ', compInstance)
//     // console.log('is the id there?', component.$$)
//     // console.log('components', components)
//     // console.log('current components:', component)
//     // console.log('event', e)
//     if (first) {
//       component.$$.on_mount.push(() => {
//         let rendertime = window.performance.now() - start;
//         const curId = component.$$.id;
//         // console.log('component is:', component.$$.id, 'first render is:', window.performance.now() - start);
//         compTimes[curId] = parseFloat(rendertime).toFixed(3);
//         compCounts[curId] = 1;
//       })
//     }

//     console.log('current components:', component)
//     component.$$.before_update.push(() => {
//       let time = window.performance.now()
//       component.$$.before_update.time = time;
//       // start = window.performance.now()
//       // const curId = component.$$.ctx[0].id;
//       // console.log( tagName, ' ' , component.$$.ctx[0].id, 'beforeUpdate is', window.performance.now());
//       // console.log(Date.now())
//       // console.log('BEFORE IS:', window.performance.now())
//       // if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
//       // else compCounts[curId] = 1;

//       // console.log("compCounts", compCounts);
//     });

//     component.$$.after_update.push(() => {
//       let now = window.performance.now();
//       const curId = component.$$.id;
//       // console.log('component is:', curId, 'and current time is:', now)
//       let rendertime = now - component.$$.before_update.time;
//       // let rendertime = now - component.$$.before_update.time;
//       if (isFirstAfterUpdate) { return isFirstAfterUpdate = false;}
    
//       // console.log( tagName, ' ' , curId , 'render time is is:', rendertime);
//       // console.log(Date.now())
//       // console.log('AFTER IS:', window.performance.now())
//       //  if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
//       // else compCounts[curId] = 1;
//       compCounts[curId] += 1;
//       compTimes[curId] = parseFloat(rendertime).toFixed(3);
//     });


//     //CONSOLE LOG HERE BC A COMPONENT HAS BEEN RERENDERED
//     // console.log('component rerendered:', window.performance.now())
//     component.$$.on_mount.push(() => {
//       // MING TEST
//       console.log(tagName, ' on mount');
      
//     });

//     component.$$.on_destroy.push(() => {
//       // MING TEST
//       console.log(tagName, 'on destroy')
      
//       // look for component and remove it from the components array
      
      
//       compInstance[tagName] -= 1;
//       // For render count
//       delete compCounts[curId];

//     });
    
//     component.$$.before_update.push(() => {
//       let time = window.performance.now()
//       component.$$.before_update.time = time;
//       // start = window.performance.now()
//       // const curId = component.$$.ctx[0].id;
//       // console.log( tagName, ' ' , component.$$.ctx[0].id, 'beforeUpdate is', window.performance.now());
//       // console.log(Date.now())
//       // console.log('BEFORE IS:', window.performance.now())
//       // if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
//       // else compCounts[curId] = 1;

//       console.log("compCounts before update", compCounts);
//     });

//     component.$$.after_update.push(() => {
//       let now = window.performance.now();
//       const curId = component.$$.id;
//       // console.log('component is:', curId, 'and current time is:', now)
//       let rendertime = now - component.$$.before_update.time;
//       // let rendertime = now - component.$$.before_update.time;
//       if (isFirstAfterUpdate) { return isFirstAfterUpdate = false;}
    
//       // console.log( tagName, ' ' , curId , 'render time is is:', rendertime);
//       // console.log(Date.now())
//       // console.log('AFTER IS:', window.performance.now())
//       //  if (compCounts.hasOwnProperty(curId)) compCounts[curId] += 1;
//       // else compCounts[curId] = 1;
//       compCounts[curId] += 1;
//       console.log("compCounts before update", compCounts)
      
//     });

//   })

//   // console.log('INJECTED SCRIPTS');
 
// })();
// `

const code = `
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

        // console.log(target)
        // Send render count records to dev Tools
        chrome.runtime.sendMessage(editorExtensionId, { body: 'UPDATE_RENDER', data: JSON.stringify(target)});
        return true;
    }
  });
  // Object to track instances of components
  const compInstance = new Proxy({}, {
    set: function (target, key, value) {
        target[key] = value;
        if (!compInstance) {
          setTimeout(() => {
            chrome.runtime.sendMessage(editorExtensionId, { body: "UPDATE_INSTANCE", data: JSON.stringify(target), components: JSON.stringify(components)});
            compInstanceRan = true;
          }, 7000);
        } else {
          // Send render count records to dev Tools
          chrome.runtime.sendMessage(editorExtensionId, { body: "UPDATE_INSTANCE", data: JSON.stringify(target), components: JSON.stringify(components) });
        }
        return true;
    }
  });
  let compTimes = new Proxy({}, {
    set: function (target, key, value) {
        target[key] = value;

        // TIME CHECK MING
        console.log('webpage time record: ', target);

        // Send render times records to dev Tools
        chrome.runtime.sendMessage(editorExtensionId, { body: 'UPDATE_TIMES', data: JSON.stringify(target) });
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
      console.log("compCounts before update", compCounts)
      
    });

  })

  // console.log('INJECTED SCRIPTS');
  window.addEventListener("message", function(event) {
        const { data } = event.origin;
        // We only accept messages from ourselves
        console.log('data: ',data);
    }, false);
 
})();
`

// var s = document.createElement('script');
// s.setAttribute('id', 'injected-script');

// console.log('CHROME RUNTIME GET URL: ', chrome.runtime.getURL('contentScript.js'));

// // s.appendChild(document.createTextNode(code));
// // s.src = chrome.runtime.getURL('contentScript.js');
// s.onload = function() {
//     // console.log(this);
//     // this.remove();
// };

// document.documentElement.appendChild(s);

// (document.head || document.documentElement).appendChild(s);


// MING TEST

document.documentElement.setAttribute('onreset', code);
document.documentElement.dispatchEvent(new CustomEvent('reset'));
// document.documentElement.removeAttribute('onreset');

chrome.runtime.onMessage.addListener((msg, sender, response)=> {
    
    console.log('document_start.js heard some msg: ', msg);
    window.postMessage({header : "APP MOUNTED"});
    return true;
})

// window.addEventListener("click", function(event) {

//     // We only accept messages from ourselves
//     // console.log('THIS WORKS, RECEIVING IN DOCUMENT_START', event)
//     window.postMessage({header : "self send"});

// }, false);