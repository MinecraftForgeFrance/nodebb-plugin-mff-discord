const user = module.parent.require("./user");
const socketModule = module.parent.require("./socket.io/modules");
const plugin = {};

plugin.init = (params, callback) => {
    let app = params.router;
    // TODO : Le token pose problème
    /*app.use((req, res, next) => {
        if(req.query.token && req.query.token === "XPcTxMfU9XKBhpLGHDdeHBaxXvD3vJSdqVP72cv4FH8Pjrbv3VxZyZ77abLKtHKeK7TH45pNMnSFKgVtLe2Su4T6") {
            next();
        }
        res.status(403);
    });*/
    app.get("/discord/register", renderRegister);
    callback();
};

renderRegister = (req, res, next) => {
    if (req.query.username !== "undefined") {
        user.getUidByUsername(req.query.username, (err, result) => {
            if (!err) {
                console.log(result);
                if (result > 1) {
                    const preMessage = "Bot Minecraft Forge France\n";
                    const message = "Voici votre token d'accès au Discord de Minecraft Forge France : ";
                    const postMessage = "\nSi vous n'avez pas fait de demande de code d'accès, merci de le signalez à l'équipe de Minecraft Forge France.";
                    const randomNumber = randomizeNumber();
                    socketModule.chats.newRoom({uid: 1}, {touid: result}, (err, roomId) => {
                        socketModule.chats.send({uid: 1}, {
                            roomId: roomId,
                            message: preMessage + message + randomNumber + postMessage
                        }, (err, messageData) => {
                            if(err)
                                throw err;
                        });
                        res.json({result: randomNumber});
                    });
                }
                else
                    res.json({error: "User not found"});
            }
            else
                throw err;
        });
    }
};

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
