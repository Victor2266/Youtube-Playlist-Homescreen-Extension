// content.js

let rowsToShow = 3; // Default rows to show
let itemsPerRow = 7;
let playlistTitle = "";
let currentPlaylistId = "";
let initialLoad = true;
let playlistContainerId = "watch-later-extension"; // Unique ID for the container

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
function fetchAndInjectPlaylistIfNeeded(playlistId) {
    if (isOnHomepage()) {
        fetchAndInjectPlaylist(playlistId);
    } else {
        removePlaylist(); // Ensure it's removed if we're not on the homepage
    }
}

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
        warning.textContent = "Warning: The Watch Later playlist is not available because YouTube removed it from their API.";
        playlistContainer.appendChild(warning);
    }

    const videoGrid = document.createElement("div");
    videoGrid.className = "video-grid";
    playlistContainer.appendChild(videoGrid);

    playlistItems.forEach((item, index) => {
        const video = item.snippet;
        if (video && video.thumbnails && video.thumbnails.medium) {
            const videoItem = document.createElement("div");
            videoItem.className = "video-item";
            videoItem.innerHTML = `
                <a href="https://www.youtube.com/watch?v=${video.resourceId.videoId}&list=${playlistId}">
                    <img src="${video.thumbnails.medium.url}" alt="${video.title}">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="channel-title">${video.videoOwnerChannelTitle}</p>
                </a>
            `;

            if (index >= rowsToShow * itemsPerRow) {
                videoItem.style.display = "none";
            }

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
        if (!document.getElementById(playlistContainerId) && currentPlaylistId) {
            fetchAndInjectPlaylistIfNeeded(currentPlaylistId); // Re-inject if it's gone
        }
    } else {
        removePlaylist();
    }
});

// Start observing the document body for changes
observer.observe(document.body, { subtree: true, childList: true });

// Get initial settings from storage and inject if on homepage
chrome.storage.sync.get(["rowsToShow", "itemsPerRow", "selectedPlaylistId", "playlistId"], (data) => {
    if (data.rowsToShow) {
        rowsToShow = data.rowsToShow;
    }
    if (data.itemsPerRow) {
        itemsPerRow = data.itemsPerRow;
    }
    if (data.selectedPlaylistId) {
        currentPlaylistId = data.selectedPlaylistId;
    } else if (data.playlistId) {
        currentPlaylistId = data.playlistId;
    }

    if (currentPlaylistId) {
        fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
    } else {
        // In case playlistId is not available, particularly for the first-time users
        chrome.runtime.sendMessage({ action: "getPlaylistId" }, (response) => {
            if (response && response.playlistId) {
                currentPlaylistId = response.playlistId;
                fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
            }
        });
    }
});

// Check authentication status on page load
chrome.runtime.sendMessage({ action: "checkAuthStatus" }, (response) => {
    if (response.isAuthenticated) {
        chrome.runtime.sendMessage({ action: "getPlaylistId" }, (response) => {
            if (response && response.playlistId) {
                currentPlaylistId = response.playlistId;
                fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
            }
        });
    } else {
        console.log("User is not authenticated. Awaiting authentication.");
    }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateRowsToShow") {
        rowsToShow = request.rowsToShow;
        fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
    } else if (request.action === "updateItemsPerRow") {
        itemsPerRow = request.itemsPerRow;
        fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
    } else if (request.action === "updatePlaylist") {
        currentPlaylistId = request.playlistId;
        fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
    } else if (request.action === "userAuthenticated") {
        if (request.playlistId) {
            currentPlaylistId = request.playlistId;
            fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
        }
    }
});

// Listen for URL changes (though MutationObserver is more reliable for SPA)
window.addEventListener('popstate', () => {
    fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
});

window.addEventListener('pushstate', () => {
    fetchAndInjectPlaylistIfNeeded(currentPlaylistId);
});