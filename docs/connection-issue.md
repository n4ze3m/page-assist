# Ollama Connection Issues

Connection issues can be caused by a number of reasons. Here are some common issues and how to resolve them on Page Assist. You will see the following error message if there is a connection issue:

### 1. Direct Connection Error
![Direct connection error](https://image.pageassist.xyz/Screenshot%202024-05-13%20001742.png)

### 2. `403` Error When Sending a Message
![403 error when sending a message](https://image.pageassist.xyz/Screenshot%202024-05-13%20001940.png)

This issue because of CORS (Cross-Origin Resource Sharing) issues. Since Page Assist is a browser extension, it needs to communicate with the server through the browser. However, the browser restricts communication between different origins. To resolve this issue, you can try the following solutions:   

## 1. Solutions 

Since Ollama has connection issues when directly accessed from the browser extension, Page Assist rewrites the request headers to make it work. However, automatic rewriting of headers only works on `http://127.0.0.1:*` and `http://localhost:*` URLs. To resolve the connection issue, you can try the following solutions:

1. Go to Page Assist and click on the `Settings` icon.

2. Click on the `Ollama Settings` tab.

3. There you will see the `Advance Ollama URL Configuration` option. You need to expand it.

![Advance Ollama URL Configuration](https://image.pageassist.xyz/Screenshot%202024-05-13%20003123.png)

4. Enable the `Enable or Disable Custom Origin URL` option.

![Enable or Disable Custom Origin URL](https://image.pageassist.xyz/Screenshot%202024-05-13%20003225.png)

:::tip
If Ollama is running on a different port, then change the URL in the `Custom Origin URL` field; otherwise, leave it as it is. Do not change the URL to the Ollama server URL like
:::

5. Make sure click on the `Save` button to save the changes.

_This will resolve the connection issue, and you will be able to use Ollama without any issues on Page Assist_

## 2. Solution

You can set OLLAMA_ORIGINS=* to allow connections from any origin. Here's how to do it on different operating systems:

### Windows
1. Open Start menu and search for "Environment Variables"
2. Click "Edit the system environment variables"
3. Click "Environment Variables" button
4. Under "System Variables" click "New"
5. Set Variable name: `OLLAMA_ORIGINS` and Variable value: `*`
6. Click OK to save
7. Restart Ollama service


### MacOS

1. Open Terminal
2. Run the following command:

```bash
launchctl setenv OLLAMA_ORIGINS "*"
```
3. Restart Ollama service

### Linux
1. Open Terminal
2. Run the following command:

```bash
export OLLAMA_ORIGINS="*"
```
3. Restart Ollama service

_This will allow connections from any origin. Hopefully, this will resolve the connection issue._



If you still face any issues, feel free to contact us [here](https://github.com/n4ze3m/page-assist/issues/new), and we will be happy to help you out.
