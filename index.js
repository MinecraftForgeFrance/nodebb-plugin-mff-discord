const user = require.main.require("./src/user");
const socketModule = require.main.require("./src/socket.io/modules");
const socketIndex = require.main.require('./src/socket.io/index');
const socketPlugins = require.main.require('./src/socket.io/plugins');
const meta = require.main.require('./src/meta');
const shouts = require('../nodebb-plugin-shoutbox/lib/shouts');
const request = require.main.require('request');
const nconf = require('nconf');
const search = require.main.require("./src/search");
const topics = require.main.require('./src/topics');
const messaging = require.main.require('./src/messaging');

const MFFDiscordBridge = {
    token: "changeme",
    discordWebHook: "changeme",
    tutorialCategoryId: 0,
    supportCategoryId: 0,
    // init the plugin
    init(params, callback) {
        let app = params.router;
        let middleware = params.middleware;

        // discord bridge api
        app.post("/discordapi/register", checkToken, generateAndSendCode);
        app.get("/discordapi/tutorial", checkToken, getTutorial);
        app.get("/discordapi/solvedthread", checkToken, getSolvedThread);
        app.post("/discordapi/sendshout", checkToken, sendShout);

        // admin panel
        app.get('/admin/plugins/mff-discord', middleware.admin.buildHeader, renderAdmin);
        app.get('/api/admin/plugins/mff-discord', renderAdmin);

        meta.settings.get('mffdiscordbridge', (err, options) => {
            if (err) {
                console.log(`[plugin/mffdiscordbridge] Unable to retrieve settings, will keep defaults: ${err.message}`);
            }
            else {
                // load value from config if exist, keep default otherwise
                if (options.hasOwnProperty("token")) {
                    MFFDiscordBridge.token = options["token"];
                }

                if (options.hasOwnProperty("webhook")) {
                    MFFDiscordBridge.discordWebHook = options["webhook"];
                }

                if (options.hasOwnProperty("tutocatid")) {
                    MFFDiscordBridge.tutorialCategoryId = options["tutocatid"];
                }

                if (options.hasOwnProperty("supportcatid")) {
                    MFFDiscordBridge.supportCategoryId = options["supportcatid"];
                }
            }
        });

        let originSend = socketPlugins.shoutbox.send;
        socketPlugins.shoutbox.send = (socket, data, callback) => {
            originSend(socket, data, callback); // call send from nodebb-plugin-shoutbox

            if(socket.uid && data && data.message) {
                user.getUsersWithFields([socket.uid], ['username', 'picture'], socket.uid, (err, userData) => {
                    if(!err && userData && userData[0]) {
                        let avatarUrl = userData[0].picture.startsWith("http") ? userData[0].picture : (nconf.get('url') + userData[0].picture);
                        request.post(MFFDiscordBridge.discordWebHook, {
                            json: {
                                username: userData[0].username,
                                avatar_url: avatarUrl,
                                content: data.message.replace(/\@(here|everyone)/gi, "$1")
                            }
                        }, (error, response, body) => {
                                if (error) {
                                    console.log(error);
                                }
                            }
                        );
                    }
                });
            }
        };

        /*
        socketIndex.server.sockets.on('connection', socket => {
            console.log(socket);
            socket.on("plugins.shoutbox.send", data => {
                console.log("test");
            });
        });*/

        callback();
    },
    addToAdminNav(header, callback) {
        header.plugins.push({
            route: '/plugins/mff-discord',
            name: 'MFF Discord bridge',
        });

        callback(null, header);
    }
};

// check token middleware
function checkToken(req, res, next) {
    let token = req.body.token || req.query.token || "";
    if (token === MFFDiscordBridge.token) {
        next();
    }
    else {
        res.status(403).json({error: "Invalid token!"});
    }
}

function generateAndSendCode(req, res) {
    if (req.body.username) {
        user.getUidByUsername(req.body.username, (err, userid) => {
            if (!err) {
                if (userid > 1) {
                    let randomNumber = randomizeNumber();
                    getOrCreateChatRoom(socketModule.chats, 1, userid, (err2, roomId) => {
                        if (!err2) {
                            socketModule.chats.send({uid: 1}, {
                                roomId: roomId,
                                message: `Voici votre token d'accès au Discord de Minecraft Forge France : ${randomNumber}.
                                Si vous n'avez pas fait de demande de code d'accès, veuillez ignorer ce message.`
                            }, (err3, messageData) => {
                                if (err3) {
                                    console.error(`Couldn't send message: ${err3}`);
                                    res.status(500).json({error: "Failed to send a private message"});
                                }
                                else {
                                    res.json({
                                        result: randomNumber,
                                        userId: userid,
                                    });
                                }
                            });
                        }
                        else {
                            console.error(`Couldn't create chat room: ${err2}`);
                            res.status(500).json({error: "Failed to create chat room"});
                        }
                    });
                }
                else {
                    res.status(200).json({error: "User not found"});
                }
            }
            else {
                console.error(`Couldn't find user with name :${req.body.username}, err: ${err}`);
                res.status(500).json({error: "Couldn't get id of this user"});
            }
        });
    }
    else {
        res.status(400).json({error: "Missing arguments"});
    }
}

