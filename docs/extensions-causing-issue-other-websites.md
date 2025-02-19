# Extensions Causing Issue with Other Websites

Since Page Assist rewrites the Origin header to avoid CORS issues on the Ollama API, this feature causes issues for some users or websites.

Current known issues:

- Breaks Intel® Driver & Support Assistant
- Box Tools Website

For this reason, we have added a setting to disable the feature.

## How to disable the feature

1. Click on the Page Assist icon in the browser toolbar.
2. Click on the settings icon.
3. Click on the "Ollama Settings" tab.
4. Expand the "Advanced Ollama URL Configuration"
5. Turn off the "Enable or Disable Automatic Ollama CORS Fix" option.
6. Click on the "Save" button.

![image](https://pub-35424b4473484be483c0afa08c69e7da.r2.dev/Screenshot%202025-02-17%20185214.png)

This will disable the feature and prevent Page Assist from rewriting the Origin header.

However, your Ollama may start throwing 403 errors. To fix that, you need to add the following line to your Ollama config file.

## How to fix 403 error

You can set OLLAMA_ORIGIN=* to allow connections from any origin. Here's how to do it on different operating systems:

### Windows
1. Open Start menu and search for "Environment Variables"
2. Click "Edit the system environment variables"
3. Click "Environment Variables" button
4. Under "System Variables" click "New"
5. Set Variable name: `OLLAMA_ORIGIN` and Variable value: `*`
6. Click OK to save
7. Restart Ollama service

### MacOS

1. Open Terminal
2. Run the following command:


launchctl setenv OLLAMA_ORIGIN "*"

3. Restart Ollama service

### Linux
1. Open Terminal
2. Run the following command:


export OLLAMA_ORIGIN="*"

3. Restart Ollama service

_This will allow connections from any origin. Hopefully, this will resolve the connection issue._