// content.js

let rowsToShow = 3; // Default rows to show
let itemsPerRow = 7;
let playlistTitle = "";
let currentPlaylistId = "";
let initialLoad = true;
let playlistContainerId = "watch-later-extension"; // Unique ID for the container

let isAuthenticated = false;

// Helper function to check if we are on the YouTube homepage
function isOnHomepage() {
    return window.location.pathname === "/";
}

// Function to remove the playlist container
function removePlaylist() {
    const existingContainer = document.getElementById(playlistContainerId);
    if (existingContainer) {
        existingContainer.remove();
    }
}

// Function to fetch and inject the playlist (only if on the homepage)
async function fetchAndInjectPlaylistIfNeeded(playlistId) {
    console.log("fetchAndInjectPlaylistIfNeeded...");
    //console.log("isOnHomepage():", isOnHomepage());
    if (isOnHomepage()) {
        await fetchAndInjectPlaylist(playlistId);
    } else {
        removePlaylist(); // Ensure it's removed if we're not on the homepage
    }
}

// Function to fetch video durations
async function fetchVideoDurations(videoIds) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { action: "getVideoDurations", videoIds: videoIds },
            (response) => {
                if (response && response.durations) {
                    resolve(response.durations);
                } else {
                    reject(response ? response.error : "Error fetching video durations");
                }
            }
        );
    });
}

// Function to format duration from ISO 8601 to MM:SS
function formatDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    }
    return null;
}

// Function to fetch and inject the playlist
async function fetchAndInjectPlaylist(playlistId) {
    console.log("fetchAndInjectPlaylist...");
    getStoredSettings().then(() => {
        if (!playlistId) {
            console.error("Playlist ID not available");
            return;
        }
        if (!isAuthenticated) {
            console.log("User not logged in yet.");
            return;
        }
        console.log("fetchAndInjectPlaylist...2");
        chrome.runtime.sendMessage(
            { action: "getPlaylistData", playlistId: playlistId },
            async (response) => {
                if (response && response.data && response.playlistTitle) {
                    const videoIds = response.data.map(item => item.snippet.resourceId.videoId);
                    try {
                        const durations = await fetchVideoDurations(videoIds);
                        injectPlaylist(response.data, playlistId, response.playlistTitle, durations);
                    } catch (error) {
                        console.error("Error fetching video durations:", error);
                        injectPlaylist(response.data, playlistId, response.playlistTitle, {}); // Inject without durations
                    }
                } else {
                    console.error("Error fetching playlist data:", response.error);
                }
            }
        );
    })


}

// Function to create and inject the playlist section
function injectPlaylist(playlistItems, playlistId, title, videoDurations) {
    console.log("Playlist injecting.");
    playlistTitle = title;

    const playlistContainer = document.createElement("div");
    playlistContainer.id = playlistContainerId;

    // Add a heading with the playlist title
    const heading = document.createElement("h2");
    heading.className = "playlist-title";
    heading.textContent = playlistTitle;
    playlistContainer.appendChild(heading);

    if (playlistId === "WL") {
        const warning = document.createElement("p");
        warning.style.color = "red";
        warning.style.fontWeight = "bold";
        warning.textContent = "Warning: The Watch Later playlist is not available because YouTube removed it from their API. You have to follow a tutorial to transfer your watch later videos into a different playlist to see the videos here.";
        playlistContainer.appendChild(warning);
    }

    const videoGrid = document.createElement("div");
    videoGrid.className = "video-grid";
    // Dynamically set grid columns
    videoGrid.style.gridTemplateColumns = `repeat(${itemsPerRow}, minmax(0, 1fr))`; // Adjust minmax as needed
    playlistContainer.appendChild(videoGrid);

    playlistItems.slice(0, rowsToShow * itemsPerRow).forEach((item, index) => { // Only render the initially visible items
        const video = item.snippet;
        if (video && video.thumbnails && video.thumbnails.medium) {
            const videoId = video.resourceId.videoId;
            const duration = videoDurations[videoId];
            const formattedDuration = duration ? formatDuration(duration) : null;

            const videoItem = document.createElement("div");
            videoItem.className = "video-item";
            videoItem.innerHTML = `
                <a href="https://www.youtube.com/watch?v=${videoId}&list=${playlistId}">
                    <div class="thumbnail-container">
                        <img src="${video.thumbnails.medium.url}" alt="${video.title}">
                        ${formattedDuration ? `<span class="video-duration">${formattedDuration}</span>` : ''}
                    </div>
                    <h3 class="video-title">${video.title}</h3>
                    <p class="channel-title">${video.videoOwnerChannelTitle}</p>
                </a>
            `;

            videoGrid.appendChild(videoItem);
        } else {
            console.error("Thumbnail not found for video:", video);
        }
    });

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    // "Show More" button
    const showMoreButton = document.createElement("a");
    showMoreButton.className = "show-more-button";
    showMoreButton.href = `https://www.youtube.com/playlist?list=${playlistId}`;
    showMoreButton.textContent = "Open Playlist";
    buttonContainer.appendChild(showMoreButton);

    // "Show All Playlists" button
    const showAllButton = document.createElement("a");
    showAllButton.className = "show-more-button";
    showAllButton.href = `https://www.youtube.com/feed/playlists`;
    showAllButton.textContent = "Show All Playlists";
    buttonContainer.appendChild(showAllButton);

    // Add the button container to the playlist container
    playlistContainer.appendChild(buttonContainer);

    // Remove any existing playlist container before adding a new one
    removePlaylist();

    // Find the insertion point (e.g., before the "guide" element)
    const guideElement = document.getElementById("guide");
    if (guideElement) {
        guideElement.parentNode.insertBefore(playlistContainer, guideElement);
    } else {
        console.error("Could not find the 'guide' element to inject the playlist.");
    }
}

