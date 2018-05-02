const user = module.parent.require("./user");
const socketModule = module.parent.require("./socket.io/modules");
const plugin = {};

plugin.init = (params, callback) => {
    let app = params.router;
    app.post("/discordapi/register", generateAndSendCode);
    app.get("/discordapi/tutorial", getTutorial);
    app.get("/discordapi/solvedthread", getSolvedThread);
    callback();
};

generateAndSendCode = (req, res, next) => {
    // TODO load token from config file
    if(req.body.token && req.body.token === "XPcTxMfU9XKBhpLGHDdeHBaxXvD3vJSdqVP72cv4FH8Pjrbv3VxZyZ77abLKtHKeK7TH45pNMnSFKgVtLe2Su4T6") {
        if (req.body.username) {
            user.getUidByUsername(req.body.username, (err, result) => {
                if (!err) {
                    if (result > 1) {
                        let randomNumber = randomizeNumber();
                        socketModule.chats.newRoom({uid: 1}, {touid: result}, (err2, roomId) => {
                            if(!err2) {
                                socketModule.chats.send({uid: 1}, {
                                    roomId: roomId,
                                    message: `Voici votre token d'accès au Discord de Minecraft Forge France : ${randomNumber}.
                                    Si vous n'avez pas fait de demande de code d'accès, merci de le signalez à l'équipe de Minecraft Forge France.`
                                }, (err3, messageData) => {
                                    if(err3) {
                                        console.error("Couldn't send message: " + err3);
                                        res.status(500).json({error: "Failed to send a private message"});
                                    }
                                    else {
                                        res.json({result: randomNumber});
                                    }
                                });
                            }
                            else {
                                console.error("Couldn't create chat room: " + err2);
                                res.status(500).json({error: "Failed to create chat room"});
                            }
                        });
                    }
                    else {
                        res.status(200).json({error: "User not found"});
                    }
                }
                else {
                    console.error("Couln't find user with name :" + req.body.username + ", err: " + err);
                    res.status(500).json({error: "Couln't get id of this user"});
                }
            });
        }
        else {
            res.status(400).json({error: "Missing arguments"});
        }
    }
    else {
        res.status(403).json({error: "Invalid token!"});
    }
};

function getTutorial(req, res, next) {

}

function getSolvedThread(req, res, next) {

}

randomizeNumber = () => {
    let number = "";
    for (let i = 0; i < 6; i++) {
        number += getRandomIntInclusive(0, 9);
    }
    return number;
};

getRandomIntInclusive = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = plugin;
