// background.js

let userToken = null;
let selectedPlaylistId = null; // User-selected playlist ID
let watchLaterPlaylistId = "WL";
let watchLaterItems = [];

// Load any previously saved settings
chrome.storage.sync.get(["selectedPlaylistId", "rowsToShow", "playlistId"], (data) => {
    if (data.selectedPlaylistId) {
        selectedPlaylistId = data.selectedPlaylistId;
    }
    if(data.playlistId){
        watchLaterPlaylistId = data.playlistId;
    }
});

// Handle OAuth 2.0 flow
function authenticateUser() {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
        if (chrome.runtime.lastError) {
            console.error("Authentication error:", chrome.runtime.lastError.message);
            return;
        }

        userToken = token;
        console.log("User authenticated:", userToken);

        fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${userToken}`)
            .then(response => response.json())
            .then(data => {
                console.log("Token Info:", data);
            })
            .catch(error => console.error("Error fetching token info:", error));

        // Fetch all playlists to find the watch later playlist.
        fetchUserPlaylists()
            .then(playlists => {
                 console.log("Playlists fetched:", playlists);
                return getWatchLaterPlaylistId();
            })
            .then(id => {
                if (id) {
                  watchLaterPlaylistId = id;
                    console.log("Watch Later playlist ID:", watchLaterPlaylistId);

                      // After getting watch later ID fetch Watch Later Items
                  return fetchPlaylistItems(watchLaterPlaylistId);
                } else {
                    console.error("Could not find Watch Later playlist.");
                }
            })
           .then(items => {
                  if(items){
                       watchLaterItems = items;
                    notifyContentScript();
                }

            })
            .catch(error => {
                console.error("Error fetching or processing playlists:", error);
            });
    });
}

// Find "Watch Later" playlist ID
/*
function getWatchLaterPlaylistId(playlists) {
    for (const playlist of playlists) {
        if (playlist.snippet.title.toLowerCase().includes("watch later")) {
            return playlist.id;
        }
    }
    return null;
}*/

// Find "Watch Later" playlist ID
function getWatchLaterPlaylistId() {
    // YouTube's Watch Later playlist always has the ID "WL"
    return "WL";
}

// Fetch user's playlists and watch later playlist (used in options page)
async function fetchUserPlaylists() {
    if (!userToken) {
        console.error("User not authenticated.");
        return;
    }
    console.log("Token in fetchUserPlaylists:", userToken);

    try {
        // Fetch user's playlists
        const playlistsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50`,
            {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            }
        );

        if (!playlistsResponse.ok) {
            console.error("Error fetching playlists:", playlistsResponse.status);
            return;
        }

        const playlistsData = await playlistsResponse.json();
        let playlists = playlistsData.items || [];

        // Fetch "Watch Later" playlist items
        const watchLaterResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=WL&maxResults=50`,
            {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            }
        );

        if (!watchLaterResponse.ok) {
            console.error("Error fetching 'Watch Later' playlist:", watchLaterResponse.status);
            return;
        }

        const watchLaterData = await watchLaterResponse.json();
        if (watchLaterData && watchLaterData.items) {
            playlists.push({
                id: 'WL',
                snippet: {
                    title: 'Watch Later',
                    description: 'Your Watch Later playlist',
                },
                contentDetails: {
                    itemCount: watchLaterData.items.length,
                },
                items: watchLaterData.items,
            });
        } else {
            console.error("Error: Invalid format for 'Watch Later' data", watchLaterData);
        }

        return playlists;
    } catch (error) {
        console.error("Error fetching playlists:", error);
        return;
    }
}



// Fetch playlist items
async function fetchPlaylistItems(playlistId) {
  if (!userToken) {
    console.error("User not authenticated.");
    return;
  }

    console.log("Token in fetchPlaylistItems:", userToken);
    console.log("Fetching items for playlistId:", playlistId);


  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    }
  );
  if (!response.ok) {
    console.error("Error fetching playlist items:", response.status);
    return;
  }
  const data = await response.json();
  console.log("Raw API response (data):", data);

  if (data && data.items) {
    return data.items;
  } else {
    console.error("Error: Invalid format for playlist items data", data);
    return;
  }
}

function notifyContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "userAuthenticated",
                playlistId: selectedPlaylistId || "WL", // Send the selected or WL
            });
        }
    });
}

// Message listener for communication with content and popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "authenticate") {
        authenticateUser();
        sendResponse({ status: "Authentication initiated" });
    }  else if (request.action === "getPlaylistItems") {
        // Ensure we have the playlist ID before trying to get items
        if (!selectedPlaylistId && !watchLaterPlaylistId) {
            sendResponse({ error: "Watch Later list not loaded yet." });
            return true;
        }

        fetchPlaylistItems(selectedPlaylistId || watchLaterPlaylistId)
            .then(items => sendResponse({ data: items }))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Keep the channel open
    } else if (request.action === "getPlaylists") {
        fetchUserPlaylists()
            .then(playlists => sendResponse({ data: playlists }))
            .catch(error => sendResponse({ error: error.message }));
         return true;
    } else if (request.action === "updatePlaylistId") {
        selectedPlaylistId = request.playlistId;
        chrome.storage.sync.set({ selectedPlaylistId: selectedPlaylistId });
        sendResponse({ status: "Playlist ID updated" });
    }  else if (request.action === "getPlaylistId") {
      sendResponse({ playlistId: selectedPlaylistId || "WL" });
    }
     if (request.action === "checkAuthStatus") {
        sendResponse({ isAuthenticated: !!userToken }); // Send true if userToken exists, false otherwise
    } else if (request.action === "getPlaylistId") {
        sendResponse({ playlistId: selectedPlaylistId || "WL" });
    }
});

// Listen for changes in storage (e.g., rowsToShow)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.rowsToShow) {
        // Notify content script about the change
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "updateRowsToShow",
                rowsToShow: changes.rowsToShow.newValue,
            });
        });
    }
});