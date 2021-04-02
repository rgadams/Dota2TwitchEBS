const express = require('express');
const bodyParser = require('body-parser');
const jsonpack = require('jsonpack/main');
const jsonParser = bodyParser.json();
const app = express();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const heroes = require('./resources/heroes_data.json');
const nt = require('./name_translator.js');

const NameTranslator = new nt();

if (!process.env.EXTENSION_CLIENT_ID ||
    !process.env.EXTENSION_SECRET_KEY) {
        throw new Error('Could not start server, missing environment variables!');
    }

app.post('/api/Dota2/submitGameData/:channelId', jsonParser, (req, res) => {
    validateGameData();
    const message = translateGameData(req.body);
    console.log(message);
    sendPubSubMessage(req.params.channelId, message);
    res.sendStatus(200);
});
app.post('/api/Dota2/testGameData', jsonParser, (req, res) => {
    validateGameData();
    const message = translateGameData(req.body);
    res.sendStatus(200);
});
app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
});

/**
 * Sends a message to the specified Twitch channel via PubSub.
 * 
 * @param channelId Twitch channel to send the PubSub message to
 * @param message The data to send to the channel
 */
function sendPubSubMessage(channelId, message) {
    const pubSubUrl = `https://api.twitch.tv/extensions/message/${channelId}`;
    const payload = {
        'content_type': 'application/json',
        'message': JSON.stringify(message),
        'targets': [ 'broadcast' ]
    }
    const token = generateAuthToken(channelId);
    const options = {
        headers: {
            'Content-Type': 'application/json',
            'Client-Id': process.env.EXTENSION_CLIENT_ID,
            'Authorization': 'Bearer ' + token,
        }
    }

    axios.post(pubSubUrl, payload, options)
        .catch((response) => {
            console.log('Error', response.response.data.message)
        })
}

function translateGameData(gameData) {
    const hero = heroes[gameData.heroId];

    translatedGameState = {
        heroId: gameData.heroId,
        neutralItem: gameData.neutralItem,
        talentChoices: gameData.talentChoices,
        consumedScepter: gameData.consumedScepter,
        consumedShard: gameData.consumedShard,
    }

    translatedGameState.abilities = Object.values(gameData.abilities)
        .map((ability) => {
            return NameTranslator.translateAbilityName(ability.name, hero.name);
        });

    translatedGameState.activeItems = gameData.activeItems.map((item) => { 
        return NameTranslator.translateItemName(item);
    }); 
    translatedGameState.backpackItems = gameData.backpackItems.map((item) => {
        return NameTranslator.translateItemName(item);
    });

    return translatedGameState;
}

/**
 * This just checks to make sure we are getting data that makes sense.
 * We don't want to pass on messed up data to twitch.
 * 
 * @param gameData The data to validate as Dota2 Game Data
 */
function validateGameData(gameData) {
    //TODO
}

/**
 * Generates a JWT to use in the Authorization: Bearer header for twitch
 * 
 * @param channelId The id of the twitch channel we're sending data to
 * 
 * TODO: Cache these tokens for each channel so we don't have to keep generating them on each request.
 */
function generateAuthToken(channelId) {

    let rawJWT = {
        exp: Math.floor(Date.now()/1000) + 1*60*60,
        user_id: 'softshadow',
        role: 'external',
        channel_id: channelId,
        pubsub_perms: {
            send: ["*"]
        }
    }
    const secret = Buffer.from(process.env.EXTENSION_SECRET_KEY, 'base64');
    const token = jwt.sign(rawJWT, secret);
    return token;
}