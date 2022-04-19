chrome.runtime.onInstalled.addListener(()=>{
    console.log("This is coming from the background.js");

    //right click Svelcro devtools context menu option
    chrome.contextMenus.create({
        "id" : "Svelcro",
        "title" : "Svelcro DevTools",
        "contexts" : ["all"]
    })

    
    
    chrome.runtime.onMessage.addListener((msg, sender, response)=> {
        // console.log('hello', msg);

        if(msg.body){
            
            const { body } = msg;
            console.log('recieving at background! Coming from ', body);
            console.log('next step?')
            response({
                body: "background content"
            });

        }
        return true;
    })

})