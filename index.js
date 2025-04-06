const jwt = require('jsonwebtoken');

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');

const api = require.main.require('./src/api');
const meta = require.main.require('./src/meta');
const user = require.main.require('./src/user');
const db = require.main.require('./src/database');
const search = require.main.require('./src/search');
const topics = require.main.require('./src/topics');
const messaging = require.main.require('./src/messaging');
const categories = require.main.require('./src/categories');
const helpers = require.main.require('./src/controllers/helpers');
const routeHelpers = require.main.require('./src/routes/helpers');
//const shouts = require('../nodebb-plugin-shoutbox/lib/shouts');
//const socketPlugins = require.main.require('./src/socket.io/plugins');

const MFF_USER_UID = 1;

const MFFDiscordBridge = {
    token: "changeme",
    discordWebHook: "changeme",
    jwtSecret: "changeme",
    tutorialCategoryId: 0,
    supportCategoryId: 0,
    // Init the plugin
    async init(params) {
        const { router } = params;

        // Discord bridge api
        router.get('/discordapi/tutorial', getTutorial);
        router.get('/discordapi/solvedthread', getSolvedThread);
        //app.post('/discordapi/sendshout', checkToken, sendShout);

        // Discord link account page
        routeHelpers.setupPageRoute(router, '/discord', showLinkAccountPage);
        // Admin panel
        routeHelpers.setupAdminPageRoute(router, '/admin/plugins/mff-discord', renderAdmin);

        try {
            const options = await meta.settings.get('mffdiscordbridge');
            if (options.hasOwnProperty("token")) {
                MFFDiscordBridge.token = options["token"];
            }

            if (options.hasOwnProperty("webhook")) {
                MFFDiscordBridge.discordWebHook = options["webhook"];
            }

            if (options.hasOwnProperty("jwtSecret")) {
                MFFDiscordBridge.jwtSecret = options["jwtSecret"];
            }

            if (options.hasOwnProperty("tutocatid")) {
                MFFDiscordBridge.tutorialCategoryId = options["tutocatid"];
            }

            if (options.hasOwnProperty("supportcatid")) {
                MFFDiscordBridge.supportCategoryId = options["supportcatid"];
            }
        }
        catch (err) {
            console.log(`[plugin/mffdiscordbridge] Unable to retrieve settings, will keep defaults: ${err.message}`);
        }

        // let originSend = socketPlugins.shoutbox.send;
        // socketPlugins.shoutbox.send = (socket, data, callback) => {
        //     originSend(socket, data, callback); // call send from nodebb-plugin-shoutbox

        //     if (socket.uid && data && data.message) {
        //         user.getUsersWithFields([socket.uid], ['username', 'picture'], socket.uid, (err, userData) => {
        //             if (!err && userData && userData[0]) {
        //                 let avatarUrl = userData[0].picture.startsWith("http") ? userData[0].picture : (nconf.get('url') + userData[0].picture);
        //                 request.post(MFFDiscordBridge.discordWebHook, {
        //                     json: {
        //                         username: userData[0].username,
        //                         avatar_url: avatarUrl,
        //                         content: data.message.replace(/\@(here|everyone)/gi, "$1")
        //                     }
        //                 }, (error, response, body) => {
        //                     if (error) {
        //                         console.log(error);
        //                     }
        //                 });
        //             }
        //         });
        //     }
        // };
    },
    async addToAdminNav(header) {
        header.plugins.push({
            route: '/plugins/mff-discord',
            name: 'MFF Discord bridge',
        });
        return header;
    }
};

function showLinkAccountPage(req, res) {
    const jwtToken = req.query.token;
    const decoded = jwt.verify(jwtToken, MFFDiscordBridge.jwtSecret);
    return res.render('discord-link', {
        breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[mff-discord:link.discord]]' }]),
        title: '[[mff-discord:link.discord]]',
        id: decoded.id,
        displayName: decoded.displayName,
        avatarUrl: decoded.avatarUrl
    });
}

