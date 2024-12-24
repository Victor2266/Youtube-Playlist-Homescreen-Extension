// options.js

document.addEventListener("DOMContentLoaded", () => {
    const rowsSelect = document.getElementById("rows-select");
    const itemsPerRowSelect = document.getElementById("items-per-row-select");
    const playlistsList = document.getElementById("playlists-list");

    // Load current settings
    chrome.storage.sync.get(["rowsToShow", "itemsPerRow"], (data) => {
        rowsSelect.value = data.rowsToShow || "1"; // Default to 1
        itemsPerRowSelect.value = data.itemsPerRow || "7"; // Default to 7
    });

    // Save settings when changed
    rowsSelect.addEventListener("change", () => {
        chrome.storage.sync.set({ rowsToShow: rowsSelect.value });
    });

    itemsPerRowSelect.addEventListener("change", () => {
        chrome.storage.sync.set({ itemsPerRow: itemsPerRowSelect.value });
    });

    // Fetch and display playlists
    chrome.runtime.sendMessage({ action: "getPlaylists" }, (response) => {
        if (response.data) {
            console.log("Playlists:", playlists);
            displayPlaylists(response.data);
        } else {
            console.error("Error fetching playlists:", response.error);
        }
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

