const { series, watch, src, dest, parallel } = require("gulp");
const pump = require("pump");
const path = require("path");
const releaseUtils = require("@tryghost/release-utils");
const inquirer = require("inquirer");

// gulp plugins and utils
const postcss = require("gulp-postcss");
const zip = require("gulp-zip");
const concat = require("gulp-concat");
const uglify = require("gulp-uglify");
const beeper = require("beeper");
const fs = require("fs");

// postcss plugins
const autoprefixer = require("autoprefixer");
const colorFunction = require("postcss-color-function");
const cssnano = require("cssnano");
const customProperties = require("postcss-custom-properties");
const easyimport = require("postcss-easy-import");
const tailwindcss = require("tailwindcss");
const tailwind_config = "./tailwind.config.js";
const purgecss = require("@fullhuman/postcss-purgecss");

const REPO = "TryGhost/Casper";
const REPO_READONLY = "TryGhost/Casper";
const USER_AGENT = "Casper";
const CHANGELOG_PATH = path.join(process.cwd(), ".", "changelog.md");
const theme_name = require("./package.json").name;

// browser sync
browserSync = require("browser-sync").create();

function serve(done) {
    browserSync.init({
        proxy: "http://localhost:" + 9090,
        open: false,
        notify: false
    });
    done();
}

const handleError = done => {
    return function(err) {
        if (err) {
            beeper();
        }
        return done(err);
    };
};

/**
 * Build TailwindCSS style once
 * and if in prod use purgecss
 * @param {*} done
 */
function css_startup(done) {
    pump(
        [
            src("assets/css/*.css", { sourcemaps: true }),
            postcss([
                tailwindcss(tailwind_config),
                easyimport,
                customProperties({ preserve: false }),
                colorFunction(),
                autoprefixer(),
                cssnano(),
                ...(process.env.NODE_ENV === "production"
                    ? [
                          purgecss({
                              content: ["**/*.hbs"],
                              defaultExtractor: content =>
                                  content.match(/[\w-/:]+(?<!:)/g) || []
                          })
                      ]
                    : [])
            ]),
            dest("assets/built/", { sourcemaps: "." })
        ],
        handleError(done)
    );
}

/**
 * Build css without tailwindcss
 *
 * @param {*} done
 */
function css(done) {
    pump(
        [
            src("assets/css/*.css", { sourcemaps: true }),
            postcss([
                easyimport,
                customProperties({ preserve: false }),
                colorFunction(),
                autoprefixer(),
                cssnano()
            ]),
            dest("assets/built/", { sourcemaps: "." })
        ],
        handleError(done)
    );
}

function js(done) {
    pump(
        [
            src(
                [
                    // pull in lib files first so our own code can depend on it
                    "assets/js/lib/*.js",
                    "assets/js/*.js"
                ],
                { sourcemaps: true }
            ),
            concat(`${theme_name}.js`),
            uglify(),
            dest("assets/built/", { sourcemaps: "." })
        ],
        handleError(done)
    );
}

function hbs(done) {
    src(["*.hbs", "partials/**/*.hbs"]);
    handleError(done);
}

function zipper(done) {
    const filename = require("./package.json").name + ".zip";

    pump(
        [
            src([
                "**",
                "!node_modules",
                "!node_modules/**",
                "!dist",
                "!dist/**"
            ]),
            zip(filename),
            dest("dist/")
        ],
        handleError(done)
    );
}

function reload(done) {
    browserSync.reload();
    done();
}

function serveDocker(done) {
    pump(
        [
            src([
                "**",
                "!node_modules",
                "!node_modules/**",
                "!dist",
                "!dist/**",
                "!docker-compose.yml",
                "!docker-mount",
                "!docker-mount/**",
                "!assets",
                "!assets/**"
            ]),
            dest("docker-mount/")
        ],
        handleError(done)
    );
    pump(
        [src(["assets/built/*"]), dest("docker-mount/assets/built")],
        handleError(done)
    );
}

const cssWatcher = () =>
    watch("assets/css/**", series(css, serveDocker, reload));
const hbsWatcher = () =>
    watch(["*.hbs", "partials/**/*.hbs"], series(serveDocker, reload));
const watcher = parallel(cssWatcher, hbsWatcher);
const build = series(css_startup, js, serveDocker);

exports.build = build;
exports.zip = series(build, zipper);
exports.default = series(build, serve, watcher);

const previousRelease = () => {
    return releaseUtils.releases
        .get({
            userAgent: USER_AGENT,
            uri: `https://api.github.com/repos/${REPO_READONLY}/releases`
        })
        .then(response => {
            if (!response || !response.length) {
                console.log("No releases found. Skipping...");
                return;
            }

            let prevVersion = response[0].tag_name || response[0].name;
            console.log(`Previous version ${prevVersion}`);
            return prevVersion;
        });
};

exports.release = () => {
    // @NOTE: https://yarnpkg.com/lang/en/docs/cli/version/
    // require(./package.json) can run into caching issues, this re-reads from file everytime on release
    var packageJSON = JSON.parse(fs.readFileSync("./package.json"));
    const newVersion = packageJSON.version;

    if (!newVersion || newVersion === "") {
        console.log(`Invalid version: ${newVersion}`);
        return;
    }

    console.log(`\nCreating release for ${newVersion}...`);

    let config;
    try {
        config = require("./config");
    } catch (err) {
        config = null;
    }

    if (
        !config ||
        !config.github ||
        !config.github.username ||
        !config.github.token
    ) {
        console.log(
            "Please copy config.example.json and configure Github token."
        );
        return;
    }

    inquirer
        .prompt([
            {
                type: "input",
                name: "compatibleWithGhost",
                message: "Which version of Ghost is it compatible with?",
                default: "3.0.0"
            }
        ])
        .then(result => {
            let compatibleWithGhost = result.compatibleWithGhost;

            previousRelease().then(previousVersion => {
                const changelog = new releaseUtils.Changelog({
                    changelogPath: CHANGELOG_PATH,
                    folder: path.join(process.cwd(), ".")
                });

                changelog
                    .write({
                        githubRepoPath: `https://github.com/${REPO}`,
                        lastVersion: previousVersion
                    })
                    .sort()
                    .clean();

                releaseUtils.releases
                    .create({
                        draft: true,
                        preRelease: false,
                        tagName: newVersion,
                        releaseName: newVersion,
                        userAgent: USER_AGENT,
                        uri: `https://api.github.com/repos/${REPO}/releases`,
                        github: {
                            username: config.github.username,
                            token: config.github.token
                        },
                        content: [
                            `**Compatible with Ghost ≥ ${compatibleWithGhost}**\n\n`
                        ],
                        changelogPath: CHANGELOG_PATH
                    })
                    .then(response => {
                        console.log(
                            `\nRelease draft generated: ${response.releaseUrl}\n`
                        );
                    });
            });
        });
};
