# Handsup

Handsup is a digital application to raise your hand in a classroom.

## Getting started
The dependencies for Handsup will be retreived from npm.
```bash
npm install
```

### Config
There are only two configuration variables for Handsup which can be set either in the package.json or with environment variables.
__Example using package.json:__
```json
"config": {
	"port": 3000,
	"appRoot": "/appar/handsup"
}
```

__Example using environment varibles:__

```bash
export PORT=3000
export APPROOT=/appar/handsup
```
## Starting Handsup

Starting Handsup is no harder than:

```bash
npm run
```

Though it's recommended to use PM2 to keep the process running. A process.yml is provided in the repo for easy setup with PM2.

```Bash
npm install --global pm2
pm2 start process.yml
```

## Copyright

Copyright © 2017 IT-Gymnasiet Göteborg and contributors.
