const Snoowrap = require("snoowrap");
const { CommentStream } = require("snoostorm");
require("dotenv").config();
const {
  readFileSync,
  existsSync,
  writeFileSync,
  createReadStream,
} = require("fs");

const BOT_START = Date.now() / 1000;

const client = new Snoowrap({
  userAgent: "drs-flair",
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

const comments = new CommentStream(client, {
  subreddit: "GME_Flair_DRS",
  limit: 10,
  pollTime: 1000,
});
const csv = require("csv-parser");
const { createObjectCsvWriter } = require("csv-writer");

comments.on("item", async (item) => {
  if (item.created_utc < BOT_START || item.body.length < 9) return;

  const owner = item.author.name;
  const commentText = item.body;
  const drsFlair = "!drsflair";
  const startOfComment = commentText.substring(0, 9);

  if (commentText.includes(drsFlair) && startOfComment == drsFlair) {
    const flair = commentText.substring(9).trim();
    const trueFlair = flair.toLowerCase();
    const flairLength = flair.length;
    const flairCsv = `./flairs.csv`;
    const flairPromise = item.subreddit.setMultipleUserFlairs([
      //item.author.assignFlair({ text: flair });
      { name: owner, text: flair },
    ]);

    console.log(`Trying to register ${flair} for ${owner}`);

    let records = [];
    const flairCsvWriter = createObjectCsvWriter({
      path: flairCsv,
      header: [
        { id: "owner", title: "owner" },
        { id: "flair", title: "flair" },
      ],
    });

    if (existsSync(flairCsv)) {
      createReadStream(flairCsv)
        .pipe(csv())
        .on("data", (data) => records.push(data))
        .on("end", async () => {
          let finalMessage = "";
          let flairExistsRow = -1;
          let userAlreadyHasFlairRow = -1;

          for (var i = 0; i < records.length; i++) {
            if (owner == records[i].owner) {
              userAlreadyHasFlairRow = i;
            }

            if (trueFlair == records[i].flair.toLowerCase()) {
              flairExistsRow = i;
            }
          }

          if (flairExistsRow >= 0) {
            if (records[flairExistsRow].owner == owner) {
              finalMessage = `It looks like you already have this flair but you're re-registering it for some reason. I do things case sensitive so you're probably fixing something there. I went ahead and updated your flair for you, have a nice day punk.`;

              await flairPromise;
            } else {
              finalMessage = `Nice try Kenny, u/${records[flairExistsRow].owner} already has that flair registered.`;
            }
          } else if (userAlreadyHasFlairRow >= 0) {
            finalMessage = `You already have a flair registered and we only allow 1 per person. I have de-registered your old Flair and registered your new flair. If you want your old flair back, better hurry because anyone can get it now.`;

            records[userAlreadyHasFlairRow] = {
              owner,
              flair,
            };

            await flairPromise;
          } else {
            finalMessage = `Your flair has been registered!`;
            records.push({
              owner,
              flair,
            });
            await flairPromise;
          }

          if (records.length > 0) await flairCsvWriter.writeRecords(records);
          await item.reply(finalMessage);
        });
    } else {
      finalMessage = `Your flair has been registered!`;
      await flairPromise;
      await item.reply(finalMessage);
      await flairCsvWriter.writeRecords([
        {
          owner,
          flair,
        },
      ]);
    }
  }
});

function doStuff() {}

function run() {
  setInterval(doStuff, 30000);
}

run();
