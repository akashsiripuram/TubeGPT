console.log("TubeGPT background service worker loaded");


chrome.runtime.onInstalled.addListener(() => {

    chrome.sidePanel
        .setPanelBehavior({
            openPanelOnActionClick: true
        })
        .then(() => {

            console.log(
                "TubeGPT: Side panel behavior configured"
            );

        })
        .catch((error) => {

            console.error(
                "TubeGPT: Failed to configure side panel:",
                error
            );

        });

});