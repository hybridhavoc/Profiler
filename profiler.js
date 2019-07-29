// Includes
const Discord = require('discord.js');
const logger = require('winston');
const config = require('./config.json');
const Enmap = require('enmap');
const ua = require('universal-analytics');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.add(new logger.transports.File({ filename: 'logs/' + Date.now().toString() + '.log' }))
logger.level = config.loggerLevel;

// Analytics
function analytics(page, category, action, label) {
    var visitor = ua(config.trackingId, config.clientId, {strictCidFormat: false});
    var params = { ec: category, ea: action, el: label};
    visitor.pageview(page.path, page.name, page.title).event(params).send();
}

// Initialize Discord client
const client = new Discord.Client();
client.on('ready', () => {
    // Runs when the bot starts and logs in successfully
    client.user.setActivity(config.prefix + 'help for help', { type: 'LISTENING' });
    logger.info('Connected');
    logger.info('Logged in as: ' + client.user.username + ' - (' + client.user.id + ')');
    logger.info('Prefix is [' + config.prefix + ']');
                
    // Analytics
    var page = { path: '/', name: 'https://profiler.hybridhavoc.com', title: 'Profiler'};
    analytics(page, "connection", "login", "success");
});

// Initialize enmap
const myEnmap = new Enmap({name: "profiles"});
myEnmap.defer.then( () => {
    logger.info(myEnmap.size + ' keys loaded');
    //myEnmap.deleteAll();
});

// Function for profile embed
function profileEmbed(sentKey,message,location) {
    logger.verbose('Entering profileEmbed function');
    // Initialize variables
    var key = sentKey;
    var keyGuild = key.substring(0,key.indexOf('-'));
    var keyId = key.substring(key.indexOf('-') + 1);
    logger.verbose('Key is [' + sentKey + ']');
    logger.verbose('keyId is [' + keyId + ']');
    logger.verbose('keyGuild is [' + keyGuild + ']');
    // Start creating embed
    var embed = new Discord.RichEmbed();
    myEnmap.defer.then( () => {        
        // Grab the record from the enmap
        var targetProfile = myEnmap.get(key);
        logger.verbose('Target id is: ' + targetProfile.id);
        embed.setAuthor(client.users.get(keyId).username);
        embed.setTitle('Profile');
        embed.setThumbnail(client.users.get(keyId).avatarURL);
        if(myEnmap.has(key,'description')) {
            embed.setDescription(targetProfile.description);
        } else {
            embed.setDescription('This user has not provided a description yet.');
        }
        // Get into the gaming profiles
        if(myEnmap.has(key,'xbox')) {
            embed.addField('Xbox','[' + targetProfile.xbox + '](https://account.xbox.com/en-us/profile?gamertag=' + targetProfile.xbox.replace(/ /g,'%20') + ')',true);
        }
        if(myEnmap.has(key,'psn')) {
            embed.addField('Playstation','[' + targetProfile.psn + '](https://my.playstation.com/profile/' + targetProfile.psn.replace(/ /g,'%20') + ')',true);
        }
        if(myEnmap.has(key,'steam')) {
            if(myEnmap.has(key,'steamurl')) {
                embed.addField('Steam','[' + targetProfile.steam + '](' + targetProfile.steamurl + ')',true);
            } else {
                embed.addField('Steam',targetProfile.steam,true);
            }
        }
        if(myEnmap.has(key,'uplay')) {
            embed.addField('Uplay','[' + targetProfile.uplay + '](https://club.ubisoft.com/en-US/profile/' + targetProfile.uplay.replace(/ /g,'%20') + ')',true);
        }
        if(myEnmap.has(key,'gog')) {
            embed.addField('GOG','[' + targetProfile.gog + '](https://www.gog.com/u/' + targetProfile.gog.replace(/ /g,'%20') + ')',true);
        }
        if(myEnmap.has(key,'switch')) {
            embed.addField('Nintendo Switch',targetProfile.switch,true);
        }
        if(myEnmap.has(key,'bnet')) {
            embed.addField('Battle.net',targetProfile.bnet,true);
        }
        if(myEnmap.has(key,'origin')) {
            embed.addField('EA Origin',targetProfile.origin,true);
        }
        if(myEnmap.has(key,'epic')) {
            embed.addField('Epic Games',targetProfile.epic,true);
        }
        if(myEnmap.has(key,'rocketid')) {
            embed.addField('Rocket ID',targetProfile.rocketid,true);
        }
        embed.setFooter('Developed by hybridhavoc');
        embed.setTimestamp(new Date())
        // Send it to its target location
        if(location === 'channel') {
            message.channel.send({embed});
        }
        if(location === 'author') {
            message.author.send({embed});
        }
        return embed;
    }).catch(function(err) { 
        embed.setTitle('No profile yet');
        embed.setDescription('This user does not yet have a profile.');
        embed.addField('Error',err);
        embed.setFooter('Developed by hybridhavoc')
        embed.setTimestamp(new Date())
        message.channel.send({embed});
    });
};

