let getDOM = () => {

  const body = document.querySelector('body');
  // console.log(body);
  return body;

}

let sending = chrome.runtime.sendMessage({
  greeting: "Greeting from the content script"
});

var mutationObserver = new MutationObserver(function(mutations) {
  console.log('mutation: ', mutations);

  let HTMLbody = getDOM().outerHTML

  // Everytime the DOM mutates, Send to background the body
  chrome.runtime.sendMessage({
    body: HTMLbody
  });

  // TESTING SVELTE CAPTURE
  // const svelteComponets = document.querySelectorAll(`[class^="svelte"]`)
  // console.log(svelteComponets);

  // mutations.forEach(function(mutation) {
  //   console.log(mutation);
  // });
});

mutationObserver.observe(document.documentElement, {
  // attributes: true,
  // characterData: true,
  childList: true,
  subtree: true,
  // attributeOldValue: true,
  // characterDataOldValue: true
});

// TEST

// const svelteComponets = document.querySelectorAll(`[class^="svelte"]`)
// console.log(svelteComponets);