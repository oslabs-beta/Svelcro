
chrome.devtools.panels.create('Svelcro', 'callback','panel.html')




chrome.devtools.panels.elements.createSidebarPane("My Sidebar",
    function(sidebar) {
        // sidebar initialization code here
        sidebar.setObject({ some_data: "Some data to show" });
        // sidebar.setPage("sidebar.html");
        // sidebar.setHeight("8ex");
})