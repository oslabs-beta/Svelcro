

chrome.runtime.onInstalled.addListener(()=>{
    //right click Svelcro devtools context menu option
    chrome.contextMenus.create({
        "id" : "Svelcro",
        "title" : "Svelcro DevTools",
        "contexts" : ["all"]
    })

    chrome.runtime.onMessage.addListener((msg, sender, response)=> {
      // Recieves msg body from DEVTOOLSscripts
      if(msg){
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {header: msg}, function(response) {});
          });
      }
      return true;
    })

})