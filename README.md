# CSBK Birthday Party 2026 — 24-hour Championship

## Rules
- Hourly round starts at each `HH:00` in Asia/Jakarta (WIB).
- Default round lasts the first 60 seconds of each hour.
- Participants open the game link, enter their name, and tap the horn as much as possible during the round.
- Most taps in a round wins that round.
- Each round win gives the player 1 Championship Point. If there is a tie at the top, each tied player gets 1 point.
- The game posts the round winner and current championship leaderboard to Discord.
- At 23:59 WIB, the game posts the overall championship leaderboard to Discord.
- Championship points are saved in `championship.json` on the server filesystem. On Railway, local filesystem persistence can be lost when redeploying/restarting depending on setup. For a serious event, add a Railway Volume or a database and avoid redeploying during the event.

## Railway
Upload all contents of this folder to your GitHub repository root. In Railway -> service -> Variables, add:
- `DISCORD_WEBHOOK_URL` = Discord webhook URL for your announcement channel
- `ROUND_SECONDS` = `60`

The app runs with `npm start`. Share the Railway public domain with members.

## Discord webhook safety
Create a webhook from Discord channel settings -> Integrations -> Webhooks. Keep the URL private and store it only in Railway Variables. Do not put it in public GitHub code.

## Important fairness and reliability notes
- Keep one active server instance only, or duplicate announcements can happen.
- This is a fun event prototype. Browser tapping can be automated, and names are self-entered. Do not use it for a high-value prize without additional anti-cheat and account verification.
- Scores count by the entered display name, normalized to lowercase; different spelling/case can create separate entries.
- If a round has tied highest scores, all tied leaders receive one Championship Point.
