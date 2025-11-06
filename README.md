# Media Maestro - Media Organizer

This is a local-first media organizer application that helps you organize your photos and videos into a structured directory format.

## Key Features

- **Local First & Safe**: All file operations happen directly in your browser. Your files are never uploaded to a server. The application follows a strict **copy-only** policy, meaning your original files are never moved or deleted.
- **In-Browser Execution**: Run the entire organization process in your browser with features like pause, resume, and cancellation. The application automatically saves your progress and allows you to resume an incomplete session even after reloading the page.
- **Customizable Organization**: Define your own directory structure using placeholders like `{YYYY}` for year and `{MM}` for month.
- **Dry-Run Mode**: Preview the file operations before executing them to ensure everything is correct.

## Safety

This application is designed with safety in mind. **It never deletes your source files.** All operations are copy-only. After you have verified that your files have been organized correctly in the destination folder, you can manually delete the source files.

## CLI Usage

The media organizer also provides a command-line interface (CLI) for users who prefer to run the organization process outside the browser or for automating tasks.

To use the CLI:

1.  **Navigate to the CLI directory**:

    ```bash
    cd media-organizer-cli
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Build the CLI (if you haven't already)**:

    ```bash
    npm run build
    ```

4.  **Run the CLI**:

    You can run the CLI using `node dist/execute-plan.js` or `npm run dev` for development.

    ```bash
    # Using the compiled JavaScript
    node dist/execute-plan.js ^
      --plan "<path-to-plan.json>" ^
      --execute --verify --resume --concurrency 4 ^
      --source-root "<SourceFolder>" ^
      --dest-root   "<DestinationFolder>"

    # Using the development script (requires tsx installed globally or locally)
    npm run dev -- ^
      --plan "<path-to-plan.json>" ^
      --execute --verify --resume --concurrency 4 ^
      --source-root "<SourceFolder>" ^
      --dest-root   "<DestinationFolder>"
    ```

    **Note**: The `media-organizer-cli` is not a globally installed command. You must either run `node dist/execute-plan.js` from within the `media-organizer-cli` directory or use `npm run dev`.

## MediaInfo WASM Handling
MediaInfo WASM is served from `/public/mediainfo`. It is copied on `postinstall` and initialized in the browser with `locateFile()`.

---

Built by [Bassam Alsaqqa](https://github.com/Bassamalsaqqa)
- [LinkedIn](https://www.linkedin.com/in/bassamalsaqqa/)
