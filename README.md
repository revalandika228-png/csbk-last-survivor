# CSBK MOBA ARENA 3D — Beta

Browser-based 3D multiplayer MOBA prototype for the CSBK birthday event.

## Deploy on Railway
1. Upload all files in this folder to the root of your GitHub repository.
2. Railway should detect Node.js and run `npm start`.
3. Open the public domain from Railway.
4. Open the same domain in two browsers/devices to test multiplayer.

## Controls
- Desktop: WASD or arrow keys to move.
- Mobile: joystick at bottom left.
- Attack button: 20 damage, close range.
- Skill button: 35 damage, longer range.
- Defeated players respawn after 5 seconds (normal attack respawn is implemented).

## Important beta limitations
This is an MVP, not a finished commercial MOBA. It has stylized blocky 3D heroes, arena lanes, towers, basic multiplayer movement, attack/skill and HP. It does not yet have minion AI, base destruction, matchmaking/room codes, anti-cheat, or Discord result announcements. It uses Three.js from a CDN, so the browser needs internet access.
