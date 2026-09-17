# Offline receipt verification

`aav runs show RUN_ID --json` emits a bundle containing `events` and `receipt`. Save it and verify without network or Cloud:

```sh
aav runs show RUN_ID --json > receipt.json
aav receipt verify receipt.json
```
