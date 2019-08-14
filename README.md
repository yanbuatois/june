# June
June is a Discord bot who allows to fetch Urban Rivals news and post them on Discord.

## Installation
Clone the repository
```shell script
git clone https://github.com/yanbuatois/june.git
```
Then go in the bot directory, and install all dependencies with
```shell script
npm install
```

Now, copy the `example.env` file to the name `.env` to put the configuration inside. 
Put inside your Urban Rivals API key and secret, as well as your bot token, and the bot owner Discord ID (to allow things like eval or api tests).

Then run the bot, with
```shell script
npm start
```

The bot is now running. You can now enable the news in a channel, by typing 
```
^news enable
```
in this channel (requires administrator rights). You can disable the same way
```
^news disable
```

Then bot will fetch by himself every 5 minutes the new news (only the 5 lasts, for performance reasons).
