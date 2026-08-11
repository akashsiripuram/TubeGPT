// =====================================================
// ELEMENTS
// =====================================================

const ingestBtn =
    document.getElementById("ingestBtn");

const askBtn =
    document.getElementById("askBtn");

const questionInput =
    document.getElementById("question");

const answerElement =
    document.getElementById("answer");

const answerSection =
    document.getElementById("answerSection");

const loading =
    document.getElementById("loading");

const loadingText =
    document.getElementById("loadingText");

const videoStatus =
    document.getElementById("videoStatus");


// =====================================================
// BACKEND URL
// =====================================================

const BACKEND_URL =
    "http://127.0.0.1:8000";


// =====================================================
// GET CURRENT TAB
// =====================================================

async function getCurrentTab() {

    const tabs =
        await chrome.tabs.query({
            active: true,
            currentWindow: true
        });


    const tab =
        tabs[0];


    if (!tab) {

        throw new Error(
            "Could not find the current tab."
        );

    }


    return tab;

}


// =====================================================
// GET CURRENT VIDEO ID
// =====================================================

async function getCurrentVideoId() {

    const tab =
        await getCurrentTab();


    if (!tab.url) {

        throw new Error(
            "Could not get the current tab URL."
        );

    }


    if (
        !tab.url.includes(
            "youtube.com/watch"
        )
    ) {

        throw new Error(
            "Please open a YouTube video first."
        );

    }


    const url =
        new URL(tab.url);


    const videoId =
        url.searchParams.get("v");


    if (!videoId) {

        throw new Error(
            "Could not find YouTube video ID."
        );

    }


    return videoId;

}


// =====================================================
// CHECK CURRENT VIDEO
// =====================================================

async function updateVideoStatus() {

    try {

        const videoId =
            await getCurrentVideoId();


        videoStatus.innerText =
            `Video: ${videoId}`;

        console.log(
            "TubeGPT current video:",
            videoId
        );


    } catch (error) {

        videoStatus.innerText =
            "Open a YouTube video";

        questionInput.disabled =
            true;

        askBtn.disabled =
            true;

    }

}


// =====================================================
// INITIALIZE
// =====================================================

updateVideoStatus();


// =====================================================
// UPDATE WHEN USER CHANGES TAB
// =====================================================

chrome.tabs.onActivated.addListener(
    () => {

        updateVideoStatus();

    }
);


// =====================================================
// UPDATE WHEN CURRENT TAB URL CHANGES
// =====================================================

chrome.tabs.onUpdated.addListener(
    (tabId, changeInfo, tab) => {

        if (
            changeInfo.url ||
            changeInfo.status === "complete"
        ) {

            updateVideoStatus();

        }

    }
);


// =====================================================
// INGEST VIDEO
// =====================================================

ingestBtn.addEventListener(
    "click",
    async () => {

        try {

            // -----------------------------------------
            // Disable controls
            // -----------------------------------------

            ingestBtn.disabled =
                true;

            askBtn.disabled =
                true;

            questionInput.disabled =
                true;


            // -----------------------------------------
            // Show loading
            // -----------------------------------------

            loading.classList.remove(
                "hidden"
            );


            loadingText.innerText =
                "Analyzing video...";


            videoStatus.innerText =
                "Processing transcript...";


            // -----------------------------------------
            // Get video ID
            // -----------------------------------------

            const videoId =
                await getCurrentVideoId();


            console.log(
                "TubeGPT: Ingesting video:",
                videoId
            );


            // -----------------------------------------
            // Call FastAPI /ingest
            // -----------------------------------------

            const response =
                await fetch(
                    `${BACKEND_URL}/ingest`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            video_id:
                                videoId
                        })
                    }
                );


            // -----------------------------------------
            // Check response
            // -----------------------------------------

            if (!response.ok) {

                const errorText =
                    await response.text();


                throw new Error(
                    `Ingestion failed (${response.status}): ${errorText}`
                );

            }


            // -----------------------------------------
            // Read response
            // -----------------------------------------

            const data =
                await response.json();


            console.log(
                "TubeGPT: Ingestion response:",
                data
            );


            // -----------------------------------------
            // Success
            // -----------------------------------------

            videoStatus.innerText =
                "✓ Video ready";


            questionInput.disabled =
                false;


            askBtn.disabled =
                false;


            questionInput.placeholder =
                "What is this video about?";


        } catch (error) {

            console.error(
                "TubeGPT ingestion error:",
                error
            );


            videoStatus.innerText =
                "✕ Failed to analyze video";


            answerElement.innerText =
                "Error: " + error.message;


            answerSection.classList.remove(
                "hidden"
            );


        } finally {

            loading.classList.add(
                "hidden"
            );


            ingestBtn.disabled =
                false;

        }

    }
);


// =====================================================
// ASK QUESTION
// =====================================================

askBtn.addEventListener(
    "click",
    async () => {

        const question =
            questionInput.value.trim();


        if (!question) {

            return;

        }


        try {

            // -----------------------------------------
            // Disable controls
            // -----------------------------------------

            askBtn.disabled =
                true;

            ingestBtn.disabled =
                true;


            // -----------------------------------------
            // Loading
            // -----------------------------------------

            loading.classList.remove(
                "hidden"
            );


            loadingText.innerText =
                "Thinking...";


            answerSection.classList.add(
                "hidden"
            );


            answerElement.innerText =
                "";


            // -----------------------------------------
            // Get video ID
            // -----------------------------------------

            const videoId =
                await getCurrentVideoId();


            console.log(
                "TubeGPT: Asking about:",
                videoId
            );


            // -----------------------------------------
            // Call FastAPI /ask
            // -----------------------------------------

            const response =
                await fetch(
                    `${BACKEND_URL}/ask`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            video_id:
                                videoId,

                            question:
                                question
                        })
                    }
                );


            // -----------------------------------------
            // Check response
            // -----------------------------------------

            if (!response.ok) {

                const errorText =
                    await response.text();


                throw new Error(
                    `Question failed (${response.status}): ${errorText}`
                );

            }


            // -----------------------------------------
            // Read response
            // -----------------------------------------

            const data =
                await response.json();


            console.log(
                "TubeGPT: Answer:",
                data
            );


            // -----------------------------------------
            // Display answer
            // -----------------------------------------

            answerElement.innerText =
                data.answer;


            answerSection.classList.remove(
                "hidden"
            );


        } catch (error) {

            console.error(
                "TubeGPT question error:",
                error
            );


            answerElement.innerText =
                "Error: " + error.message;


            answerSection.classList.remove(
                "hidden"
            );


        } finally {

            loading.classList.add(
                "hidden"
            );


            askBtn.disabled =
                false;


            ingestBtn.disabled =
                false;

        }

    }
);


// =====================================================
// CTRL + ENTER
// =====================================================

questionInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            if (!askBtn.disabled) {

                askBtn.click();

            }

        }

    }
);