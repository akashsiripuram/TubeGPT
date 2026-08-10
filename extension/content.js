document
    .getElementById("askBtn")
    .addEventListener("click", async () => {

        const question =
            document.getElementById("question").value;

        if (!question.trim()) {
            return;
        }

        const answerElement =
            document.getElementById("answer");

        const loading =
            document.getElementById("loading");

        loading.style.display = "block";
        answerElement.innerText = "";

        try {

            const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            const tab = tabs[0];

            const videoUrl = tab.url;

            if (!videoUrl.includes("youtube.com/watch")) {
                throw new Error(
                    "Please open a YouTube video first."
                );
            }

            const response = await fetch(
                "http://127.0.0.1:8000/ask",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        video_url: videoUrl,
                        question: question
                    })
                }
            );

            const data = await response.json();

            answerElement.innerText =
                data.answer;

        } catch (error) {

            answerElement.innerText =
                "Error: " + error.message;

        } finally {

            loading.style.display = "none";

        }

    });