# Page Share 

Page Share is a feature that allows you to share your chat with others like the share feature of ChatGPT. This feature interacts with the internet by default, and you can use the page assist server to share your chat.

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


Once you have deployed the server, you can change the Page Share by going to the settings and manage share.

![Page Share](https://pub-35424b4473484be483c0afa08c69e7da.r2.dev/Screenshot%202025-02-19%20210635.png)