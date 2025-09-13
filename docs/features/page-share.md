# Page Share 

Page Share is a feature that allows you to share your chat with others, similar to ChatGPT’s share feature. This requires a small web service; you can self‑host it for privacy.

But for privacy, it's better to self-host the page share server. You can do this by following the steps below.


## Self-Host

You can self-host Page Share using two methods:

- Railway
- Docker

### Railway

Click the button below to deploy the code to Railway.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/VbiS2Q?referralCode=olbszX)

### Docker

1. Clone the repository


git clone https://github.com/n4ze3m/page-share-app.git
cd page-share-app


2. Run the server


docker-compose up


3. Open the app

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.


Once you have deployed the server, configure the share endpoint under Settings → Share.

![Page Share](https://pub-35424b4473484be483c0afa08c69e7da.r2.dev/Screenshot%202025-02-19%20210635.png)