// check token middleware
function checkToken(req, res, next) {
    let token = req.body.token || req.query.token || "";
    if (token === MFFDiscordBridge.token) {
        next();
    } else {
        res.status(403).json({ message: "Invalid token!" });
    }
}

function getTutorial(req, res) {
    return searchInPost(req, res, [MFFDiscordBridge.tutorialCategoryId]);
}

function getSolvedThread(req, res) {
    return searchInPost(req, res, [MFFDiscordBridge.supportCategoryId]);
}

async function searchInPost(req, res, categories) {
    const data = {
        query: req.query.term,
        searchIn: 'titles',
        matchWords: 'all',
        categories: categories,
        searchChildren: true,
        hasTags: req.query.hasTags,
        sortBy: '',
        qs: req.query
    };

    try {
        const results = await search.search(data);
        const topicIds = results.posts.map(post => post && post.tid);

        try {
            const postTags = await topics.getTopicsTags(topicIds);
            if (results.posts.length === 0) {
                return res.status(200).json({ data: [] });
            }

            let response = {};
            if (!req.query.hasTags) { // only add none tag if there is not tags filter in the request
                response['none'] = [];
            }
            for (const tags of postTags) {
                for (const tag of tags) {
                    if (isTagInFilter(tag, req.query.hasTags)) {
                        response[tag] = [];
                    }
                }
            }

            for (const i in results.posts) {
                let post = {
                    title: results.posts[i].topic.title,
                    url: nconf.get('url') + '/topic/' + results.posts[i].topic.slug
                };
                if (postTags[i].length === 0) {
                    response['none'].push(post);
                } else {
                    for (const tag of postTags[i]) {
                        // avoid duplicate if topic has multiple tags
                        if (isTagInFilter(tag, req.query.hasTags)) {
                            response[tag].push(post);
                        }
                    }
                }
            }
            return res.status(200).json({ data: response });
        }
        catch (err2) {
            winston.error(err2);
            return res.status(500).json({ message: 'Error while getting topic tags' });
        }
    }
    catch (err) {
        winston.error(err);
        return res.status(500).json({ message: 'Error while performing the search' });
    }
}

function isTagInFilter(tag, tagsFilter) {
    return !tagsFilter || (tagsFilter && tagsFilter.indexOf(tag) >= 0);
}

// function sendShout(req, res) {
//     if (req.body.senderId && req.body.message && req.body.mentions) {
//         user.exists(req.body.senderId, (isExist) => {
//             user.getUsernamesByUids(req.body.mentions, (err, usernames) => {
//                 if (err) {
//                     console.error(`Couldn't find the name for an user : ${err}`);
//                     return res.status(500).json({error: "Couldn't retrieve an user from given id"});
//                 }
//                 if (usernames.indexOf(0) !== -1) {
//                     return res.status(500).json({error: "User not found"});
//                 }

//                 let index = 0;
//                 const message = req.body.message.replace(/<@![0-9]+>/g, function () {
//                     return '@' + usernames[index++];
//                 });

//                 shouts.addShout(req.body.senderId, message, function (err, shout) {
//                     if (err) {
//                         return res.status(500).json({error: "Failed to send shout"});
//                     }
//                     shout.fromBot = true;
//                     socketIndex.server.sockets.emit('event:shoutbox.receive', shout);
//                     return res.status(200).json({success: "true"});
//                 });
//             });
//             if (isExist)
//                 return res.status(500).json({error: "User not found"});
//         });
//     } else {
//         res.status(400).json({error: "Missing arguments"});
//     }
// }

async function renderAdmin(req, res) {
    const cids = await db.getSortedSetRange('categories:cid', 0, -1);
	const cats = await categories.getCategoriesFields(cids, ['cid', 'name']);
    res.render('admin/plugins/mff-discord', {
        title: 'MFF Discord integration',
		categories: cats
    });
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
