// let getDOM = () => {

//   const body = document.querySelector('body');
//   // console.log(body);
//   return body;

// }

// let sending = chrome.runtime.sendMessage({
//   greeting: "Greeting from the content script"
// });
// function start() {
//   startTime = new Date();
// }
// function end() {

// }
// const svelteComponents = document.querySelectorAll(`[class^="svelte"]`)

// var mutationObserver = new MutationObserver(function(mutations) {
//   // console.log('mutation: ', mutations);

//   let HTMLbody = getDOM().outerHTML

//   // Everytime the DOM mutates, Send to background the body
//   chrome.runtime.sendMessage({
//     body: HTMLbody
//   });

//   // TESTING SVELTE CAPTURE

//   mutations.forEach(function(mutation) {
//     console.log(mutation.target);
//   });
// });

// mutationObserver.observe(svelteComponents, {
//   // attributes: true,
//   // characterData: true,
//   childList: true,
//   subtree: true,
//   // attributeOldValue: true,
//   // characterDataOldValue: true
// });

// // TEST
