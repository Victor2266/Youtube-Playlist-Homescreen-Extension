
// content.js

let rowsToShow = 3; // Default rows to show
let itemsPerRow = 7;
let playlistTitle = "";
let currentPlaylistId = "";
let initialLoad = true;

// Get initial settings from storage
chrome.storage.sync.get(["rowsToShow", "itemsPerRow", "selectedPlaylistId", "playlistId"], (data) => {
    if (data.rowsToShow) {
        rowsToShow = data.rowsToShow;
    }
    if(data.itemsPerRow){
        itemsPerRow = data.itemsPerRow;
    }
    if (data.selectedPlaylistId) {
        currentPlaylistId = data.selectedPlaylistId;
        fetchAndInjectPlaylist(currentPlaylistId);
    } else if (data.playlistId) {
        currentPlaylistId = data.playlistId;
        fetchAndInjectPlaylist(currentPlaylistId);
    } else {
        // In case playlistId is not available, particularly for the first-time users
        chrome.runtime.sendMessage({ action: "getPlaylistId" }, (response) => {
            if (response && response.playlistId) {
                currentPlaylistId = response.playlistId;
                fetchAndInjectPlaylist(currentPlaylistId);
            }
        });
    }
});

// Function to fetch and inject the playlist
function fetchAndInjectPlaylist(playlistId) {
    if (!playlistId) {
        console.error("Playlist ID not available");
        return;
    }

    chrome.runtime.sendMessage(
        { action: "getPlaylistData", playlistId: playlistId },
        (response) => {
            if (response && response.data && response.playlistTitle) {
                injectPlaylist(response.data, playlistId, response.playlistTitle);
            } else {
                console.error("Error fetching playlist data:", response.error);
            }
        }
    );
}

// Function to create and inject the playlist section
function injectPlaylist(playlistItems, playlistId, title) {
    playlistTitle = title;

    const playlistContainer = document.createElement("div");
    playlistContainer.id = "watch-later-extension";

    // Add a heading with the playlist title
    const heading = document.createElement("h2");
    heading.className = "playlist-title";
    heading.textContent = playlistTitle;
    playlistContainer.appendChild(heading);

    const videoGrid = document.createElement("div");
    videoGrid.className = "video-grid";
    playlistContainer.appendChild(videoGrid);

    playlistItems.forEach((item, index) => {
        console.log("Processing item:", item);
        const video = item.snippet;
        console.log("Video snippet:", video);

        if (video.thumbnails && video.thumbnails.medium) {
            console.log("Thumbnail URL:", video.thumbnails.medium.url);

            const videoItem = document.createElement("div");
            videoItem.className = "video-item";
            videoItem.innerHTML = `
                <a href="https://www.youtube.com/watch?v=${video.resourceId.videoId}&list=${playlistId}">
                    <img src="${video.thumbnails.medium.url}" alt="${video.title}">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="channel-title">${video.videoOwnerChannelTitle}</p>
                </a>
            `;

            console.log("Video item created:", videoItem);

            if (index >= rowsToShow * itemsPerRow) {
                videoItem.style.display = "none";
            }

            videoGrid.appendChild(videoItem);
            console.log("Video item appended to videoGrid");
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
    showMoreButton.textContent = "Open This Playlist";
    showMoreButton.target = "_blank";
    buttonContainer.appendChild(showMoreButton);

    // "Show All Playlists" button
    const showAllButton = document.createElement("a");
    showAllButton.className = "show-more-button";
    showAllButton.href = `https://www.youtube.com/feed/playlists`;
    showAllButton.textContent = "Show All Playlists";
    showAllButton.target = "_blank";
    buttonContainer.appendChild(showAllButton);

    // Add the button container to the playlist container
    playlistContainer.appendChild(buttonContainer);
    // Remove any existing playlist container before adding a new one
    const existingContainer = document.getElementById("watch-later-extension");
    if (existingContainer) {
        existingContainer.remove();
    }

    // Find the insertion point (e.g., before the "guide" element)
    const guideElement = document.getElementById("guide");
    if (guideElement) {
        guideElement.parentNode.insertBefore(playlistContainer, guideElement);
    } else {
        console.error("Could not find the 'guide' element to inject the playlist.");
    }
}
// Check authentication status on page load
chrome.runtime.sendMessage({ action: "checkAuthStatus" }, (response) => {
    if (response.isAuthenticated) {
        // User is authenticated, get the playlist ID and fetch data
        chrome.runtime.sendMessage({ action: "getPlaylistId" }, (response) => {
            if (response && response.playlistId) {
                fetchAndInjectPlaylist(response.playlistId)
            }
        });
    } else {
        // User is not authenticated. Do nothing or display a message on the page
        console.log("User is not authenticated. Awaiting authentication.");
    }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateRowsToShow") {
        rowsToShow = request.rowsToShow;
        fetchAndInjectPlaylist(currentPlaylistId);
    } else if (request.action === "updateItemsPerRow") {
        itemsPerRow = request.itemsPerRow;
        fetchAndInjectPlaylist(currentPlaylistId);
    } else if (request.action === "updatePlaylist") {
        fetchAndInjectPlaylist(request.playlistId);
    } else if (request.action === "userAuthenticated") {
        // User has been authenticated, fetch data now
        if (request.playlistId) {
            currentPlaylistId = request.playlistId;
            fetchAndInjectPlaylist(currentPlaylistId);
        }
    }
});