function getOrCreateChatRoom(chats, botid, userid, callback) {
    messaging.getRecentChats(userid, userid, 0, 19, (err, result) => {
        if(err) {
            callback(err, null);
        }
        else {
            for(room of result.rooms) {
                if(room.owner == botid) {
                    return callback(null, room.roomId);
                }
            }
            chats.newRoom({uid: botid}, {touid: userid}, (err2, roomId) => {
                if(err2) {
                    callback(err2, null);
                }
                else {
                    callback(null, roomId);
                }
            });
        }
    });
}

function getTutorial(req, res) {
    return searchInPost(req, res, [MFFDiscordBridge.tutorialCategoryId]);
}

function getSolvedThread(req, res) {
    return searchInPost(req, res, [MFFDiscordBridge.supportCategoryId]);
}

function searchInPost(req, res, categories) {
    var data = {
		query: req.query.term,
		searchIn: 'titles',
		matchWords: 'all',
		categories: categories,
		searchChildren: true,
		hasTags: req.query.hasTags,
		sortBy: '',
		qs: req.query
	};

	search.search(data, function(err, results) {
		if (err) {
            console.log(err);
			return res.status(500).json({error: "Error while performing the search"});
        }
        let tids = results.posts.map(post => post && post.tid);
        topics.getTopicsTags(tids, (err2, postTags) => {
            if(err2) {
                console.log(err2);
                return res.status(500).json({error: "Error while getting topic tags"});
            }

            if(results.posts.length == 0) {
                return res.status(200).json({message: "No result"});
            }

            let response = {};
            if(!req.query.hasTags) { // only add none tag if there is not tags filter in the request
                response['none'] = [];
            }
            for(tags of postTags) {
                for(tag of tags) {
                    if(isTagInFilter(tag, req.query.hasTags)) {
                        response[tag] = [];
                    }
                }
            }

            for(let i in results.posts) {
                let post = {
                    title: results.posts[i].topic.title,
                    url: nconf.get('url') + '/topic/' + results.posts[i].topic.slug
                };
                if(postTags[i].length == 0) {
                    response['none'].push(post);
                }
                else {
                    for(tag of postTags[i]) {
                        // avoid duplicate if topic has multiple tags
                        if(isTagInFilter(tag, req.query.hasTags)) {
                            response[tag].push(post);
                        }
                    }
                }
            }
            return res.status(200).json(response);
        });
    });
}

function isTagInFilter(tag, tagsFilter) {
    return !tagsFilter || (tagsFilter && tagsFilter.indexOf(tag) >= 0);
}

function sendShout(req, res) {
    if(req.body.senderId && req.body.message && req.body.mentions) {
        user.exists(req.body.senderId).then(() => {
            user.getUsernamesByUids(req.body.mentions.map(mention => mention.id), (err, usernames) => {
                if(err) {
                    console.log(`Couldn't find the name for an user : ${err}`);
                    return res.status(500).json({error: "Couldn't retrieve an user from given id"});
                }
                if(usernames.indexOf(0) !== -1) {
                    return res.status(200).json({error: "User not found"});
                }

                // Re-create message with mentions matching forum names
                let message = req.body.message;
                for(let i = 0; i < req.body.mentions.length; i++) {
                    message = message.substring(0, req.body.mentions[i].index) + `@${username[i]}` + message.substring(req.body.mentions[i].index);
                }

                shouts.addShout(req.body.senderId, message, function(err, shout) {
                    if (err) {
                        return res.status(500).json({error: "Failed to send shout"});
                    }
                    shout.fromBot = true;
                    socketIndex.server.sockets.emit('event:shoutbox.receive', shout);
                    return res.json({success: "true"});
                });
            })
        }).catch(() => res.status(500).json({error: "User not found"}));
    }
    else {
        res.status(400).json({error: "Missing arguments"});
    }
}

function renderAdmin(req, res) {
    res.render('admin/plugins/mff-discord');
}

function randomizeNumber() {
    let number = "";
    for (let i = 0; i < 6; i++) {
        number += getRandomIntInclusive(0, 9);
    }
    return number;
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = MFFDiscordBridge;
