
//right click Svelcro devtools context menu option
chrome.contextMenus.create({
    "id" : "Svelcro",
    "title" : "Svelcro DevTools",
    "contexts" : ["all"]
})

//Where we should put open dev tools option
// chrome.contextMenus.onClicked.addListener((info, tab) => {
//     alert(Object.keys(info))
// }) 


// Regex-pattern to check URLs against. 
// It matches URLs like: http[s]://[...]stackoverflow.com[...]
var urlRegex =  /([\d\w-.]+?\.(a[cdefgilmnoqrstuwz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvxyz]|d[ejkmnoz]|e[ceghrst]|f[ijkmnor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eouw]|s[abcdeghijklmnortuvyz]|t[cdfghjkmnoprtvwz]|u[augkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]|aero|arpa|biz|com|coop|edu|info|int|gov|mil|museum|name|net|org|pro)(\b|\W(?<!&|=)(?!\.\s|\.{3}).*?))(\s|$)/;

 // /([\d\w-.]+?\.(a[cdefgilmnoqrstuwz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvxyz]|d[ejkmnoz]|e[ceghrst]|f[ijkmnor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eouw]|s[abcdeghijklmnortuvyz]|t[cdfghjkmnoprtvwz]|u[augkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]|aero|arpa|biz|com|coop|edu|info|int|gov|mil|museum|name|net|org|pro)(\b|\W(?<!&|=)(?!\.\s|\.{3}).*?))(\s|$)/

// A function to use as callback
// function doStuffWithDom(domContent) {
//     console.log('I received the following DOM content:\n' + domContent);
// }

// When the browser-action button is clicked...
// chrome.browserAction.onClicked.addListener(function (tab) {
//     // ...check the URL of the active tab against our pattern and...
//     if (urlRegex.test(tab.url)) {
//         // ...if it matches, send a message specifying a callback too
//         chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, doStuffWithDom);
//     }
// });

// MING TEST AREA

// chrome.runtime.onMessage.addListener((msg, sender, response) => {
//     console.log('???')
//     if (msg.name == "test message") {
//         response({text: 'AHHHHHHHHHHH'});
//     }

//     return true;

// })

function handleMessage(request, sender, sendResponse) {

    console.log("Message from the content script: " + request.greeting);

    console.log(request.greeting);

    sendResponse({response: "Response from background script"});


}
  
chrome.runtime.onMessage.addListener(handleMessage);

// chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
//     // let answer = passed => { console.log(passed); return 'read' };
   
//     // sendResponse(response);

//     console.log(request);

//     alert(request);

//     // return true;
// });