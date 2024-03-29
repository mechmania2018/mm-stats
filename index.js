const { promisify } = require("util");

const mongoose = require("mongoose");
const authenticate = require("mm-authenticate")(mongoose);
const { send } = require("micro");
const { router, get } = require("microrouter");
const { Script, Match } = require("mm-schemas")(mongoose);
const fetch = require("node-fetch");

mongoose.connect(process.env.MONGO_URL);
mongoose.Promise = global.Promise;

const getStatsForScript = async (req, res, key) => {
  console.log(`${req.user.name} - Getting matches for ${key}`);
  const matchesReq = await fetch(
    `https://matches.mechmania.io/matches/${key}`,
    {
      headers: {
        Authorization: `Bearer ${req.user.token}`
      }
    }
  );
  const matches = await matchesReq.json();
  console.log(`${req.user.name} - Calculating Wins/Losses`);
  let wins = 0;
  let losses = 0;
  let ties = 0;
  matches.forEach(({ match: { key: matchKey, winner } }) => {
    const p2 = matchKey.split(":")[1];
    if (winner === 3) {
      ties++;
    } else if (p2 === key) {
      // Logged in player was p2;
      if (winner === 2) {
        wins++;
      } else {
        losses++;
      }
    } else {
      // Logged in player was p1;
      if (winner === 1) {
        wins++;
      } else {
        losses++;
      }
    }
  });
  return send(res, 200, { wins, losses, ties });
};

module.exports = authenticate(
  router(
    get("/", async (req, res) => {
      const team = req.user;
      console.log(`${team.name} - Getting script`);
      const script = await Script.findById(team.latestScript).exec();
      return getStatsForScript(req, res, script.key);
    }),
    get("/:script", async (req, res) =>
      getStatsForScript(req, res, req.params.script)
    )
  )
);
