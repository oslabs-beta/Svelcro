var s = document.createElement('script');
s.setAttribute('id', 'injected-script');
s.src = chrome.runtime.getURL('contentScript.js');
s.onload = function() {
    // console.log(this);
    this.remove();
};
(document.head || document.documentElement).appendChild(s);

