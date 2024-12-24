// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const authButton = document.getElementById('auth-button');
    const playlistsContainer = document.getElementById('playlists-container');
    const playlistSelect = document.getElementById('playlist-select');
    const updatePlaylistButton = document.getElementById('update-playlist');
    const seeAllPlaylistsButton = document.getElementById('see-all-playlists');

    authButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "authenticate" });
    });

    // Handle "Use This Playlist" button click
    updatePlaylistButton.addEventListener('click', () => {
        const selectedPlaylistId = playlistSelect.value;
        const selectedPlaylistName = playlistSelect.options[playlistSelect.selectedIndex].text;

        chrome.runtime.sendMessage({ action: "updatePlaylistId", playlistId: selectedPlaylistId }, (response) => {
            if (response.status === "Playlist ID updated") {
                alert(`Playlist updated to: ${selectedPlaylistName}`);
                // Update the content script to use the new playlist
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "updatePlaylist",
                        playlistId: selectedPlaylistId,
                    });
                });
            } else {
                alert("Failed to update playlist.");
            }
        });
    });

    // Handle "See All Playlists" button click
    seeAllPlaylistsButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Check if user is already authenticated
    chrome.runtime.sendMessage({ action: "getPlaylists" }, (response) => {
        if (response.data) {
            // User is authenticated, show playlists
            authButton.style.display = 'none';
            playlistsContainer.style.display = 'block';
            populatePlaylistSelect(response.data);
        } else {
            // User is not authenticated, show auth button
            authButton.style.display = 'block';
            playlistsContainer.style.display = 'none';
        }
    });
});

function populatePlaylistSelect(playlists) {
    const playlistSelect = document.getElementById('playlist-select');
    playlists.forEach(playlist => {
        const option = document.createElement('option');
        option.value = playlist.id;
        option.textContent = playlist.snippet.title;
        playlistSelect.appendChild(option);
    });
}