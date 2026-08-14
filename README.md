# dsh-client-ui-turn-rail

Conversation turn navigation rail for the dsh web client (user-installed, upgrade-safe).

- package source: `~/.dsh/profiles/web/vendor/dsh-client-ui-turn-rail/`
- linked into the profile store: `~/.dsh/profiles/node_modules/@deepseek-ai/dsh-client-ui-turn-rail`
- composition row: `~/.dsh/profiles/web/cordis.patch.yml` (`id: ui-turn-rail`)

## Re-link after a dsh upgrade re-provisions the profile store

```sh
ln -sfn ~/.dsh/profiles/web/vendor/dsh-client-ui-turn-rail \
  ~/.dsh/profiles/node_modules/@deepseek-ai/dsh-client-ui-turn-rail
```

## Rollback

Remove the `- insert:` block for `ui-turn-rail` in
`~/.dsh/profiles/web/cordis.patch.yml`, then restart `dsh web`.

## Layout of a turn

- each dot = one turn of the conversation (evenly spaced; rail height grows
  with the turn count and compresses to the scrollport height);
- active turn dot is highlighted; hovering a dot shows that turn's opening
  text; clicking a dot scrolls to that turn's start;
- the rail hides when the conversation does not overflow the scrollport.
