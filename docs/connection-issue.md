# Ollama Connection Issues

Connection issues can be caused by a number of reasons. Here are some common issues and how to resolve them on Page Assist. You will see the following error message if there is a connection issue:

### 1. Direct Connection Error
![Direct connection error](https://image.pageassist.xyz/Screenshot%202024-05-13%20001742.png)

### 2. `403` Error When Sending a Message
![403 error when sending a message](https://image.pageassist.xyz/Screenshot%202024-05-13%20001940.png)

This issue usually occurs when Ollama is not running on [http://127.0.0.1:11434/](http://127.0.0.1:11434/), and the connection is from the private network or a different network.

### Solutions

Since Ollama has connection issues when directly accessed from the browser extension, Page Assist rewrites the request headers to make it work. However, automatic rewriting of headers only works on `http://127.0.0.1:*` and `http://localhost:*` URLs. To resolve the connection issue, you can try the following solutions:

1. Go to Page Assist and click on the `Settings` icon.

2. Click on the `Ollama Settings` tab.

3. There you will see the `Advance Ollama URL Configuration` option. You need to expand it.

![Advance Ollama URL Configuration](https://image.pageassist.xyz/Screenshot%202024-05-13%20003123.png)

4. Enable the `Enable or Disable Custom Origin URL` option.

![Enable or Disable Custom Origin URL](https://image.pageassist.xyz/Screenshot%202024-05-13%20003225.png)

5. (Optional) If Ollama is running on a different port or host, then change the URL in the `Custom Origin URL` field; otherwise, leave it as it is.

6. Make sure click on the `Save` button to save the changes.

This will resolve the connection issue, and you will be able to use Ollama without any issues on Page Assist ❤

7. If you are still facing issues, you can try the following steps:

- Add `OLLAMA_HOST=0.0.0.0` to the environment variables of Ollama.
- Restart Ollama.
- Try again.


If you still face any issues, feel free to contact us [here](https://github.com/n4ze3m/page-assist/issues/new), and we will be happy to help you out.