// Function for list embed
function listEmbed(platform, message,location) {
    logger.verbose('Entering listEmbed function');
    logger.verbose('Platform is: ' + platform);
    logger.verbose('Location is: ' + location);
    // Initialize variables
    var loc = location;
    // Get a filtered list (for this guild only), and convert to an array while we're at it.
    const filtered = myEnmap.filter( f => f.guild === message.guild.id && f[platform]).array();
    logger.verbose('Filtered array is ' + filtered.length + ' long');
              
    // Now show it
    var embed = new Discord.RichEmbed();
    embed.setTitle(platform.toUpperCase() + ' Members');
    embed.setThumbnail(client.user.avatarURL);
    logger.verbose('Creating list of members');
    var mems = '';
    if(platform === 'xbox') {
        for(const data of filtered) {
            mems = mems + client.users.get(data.id) + '\t:\t[' + data[platform] + '](https://account.xbox.com/en-us/profile?gamertag=' + data[platform].replace(/ /g,'%20') + ')\n';
        }
    }
    if(platform ==='psn') {
        for(const data of filtered) {
            mems = mems + client.users.get(data.id) + '\t:\t[' + data[platform] + '](https://my.playstation.com/profile/' + data[platform].replace(/ /g,'%20') + ')\n';
        }
    }
    if(platform ==='steam') {
        for(const data of filtered) {
            mems = mems + client.users.get(data.id) + '\t:\t[' + data[platform] + '](https://steamcommunity.com/id/' + data[platform].replace(/ /g,'%20') + ')\n';
        }
    }
    if(platform ==='uplay') {
        for(const data of filtered) {
            mems = mems + client.users.get(data.id) + '\t:\t[' + data[platform] + '](https://club.ubisoft.com/en-US/profile/' + data[platform].replace(/ /g,'%20') + ')\n';
        }
    }
    if(platform ==='gog') {
        for(const data of filtered) {
            mems = mems + client.users.get(data.id) + '\t:\t[' + data[platform] + '](https://www.gog.com/u/' + data[platform].replace(/ /g,'%20') + ')\n';
        }
    }
    // For the platforms that do not have profile pages
    if(platform ==='switch' || platform === 'bnet' || platform === 'origin' || platform === 'epic' || platform === 'rocketid') {
        for(const data of filtered) {
            mems = mems + client.users.get(data.id) + '\t:\t' + data[platform] + '\n';
        }
    }
    embed.setDescription(mems);
    embed.setTimestamp(new Date());
    embed.setFooter('Developed by hybridhavoc')
    logger.verbose('Members list added');
    try {
        if(location === 'channel') {
            message.channel.send({embed});
        }
        if(location === 'author') {
            message.author.send({embed});
        }
    } catch {
        logger.info('Failed to send listEmbed to ' + location);
    }
    
}

