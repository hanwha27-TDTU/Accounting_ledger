This folder exists only because Capacitor's config requires a webDir.
No web assets live here — capacitor.config.json's server.url points the
WebView at the deployed GitHub Pages site instead, so the shell never
needs a local copy of the web app to build or update.
