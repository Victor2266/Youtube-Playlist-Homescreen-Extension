## Tired of Your Watch Later Playlist Gathering Dust?

Do you never seem to get around to watching the videos in your watch later playlist?

With this addon, the playlist will be **front and center** in the middle of the YouTube homepage, so you might be enticed to finally work through it!

**Key Features:**

* **Enhance your YouTube homepage** by adding any playlist you choose.
* **Enjoy seamless integration** with the existing YouTube layout.
* **Customizable rows** to display your playlist as you prefer.
* **Shortcuts** to:
    * Open the playlist directly.
    * Quickly navigate to 'See All Playlists'.

**Important Note Regarding "Watch Later":**

⚠️ **Warning:** YouTube has removed access to the "Watch Later" playlist via their API. Therefore, to use this extension with your "Watch Later" videos, you will need to **transfer them to a different playlist**.

There are other extensions available that can help you do this quickly. For example, you can use an extension as demonstrated in this video: [https://www.youtube.com/watch?v=dHFR3S22qMo](https://www.youtube.com/watch?v=dHFR3S22qMo)

**Screenshots:**



https://github.com/user-attachments/assets/16fda293-4a33-4319-b8d9-19cd814bbb13



![Image showcasing the playlist integrated into the YouTube homepage](https://github.com/user-attachments/assets/7b29ab99-1bb7-43e2-8980-6fe96ab3ffa0)

![Image showing sign in box](https://github.com/user-attachments/assets/9eae0f50-1d54-45ed-987f-1793d7db172b)

![Image showing drop to change playlists and the options button](https://github.com/user-attachments/assets/11161e34-ea8f-45c1-a707-a9a68c3b3bcf)

![Another image showing the options](https://github.com/user-attachments/assets/0ad9f738-9938-409a-b8de-6a72e0962f55)


## Generating Your Own Client ID for YouTube Data API (Chrome Extension)

Currently, YouTube Data API has a courtesy limit of **10,000 queries per day**.

To use the YouTube Data API in your Chrome Extension, you need to generate your own client ID. Here's how:

**1. Create a Google Cloud Project:**

   - Go to the [Google Cloud Platform Console](https://console.cloud.google.com/).
   - Create a **new project**.

**2. Enable the YouTube Data API v3:**

   - In your project, navigate to **"APIs & Services" > "Library"**.
   - Search for and enable the **"YouTube Data API v3"**.

**3. Create OAuth 2.0 Credentials:**

   - Go to **"APIs & Services" > "Credentials"**.
   - Click **"Create credentials"**.
   - Choose **"OAuth client ID"**.

**4. Configure OAuth 2.0 Client ID:**

   - Select **"Application type"** as **"Chrome App"**.
   - **Crucially, you need your Extension ID.**
     - Load your unpacked extension in Chrome by going to `chrome://extensions/`.
     - The **Extension ID** will be displayed for your extension.
   - Enter your **Extension ID** in the **"Application ID"** field.

**5. Get your Client ID:**

   - Once created, your **Client ID** will be displayed.
   - You will use this **Client ID** in your `manifest.json` file.
