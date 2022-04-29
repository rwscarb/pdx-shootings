# [pdx-shootings.com](https://pdx-shootings.com)

[![Fetch and Deploy](https://github.com/rwscarb/pdx-shootings/actions/workflows/default.yml/badge.svg)](https://github.com/rwscarb/pdx-shootings/actions/workflows/default.yml)

## Project Setup

```sh
$ npm i
```

### Secrets Setup

```sh
$ cp .env .env.local
$ vi .env.local
```

### Fetch the latest data

```sh
$ ./scripts/fetch-shootings.py
$ ./scripts/fetch-barrels.py
```

### Compile and Hot-Reload for Development

```sh
$ npm run dev
```

### Deploy (make sure to fetch first)

```sh
$ ./scripts/deploy.sh
```