// Listens to all messages and processes accordingly
client.on('message', async message => {
    // Ignores other bots
    if(message.author.bot) return;

    if(!message.guild) {
        message.author.send('You can\'t talk to me here');
    }

        // If a command is received
    if(message.content.indexOf(config.prefix) == 0 || message.content.indexOf(config.prefix.toUpperCase()) == 0) {
        logger.verbose('Received command ' + message.content)
        // Parses the message
        var args = message.content.substring(config.prefix.length).split(' ');
        var cmd = args[0];
        args = args.splice(1);
        const key = `${message.guild.id}-${message.author.id}`;
         // Triggers on new users we haven't seen before.
        myEnmap.defer.then( () => {
            myEnmap.ensure(key, {
                id: message.author.id,
                guild: message.guild.id,
            });
        });
        logger.verbose('Storing: [' + key + '],{[id: ' + message.author.id + '],[guild: ' + message.guild.id + ']}');
        logger.verbose('Command is [' + cmd + ']');
        logger.verbose('Arguments are [' + args + ']');
        logger.verbose('Key is [' + key + ']');

        // Get into the actual commands
        switch(cmd) {
            // help
            case 'help':
                // Sends an embed with information on how to use the plugin
                var helpCommands = '**' + config.prefix + 'me**\n';
                helpCommands += 'Post a copy of your profile to the channel you\'re in.\n\n';
                helpCommands += '**' + config.prefix + 'preview**\n';
                helpCommands += 'Get a copy of your profile sent to you in a private message.\n\n';
                helpCommands += '**' + config.prefix + 'file**\n';
                helpCommands += 'Have a copy of somebody\'s profile sent to you in a private message. Just tag the user after the command.\n';
                helpCommands += '```Example: ' + config.prefix + 'file @hybridhavoc```\n';
                helpCommands += '**' + config.prefix + 'list**\n';
                helpCommands += 'Get a list of users on the specified platform sent to you in a private message. See the list of supported platforms below.\n';
                helpCommands += '```Example: ' + config.prefix + 'list xbox```\n';
                helpCommands += '**' + config.prefix + 'description**\n';
                helpCommands += 'Allows the user to supply a description. Think of this as their biography.\n';
                helpCommands += '```Example: ' + config.prefix + 'description Just an awesome gamer playing awesome games```\n\n';
                helpCommands += '**' + config.prefix + '[*platform*]**\n';
                helpCommands += 'Allows the user to supply a platform gamertag to add to their profile. See the list of supported platforms below.\n';
                helpCommands += '```Example: ' + config.prefix + 'xbox HYBR1D HAV0C```\n';
                helpCommands += '**' + config.prefix + 'steamurl**\n';
                helpCommands += 'Because Steam is stupid sometimes, use this command to provide the URL to your Steam profile.'
                var embed = new Discord.RichEmbed();
                embed.setTitle('Profiler Help');
                embed.setDescription('This bot allows you to store and share your gaming profiles with other Discord members. It is server-specific so if you want to share different profiles on different servers you can.');
                embed.setFooter('Developed by hybridhavoc');
                embed.setTimestamp(new Date());
                embed.addField('Commands',helpCommands);
                embed.addField('Supported Platforms','```\nxbox\npsn\nswitch\nsteam\nepic\nuplay\nbnet\norigin\ngog\nrocketid```');
                embed.addField('Get the Bot','[Developer Site](https://www.hybridhavoc.com/2019/02/04/profiler/)');
                embed.addField('Icon','Icons made by [Nikita Golubev](https://www.flaticon.com/authors/nikita-golubev) from [www.flaticon.com](https://www.flaticon.com/) is licensed by [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/)');
                message.author.send({embed});
                message.react('☑').then( () => {message.delete(5000)});

                // Analytics
                var page = { path: '/' + message.guild.name + '/help', name: 'https://profiler.hybridhavoc.com/guilds/' + message.guild.name + '/help', title: 'Profiler - help' };
                analytics(page, "help", "viewed", message.guild.name);
                break;

            case 'preview':
                logger.verbose('Preview command entered');    
                profileEmbed(key,message,'author');
                message.react('☑').then( () => {message.delete(5000)});
                
                // Analytics
                var page = { path: '/' + message.guild.name + '/profile/' + message.author.tag, name: 'https://profiler.hybridhavoc.com/guilds/' + message.guild.name + '/profile/' + message.author.tag, title: 'Profiler - ' + message.author.tag + ' on ' + message.guild.name };
                analytics(page, "profile", "previewed", message.guild.name);
                break;

            case 'me':
                logger.verbose('Me command entered');
                profileEmbed(key,message,'channel');
                message.react('☑').then( () => {message.delete(5000)});
                
                // Analytics
                var page = { path: '/' + message.guild.name + '/profile/' + message.author.tag, name: 'https://profiler.hybridhavoc.com/guilds/' + message.guild.name + '/profile/' + message.author.tag, title: 'Profiler - ' + message.author.tag + ' on ' + message.guild.name };
                analytics(page, "profile", "shared", message.guild.name);
                break;
            
            case 'file':
                logger.verbose('Profile command entered');
                var targetUser = message.guild.id + '-' + message.mentions.members.first().id;
                profileEmbed(targetUser,message,'author');
                message.react('☑').then( () => {message.delete(5000)});
                
                // Analytics
                var page = { path: '/' + message.guild.name + '/profile/' + message.author.tag, name: 'https://profiler.hybridhavoc.com/guilds/' + message.guild.name + '/profile/' + message.author.tag, title: 'Profiler - ' + message.author.tag + ' on ' + message.guild.name };
                analytics(page, "profile", "viewed", message.guild.name);
                break;

            case 'description':
                logger.verbose('Description command entered');
                var description = '';
                for (var i = 0; i < args.length; i++) {
                    description = description + ' ' + args[i];
                }
                description = description.trim();
                logger.verbose('Description is: ' + description);
                logger.verbose('Storing: [' + key + '],[description: ' + description + ']');
                myEnmap.defer.then( () => {
                    myEnmap.set(key,description,'description');
                });
                message.react('☑').then( () => {message.delete(5000)});
                break;
            
            case 'xbox':
            case 'psn':
            case 'switch':
            case 'steam':
            case 'epic':
            case 'uplay':
            case 'bnet':
            case 'origin':
            case 'gog':
            case 'rocketid':
                logger.verbose(cmd + ' command entered');
                var gamertag = '';
                for (var i = 0; i < args.length; i++) {
                    gamertag = gamertag + ' ' + args[i]; 
                }
                gamertag = gamertag.trim();
                logger.verbose(cmd + ' gamertag is: ' + gamertag);
                logger.verbose('Storing: [' + key + '],[' + cmd + ': ' + gamertag + ']');
                myEnmap.defer.then( () => {
                    myEnmap.set(key,gamertag,cmd);
                });
                message.react('☑').then( () => {message.delete(5000)});
                break;
                
            case 'steamurl':
                logger.verbose(cmd + ' command entered');
                var url = '';
                for (var i = 0; i < args.length; i++) {
                    url = url + ' ' + args[i];
                }
                url = url.trim();
                logger.verbose(cmd + ' url is: ' + url);
                logger.verbose('Storing: [' + key + '],[' + cmd + ': ' + url + ']');
                myEnmap.defer.then( () => {
                    myEnmap.set(key,url,cmd);
                });
                message.react('☑').then( () => {message.delete(5000)});
                break;
            
            case 'list':
                logger.verbose('List command entered');
                listEmbed(args[0],message,'author');
                message.react('☑').then( () => {message.delete(5000)});
                
                // Analytics
                var page = { path: '/platform/' + args[0] + '/list', name: 'https://profiler.hybridhavoc.com/platform/' + args[0] + '/list', title: 'Profiler - listing ' + args[0]};
                analytics(page, "list", "generated", message.guild.name);
                break;

            default:
                logger.verbose('Didn\'t understand command');
                message.react('❌');
                message.react('❓');
                message.delete(5000);
                break;
                // End of commands
        }
    }
})

//// Bot reporting
// Tracks when the bot connects to a guild
client.on('guildCreate', async guild => {
    logger.verbose('Bot joining guild. [guild: ' + guild.name + ']');
    var page = { path: '/' + guild.name, name: 'https://profiler.hybridhavoc.com/guilds/' + guild.name, title: 'Profiler - guild added' };
    analytics(page, "guild", "added", guild.name);
});

// Tracks when the bot leaves a guild
client.on('guildDelete', async guild => {
    logger.verbose('Bot leaving guild. [guild: ' + guild.name + ']');
    var page = { path: '/' + guild.name, name: 'https://profiler.hybridhavoc.com/guilds/' + guild.name, title: 'Profiler - guild deleted' };
    analytics(page, "guild", "deleted", guild.name);
});

// Attempts to reconnect 30 times upon disconnection
client.on('disconnected', function() {
    for(var i = 0; i < 30;i++) {
        logger.verbose('Disconnected. Reconnect attempt ' + i);
        setTimeout(client.login(config.token), 60000).catch(function(err) {
            logger.warn(err);
        });
    }
});

// Logs in
client.login(config.token).catch(function(err) {
    logger.warn(err);
});