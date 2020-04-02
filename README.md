# Theme Development Setup with Docker

Create a Theme with a Ghost Docker container.

## Prerequesites

First make sure to have [docker](https://docs.docker.com/) and [docker-compose](https://docs.docker.com/compose/) installed. These
will be used to run the **Ghost** instance for the theme development inside of a container.

## Installation and Setup

```bash
git clone https://github.com/bastigw/gtdd.git theme-name # First of all clone this repository.
cd theme-name

npm install # Install all Dependencies

npm run dev # Start gulp to watch files and build theme into docker-mount directory

docker-compose up -d # Start docker container. Mounts to local docker-mount directory
```

Default ghost port is `9090`. To change it edit `docker-compose.yml`. If you change the port and do not edit the browser-sync initialization in the gulpfile hot reloading will not work.

Changes that you now make in the source directory should be updated. The default port for hot reloading is `3000`.

Go to http://localhost:3000/ghost/. Follow the instructions until you are on the admin page. Now go to http://localhost:3000/ghost/#/settings/design and at the bottom activate your theme.

### Configuration

Make sure to edit the `package.json`.

## Casper Theme

The default theme files are from [the official Casper Theme](https://github.com/TryGhost/Casper).

**A few files were modified:**

-   `gulpfile.js`: Added serveDocker function. This function builds the theme and stores it in the `docker-mount` directory

-   `package.json`: Livereload dependency was swapped for browser-sync

For more information about developing a theme check out the Ghost [Theme API documentation](https://ghost.org/docs/api/handlebars-themes/)

# Contributors

-   [Maximilian Ehlers](https://github.com/b-m-f): with his [gotede](https://github.com/b-m-f/gotede) repository
-   [Casper Theme Contributors](https://github.com/TryGhost/Casper/graphs/contributors)

# Copyright & License

Copyright (c) [S. Bauer](https://github/bastigw) - Released under the [MIT license](LICENSE).