// Mutation Observer to detect DOM changes (for navigation)
const observer = new MutationObserver((mutations) => {
    if (isOnHomepage()) {
        chrome.storage.sync.get(["selectedPlaylistId"], async (data) => {
            if (data.selectedPlaylistId) {
                currentPlaylistId = data.selectedPlaylistId;
            }
        });

        if (!document.getElementById(playlistContainerId) && currentPlaylistId) {
            fetchAndInjectPlaylistIfNeeded(currentPlaylistId); // Re-inject if it's gone
        }
        //console.log("!document.getElementById(playlistContainerId): ", !document.getElementById(playlistContainerId));
        //console.log("playlistContainerId: ", playlistContainerId);
        //console.log("currentPlaylistId: ", currentPlaylistId);
    } else {
        console.log("Not on the homepage, removing playlist...");
        removePlaylist();
    }
});

// Start observing the document body for changes
observer.observe(document.body, { subtree: true, childList: true });

// Get initial settings and inject after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired in content.js");

    getStoredSettings().then(() => {
        // Check authentication and then inject
        if (isAuthenticated && isOnHomepage() && currentPlaylistId) {
            console.log("Injecting playlist after DOMContentLoaded");
            fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
        } else if (!isAuthenticated) {
            console.log("User not authenticated on DOMContentLoaded.");
        } else if (!isOnHomepage()) {
            console.log("Not on homepage on DOMContentLoaded.");
        }
    });
}
);

async function getStoredSettings() {
    //console.log("getStoredSettings...");
    return new Promise((resolve) => {
        chrome.storage.sync.get(["rowsToShow", "itemsPerRow", "selectedPlaylistId"], (data) => {
            if (data.rowsToShow) {
                rowsToShow = parseInt(data.rowsToShow, 10);
            }
            if (data.itemsPerRow) {
                itemsPerRow = parseInt(data.itemsPerRow, 10);
            }
            if (data.selectedPlaylistId) {
                currentPlaylistId = data.selectedPlaylistId;
            }
            chrome.runtime.sendMessage({ action: "checkAuthStatus" }, (response) => {
                isAuthenticated = response.isAuthenticated;
                resolve(); // Resolve the promise, indicating that the stored settings have been retrieved and the authentication status has been checked.
            });
        });
    });
}


// Listen for messages from the background script (remains largely the same)
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "updateRowsToShow") {
        rowsToShow = parseInt(request.rowsToShow, 10);
        await fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
    } else if (request.action === "updateItemsPerRow") {
        itemsPerRow = parseInt(request.itemsPerRow, 10);
        await fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
    } else if (request.action === "updatePlaylist") {
        currentPlaylistId = request.playlistId;
        await fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
    } else if (request.action === "userAuthenticated") {
        isAuthenticated = true;
        console.log("User authenticated, injecting playlist...");
        if (request.playlistId && isOnHomepage()) {
            currentPlaylistId = request.playlistId;
            await fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
        }
    } else if (request.action === "authenticationSuccess") {
        isAuthenticated = true;

    } else if (request.action === "refreshHomepage") {
        getStoredSettings().then(() => {
            if (isAuthenticated && isOnHomepage() && currentPlaylistId) {
                fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
            }
        })
        // Re-inject the playlist when the homepage is refreshed
        console.log("Refreshing homepage message received, injecting playlist...");

        console.log("rowsToShow:", rowsToShow);
        console.log("itemsPerRow:", itemsPerRow);
    }
});