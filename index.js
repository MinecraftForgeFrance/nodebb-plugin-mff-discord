const user = module.parent.require("./user");
const socketModule = module.parent.require("./socket.io/modules");
const meta = module.parent.require('./meta');

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

        callback();
    },
    // append mffdiscordbridge config to nodebb
    appendConfig(config, callback) {
        config.mffdiscordbridge = {
            token: MFFDiscordBridge.token,
            webhook: MFFDiscordBridge.discordWebHook,
        };
        callback(null, config);
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
