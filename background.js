

chrome.runtime.onInstalled.addListener(()=>{
    // console.log("This is coming from the background.js");

    //right click Svelcro devtools context menu option
    chrome.contextMenus.create({
        "id" : "Svelcro",
        "title" : "Svelcro DevTools",
        "contexts" : ["all"]
    })

    
    
    chrome.runtime.onMessage.addListener((msg, sender, response)=> {
        console.log('recieved at BACKGROUND.JS');
      
        // Recieves msg body from DEVTOOLSscripts
        if(msg){
          console.log('Data from Dev Tool');
        //   const { header } = msg;
    
          console.log('header:',msg);
    
        //   chrome.runtime.sendMessage({header: "from Dev tools to background to ???"});
        // MING TEST

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {header: msg}, function(response) {
                console.log(response);
                });
            });
        }
        
        return true;
    })

    // chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    //     if (changeInfo.url) {
    //         console.log(changeInfo.url)
    //         var hostname = new URL(changeInfo.url).hostname;
    //         sendMessage(tabId, hostname)
    
    //     }
    // });

})