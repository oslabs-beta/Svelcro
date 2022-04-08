console.log('SUPPLIES !!!!');

// console.log('chrome: ', chrome);

// console.log('chrome.dom: ', chrome.dom);
//should the listener be in the background.js?? I HAVE no idea(Ming)




// Listen for messages
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  console.log('messages?')
  // If the received message has the expected format...
  if (msg.text === 'report_back') {
      // Call the specified callback, passing
      // the web-page's DOM content as argument
      sendResponse(document.all[0].outerHTML);
      
  }
});

//do we need to connect via port? 
// let port = chrome.runtime.connect();

// MING TEST AREA
// Send Message to Background
// chrome.runtime.sendMessage({name: "test message"}, async (response) => {

//   console.log('WHY?!');

//   const body = document.querySelector('body');

//   console.log(body);
  
//   // await response;
//   await console.log(response);
//   // console.log(response.text);

// })

const body = document.querySelector('body');


let getDOM = () => {

  const body = document.querySelector('body');
  console.log(body);
  return body;

}

chrome.devtools.inspectedWindow.getResources(function(resources) {
  console.log(resources)
})




// setInterval( getDOM , 2500);

// chrome.runtime.sendMessage('hello world');