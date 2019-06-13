const TwitterPackage = require('twitter');
require('dotenv').config()

const secret = {
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
}

const client = new TwitterPackage(secret);

const sendTweet = (tweet) => {

    //build our reply object
    const statusObj = {status: tweet}

    //call the post function to tweet something
    client.post('statuses/update', statusObj,  function(error, tweetReply, response){

        //if we get an error print it out
        if(error){
            console.log(error);
        }

        //print the text of the tweet we sent out
        console.log(tweetReply.text);
    });
}

module.exports = {sendTweet}
