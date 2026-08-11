console.log("=================================");
console.log("TubeGPT content.js loaded");
console.log("Current URL:", window.location.href);
console.log("=================================");


let currentVideoId = null;


function getVideoId() {

    const url =
        new URL(window.location.href);

    return url.searchParams.get("v");

}


function checkVideoChange() {

    // Only work on YouTube watch pages
    if (
        !window.location.href.includes(
            "youtube.com/watch"
        )
    ) {
        return;
    }


    const videoId =
        getVideoId();


    if (!videoId) {
        return;
    }


    // Don't log the same video repeatedly
    if (videoId === currentVideoId) {
        return;
    }


    currentVideoId =
        videoId;


    console.log(
        "TubeGPT current video:",
        videoId
    );

}


// Run when script loads
checkVideoChange();


// YouTube is a SPA, so check for URL changes
setInterval(
    checkVideoChange,
    1000
);