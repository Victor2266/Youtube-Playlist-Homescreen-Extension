// options.js

document.addEventListener("DOMContentLoaded", () => {
    const rowsSelect = document.getElementById("rows-select");
    const itemsPerRowSelect = document.getElementById("items-per-row-select");
    const maxItemsSelect = document.getElementById("max-items-select");
    const playlistsList = document.getElementById("playlists-list");

    // Load current settings
    chrome.storage.sync.get(["rowsToShow", "itemsPerRow", "maxItemsToShow"], (data) => {
        rowsSelect.value = data.rowsToShow || "1"; // Default to 1
        itemsPerRowSelect.value = data.itemsPerRow || "7"; // Default to 7
        maxItemsSelect.value = data.maxItemsToShow || "30"; // Default to 30

        /*
        // Fetch and display playlists immediately after loading settings
        chrome.runtime.sendMessage({ action: "getPlaylists" }, (response) => {
            if (response.data) {
                console.log("Playlists:", response.data); // Corrected console log
                displayPlaylists(response.data);
            } else {
                console.error("Error fetching playlists:", response.error);
            }
        });*/
    });

    // Save settings when changed
    rowsSelect.addEventListener("change", () => {
        chrome.storage.sync.set({ rowsToShow: rowsSelect.value });
    });

    itemsPerRowSelect.addEventListener("change", () => {
        chrome.storage.sync.set({ itemsPerRow: itemsPerRowSelect.value });
    });

    maxItemsSelect.addEventListener("change", () => {
        chrome.storage.sync.set({ maxItemsToShow: maxItemsSelect.value });
    });

    function displayPlaylists(playlists) {
        playlistsList.innerHTML = ""; // Clear existing list

        playlists.forEach((playlist) => {
            const listItem = document.createElement("li");
            listItem.textContent = `${playlist.snippet.title} (ID: ${playlist.id})`;
            playlistsList.appendChild(listItem);
        });
    }
});
