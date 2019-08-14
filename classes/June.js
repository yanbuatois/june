const { CommandClient } = require('discord-js-command-client');
const { Permissions, RichEmbed } = require('discord.js');
const UROAuth = require('urban-rivals-oauth');
const striptags = require('striptags');

const DataSaver = require('./DataSaver');
const config = require('../config');

class June extends CommandClient {
  constructor() {
    super('^');
    this.urApi = new UROAuth({
      key: config.key,
      secret: config.secret,
    });
    this.tokensSaver = new DataSaver(this.urApi);
    this._newsChannels = [];
    this._newsIds = [];
    this.enableHelp = false;
  }

  saveNewsChannels() {
    return this.tokensSaver.saveData('newsChannels.json', this._newsChannels);
  }

  async loadNewsChannels() {
    const newsChannels = await this.tokensSaver.loadData('newsChannels.json');
    this._newsChannels = newsChannels || [];

    return this._newsChannels;
  }

  saveNewsIds() {
    return this.tokensSaver.saveData('newsIds.json', this._newsIds);
  }

  async loadNewsIds() {
    const newsData = await this.tokensSaver.loadData('newsIds.json');
    this._newsIds = newsData || [];

    return this._newsIds;
  }

  start(token = config.botToken) {
    this.on('ready', async () => {
      let success;
      try {
        await Promise.all([this.loadNewsChannels(), this.loadNewsIds()]);
        if (!await this.tokensSaver.load() || !(success = await (async () => {
          try {
            await this.urApi.query('general.getNews', {
              nbNews: 1,
              type: 'news',
            });
            return true;
          } catch (err) {
            return false;
          }
        }))) {
          await this.urApi.getRequestToken();
          this.owner = await this.fetchUser(config.ownerId);
          await this.owner.send(this.urApi.getAuthorizeUrl('http://localhost/'));
          await new Promise((resolve, reject) => {
            const verifierCallback = async (message) => {
              if (message.channel.type === 'dm' && message.channel.recipient.id === this.owner.id && message.author.id === this.owner.id) {
                try {
                  await this.urApi.getAccessToken({
                    userToken: message.content,
                  });
                  this.removeListener('message', verifierCallback);
                  resolve();
                } catch (err) {
                  console.error(err);
                  message.reply(err.data || err.message).catch(err => console.error(err));
                }
              }
            };
            this.on('message', verifierCallback);
          });
          await this.tokensSaver.save();
        }
        const newsFetcherFunction = () => this.handleNewsClock();
        this.newsFetcher = setTimeout(newsFetcherFunction, 60 * 1000);
      } catch (err) {
        console.error(err);
      }
    });
    this.registerAllCommands();
    this.login(token);
  }

  async handleNewsClock() {
    const newsFetcherFunction = () => this.handleNewsClock();
    const {items} = await this.urApi.query('general.getNews', {
      nbNews: 5,
      type: 'news',
    });
    console.log(items);

    items.sort((a, b) => a.id - b.id);
    for (const item of items) {
      if (!this._newsIds.includes(item.id)) {
        this._newsIds.push(item.id);
        if (this._newsIds.length > 550) {
          this._newsIds = this._newsIds.splice(500);
        }
        await Promise.all([this.saveNewsIds(), (async () => {
          const richEmbed = new RichEmbed();
          richEmbed.setColor('ORANGE');
          const description = striptags(item.body.replace(/<br?\/>/, '\n')).slice(0,2000) + '...';
          richEmbed.setDescription(description);
          richEmbed.setImage(item.banner);
          richEmbed.setTimestamp(new Date(item.date * 1000));
          richEmbed.setTitle(item.title);
          if (item.forumSubjectURL) {
            richEmbed.setURL(`https://www.urban-rivals.com/${item.forumSubjectURL}`);
          }
          await Promise.all(this._newsChannels.map((channelId) => {
            const channel = this.channels.get(channelId);
            if (!channel) {
              const index = this._newsChannels.indexOf(channelId);
              this._newsChannels = this._newsChannels.splice(index, 1);
              return this.saveNewsChannels();
            }
            return channel.send(`:newspaper:**${item.title}**`, richEmbed);
          }));
        })()]);
      }
    }
    this.newsFetcher = setTimeout(newsFetcherFunction, 5 * 60 * 1000);
  }

  registerAllCommands() {
    this.registerCommand('eval', async (message, commandName, args) => {
      if (message.author.id !== config.ownerId) {
        return;
      }
      const joinedString = args.join(' ');
      try {
        message.reply(eval(joinedString));
      }
      catch (err) {
        console.error(err);
        message.reply(err.message || err.data);
      }
    } , {
      displayInHelp: false,
      minArgs: 1,
      dmAllowed: true,
    });

    this.registerCommand('api', async (message, commandName, args) => {
      if (message.author.id !== config.ownerId) {
        return;
      }
      try {
        const [call, ...data] = args;
        const callArgs = data.join(' ') || '{}';
        const returnValue = await this.urApi.query(call, JSON.parse(callArgs));
        const reply = this._sliceMessage(JSON.stringify(returnValue));
        await Promise.all(reply.map(elt => message.channel.send('```' + elt + '```')));
        console.log(returnValue);
      } catch (err) {
        await Promise.all((this._sliceMessage(err.message || err.data).map(elt => message.channel.send(elt))));
        console.error(err);
      }
    }, {
      displayInHelp: false,
      minArgs: 1,
      dmAllowed: true,
    });

    this.registerCommand('news', async (message, commandName, args) => {
      try {
        const [arg] = args;
        const enabled = arg.toLowerCase() === 'enable';
        if (enabled) {
          if (this._newsChannels.includes(message.channel.id)) {
            await message.reply('News are already enabled in this channel...');
          } else {
            this._newsChannels.push(message.channel.id);
            await this.saveNewsChannels();
            await message.reply(`Enabled news in the channel **${message.channel.id}**`);
          }
        } else {
          let index;
          if ((index = this._newsChannels.indexOf(message.channel.id)) !== -1) {
            this._newsChannels = this._newsChannels.splice(index, 1);
            await this.saveNewsChannels();
            await message.reply(`Disabled news in the channel **${message.channel.id}**`);
          } else {
            await message.reply('News already disabled in this channel...');
          }
        }
      } catch (err) {
        console.error(err);
        await message.reply(err.data || err.message || 'An error occurred during activation.');
      }
    }, {
      displayInHelp: false,
      minArgs: 1,
      dmAllowed: false,
      requiredPermission: Permissions.FLAGS.ADMINISTRATOR,
    });
  }

  _sliceMessage(message, chunkSize = 1500) {
    return message.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [];
  }
}

module.exports = June;
