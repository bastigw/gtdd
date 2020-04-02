# Theme Development Setup with Docker

Create a Theme with a Ghost Docker container.

## Prerequesites

First make sure to have [docker](https://docs.docker.com/) and [docker-compose](https://docs.docker.com/compose/) installed. These
will be used to run the **Ghost** instance for the theme development inside of a container.

## Installation and Setup

First of all clone this repository. 

```bash
npm install # Install all Dependencies

npm run dev # Start gulp to watch files and build theme into docker-mount directory

docker-compose up -d # Start docker container. Mounts to local docker-mount directory
```

Default port is `9090`. To change it edit `docker-compose.yml`

Go to [http://localhost:9090/ghost](http://localhost:9090/ghost/). Follow the instructions until you are on the admin page. Now go to http://localhost:9090/ghost/#/settings/design and at the bottom activate your theme. 

Changes that you now make in the source directory should be updated. Hot reload is not working currently. 

## Casper Theme

The default theme files are from [the official Casper Theme](https://github.com/TryGhost/Casper).

**A few files were modified:**

 - `gulpfile.js`: Added serveDocker function. This function builds the theme and stores it in the `docker-mount` directory

For more information about developing a the check out the Ghost [theme API documentation](https://ghost.org/docs/api/handlebars-themes/)


# Contributors

* [Maximilian Ehlers](https://github.com/b-m-f): with his [gotede](https://github.com/b-m-f/gotede) repository
* [Casper Theme Contributors](https://github.com/TryGhost/Casper/graphs/contributors)


# Copyright & License

Copyright (c) 2013-2020 Ghost Foundation - Released under the [MIT license](LICENSE).
