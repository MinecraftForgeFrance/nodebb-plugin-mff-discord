const user = module.parent.require("./user");
const socketModule = module.parent.require("./socket.io/modules");
const socketIndex = module.parent.require('./socket.io/index')
const socketPlugins = module.parent.require('./socket.io/plugins');
const meta = module.parent.require('./meta');
const shouts = require('../nodebb-plugin-shoutbox/lib/shouts');
const request = module.parent.require('request');
const nconf = require('nconf');

const MFFDiscordBridge = {
    token: "changeme",
    discordWebHook: "changeme",
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
                winston.warn(`[plugin/mffdiscordbridge] Unable to retrieve settings, will keep defaults: ${err.message}`);
            }
            else {
                // load value from config if exist, keep default otherwise
                if (options.hasOwnProperty("token")) {
                    MFFDiscordBridge.token = options["token"];
                }

                if (options.hasOwnProperty("webhook")) {
                    MFFDiscordBridge.discordWebHook = options["webhook"];
                }
            }
        });

        let originSend = socketPlugins.shoutbox.send;
        socketPlugins.shoutbox.send = (socket, data, callback) => {
            console.log(socket.uid);
            originSend(socket, data, callback); // call send from nodebb-plugin-shoutbox

            if(socket.uid && data && data.message) {
                user.getUsersWithFields([socket.uid], ['username', 'picture'], socket.uid, (err, userData) => {
                    if(!err && userData && userData[0]) {
                        let avatarUrl = userData[0].picture.startsWith("http") ? userData[0].picture : (nconf.get('url') + userData[0].picture);
                        request.post(MFFDiscordBridge.discordWebHook, {
                            json: {
                                username: userData[0].username,
                                avatar_url: avatarUrl,
                                content: data.message
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
    // append mffdiscordbridge config to nodebb
    appendConfig(config, callback) {
        config.mffdiscordbridge = {
            token: MFFDiscordBridge.token,
            webhook: MFFDiscordBridge.discordWebHook,
        };
        callback(null, config);
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
        user.getUidByUsername(req.body.username, (err, result) => {
            if (!err) {
                if (result > 1) {
                    let randomNumber = randomizeNumber();
                    socketModule.chats.newRoom({uid: 1}, {touid: result}, (err2, roomId) => {
                        if (!err2) {
                            socketModule.chats.send({uid: 1}, {
                                roomId: roomId,
                                message: `Voici votre token d'accès au Discord de Minecraft Forge France : ${randomNumber}.
                                Si vous n'avez pas fait de demande de code d'accès, merci de le signalez à l'équipe de Minecraft Forge France.`
                            }, (err3, messageData) => {
                                if (err3) {
                                    console.error(`Couldn't send message: ${err3}`);
                                    res.status(500).json({error: "Failed to send a private message"});
                                }
                                else {
                                    res.json({result: randomNumber});
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

function getTutorial(req, res) {
    res.status(200).json({msg: "Not implemented for now"});
}

function getSolvedThread(req, res) {
    res.status(200).json({msg: "Not implemented for now"});
}

function sendShout(req, res) {
    if(req.body.username && req.body.message) {
        user.getUidByUsername(req.body.username, (err, userid) => {
            if (err) {
                console.error(`Couldn't find user with name :${req.body.username}, err: ${err}`);
                return res.status(500).json({error: "Couldn't get id of this user"});
            }
            if (userid > 0) {
                shouts.addShout(userid, req.body.message, function(err, shout) {
                    if (err) {
                        return res.status(500).json({error: "Failed to send shout"});
                    } 
                    shout.fromBot = true;
                    socketIndex.server.sockets.emit('event:shoutbox.receive', shout);
                    return res.json({success: "true"});
                });
            }
            else {
                res.status(200).json({error: "User not found"});
            }
        });
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
