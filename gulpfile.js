const { series, watch, src, dest, parallel } = require("gulp");
const pump = require("pump");
const path = require("path");
const releaseUtils = require("@tryghost/release-utils");
const inquirer = require("inquirer");
const chalk = require("chalk");
const _ = require("lodash");

// gulp plugins and utils
const postcss = require("gulp-postcss");
const zip = require("gulp-zip");
const concat = require("gulp-concat");
const uglify = require("gulp-uglify");
const fs = require("fs");
const log = require("fancy-log");
const PluginError = require("plugin-error");
const changed = require("gulp-changed");

// postcss plugins
const autoprefixer = require("autoprefixer");
const colorFunction = require("postcss-color-function");
const cssnano = require("cssnano");
const customProperties = require("postcss-custom-properties");
const easyimport = require("postcss-easy-import");
const tailwindcss = require("tailwindcss");
const purgecss = require("@fullhuman/postcss-purgecss");

// browser sync
browserSync = require("browser-sync").create();

// gscan
const gscan = require("gscan");
const defaultOptions = {
    checkVersion: "v3",
    verbose: false,
    onlyFatalErrors: false,
};
const { outputResults } = require("./helpers/log");

// const REPO = "TryGhost/Casper";
// const REPO_READONLY = "TryGhost/Casper";
// const USER_AGENT = "Casper";
// const CHANGELOG_PATH = path.join(process.cwd(), ".", "changelog.md");
const themeName = require("./package.json").name;

const paths = {
    css: {
        src: ["assets/css/**/*.css"],
        dest: "assets/built/",
    },
    js: {
        src: [
            // pull in lib files first so our own code can depend on it
            "assets/js/lib/*.js",
            "assets/js/*.js",
        ],
        dest: "assets/built/",
    },
    tailwind: {
        config: "tailwind.config.js",
        src: "assets/css/tailwind.css",
    },
    hbs: {
        src: ["**/*.hbs", ...ignore(["docker-mount", "docker-mount/**"])],
    },
    serve: {
        docker: {
            toIgnore: [
                "node_modules",
                "node_modules/**",
                "dist",
                "dist/**",
                "docker-compose.yml",
                "docker-mount",
                "docker-mount/**",
                "assets/css/**",
                "assets/js/**",
            ],
            dest: "docker-mount/",
        },
        zip: {
            toIgnore: [
                "node_modules",
                "node_modules/**",
                "dist",
                "dist/**",
                // "docker-compose.yml",
                "docker-mount",
                "docker-mount/**",
                // "assets/css/**",
                // "assets/js/**",
            ],
            dest: "dist/",
        },
    },
};

function ignore(path) {
    if (Array.isArray(path)) {
        const ignored = [];
        path.forEach(
            (element, index) => (ignored[index] = "!".concat(element))
        );
        return ignored;
    } else {
        return "!".concat(path);
    }
}

function serve(done) {
    browserSync.init({
        proxy: "http://localhost:" + 9090,
        open: false,
        notify: false,
    });
    done();
}

const handleError = (done) => {
    return function (err) {
        if (err) {
            log(err);
        }
        return done(err);
    };
};

const css_actions = [
    easyimport,
    customProperties({ preserve: false }),
    colorFunction(),
    autoprefixer(),
    cssnano(),
];

function checkTheme(done, buildPath, options) {
    options = options || defaultOptions;
    buildPath = buildPath || "docker-mount/";
    gscan
        .check(buildPath, options)
        .then((theme) => {
            outputResults(theme, options, log);
            if (theme.results.error.length) {
                throw new PluginError(
                    "gscan",
                    "Gscan raised an error. Please check the log above and resolve the error."
                );
            }
            done();
        })
        .catch((err) => {
            log.error(chalk.red("-".repeat(20)));
            log.error(chalk.red.bold(err.message));
            log.error(chalk.red("-".repeat(20)));
            done();
        });
}

/**
 * Build TailwindCSS style once
 * and apply purgecss
 * @param {*} done
 */
function css_prod(done) {
    pump(
        [
            src(paths.css.src, { sourcemaps: true }),
            postcss([
                tailwindcss(paths.tailwind.config),
                ...css_actions,
                purgecss({
                    content: paths.hbs.src,
                    defaultExtractor: (content) =>
                        content.match(/[\w-/:]+(?<!:)/g) || [],
                }),
            ]),
            dest(paths.css.dest, { sourcemaps: "." }),
        ],
        handleError(done)
    );
}

/**
 * Build TailwindCSS style once
 *
 * @param {*} done
 */
function css_startup(done) {
    pump(
        [
            src(paths.css.src, { sourcemaps: true }),
            postcss([tailwindcss(paths.tailwind.config), ...css_actions]),
            dest(paths.css.dest, { sourcemaps: "." }),
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
            src([...paths.css.src, ignore(paths.tailwind.src)], {
                sourcemaps: true,
            }),
            postcss([...css_actions]),
            dest(paths.css.dest, { sourcemaps: "." }),
        ],
        handleError(done)
    );
}

function js(done) {
    pump(
        [
            src(paths.js.src, { sourcemaps: true }),
            concat(`${themeName}.js`),
            uglify(),
            dest(paths.js.dest, { sourcemaps: "." }),
        ],
        handleError(done)
    );
}

function zipper(done) {
    const filename = `${themeName}.zip`;
    pump(
        [
            src(["**", ...ignore(paths.serve.zip.toIgnore)]),
            zip(filename),
            dest(paths.serve.zip.dest),
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
            src(["**", ...ignore(paths.serve.docker.toIgnore)]),
            changed(paths.serve.docker.dest),
            dest(paths.serve.docker.dest),
        ],
        handleError(done)
    );
}

const build_dev = [checkTheme, serveDocker, reload];
const cssWatcher = () => watch(paths.css.src, series(css, ...build_dev));
const hbsWatcher = () => watch(paths.hbs.src, series(...build_dev));
const watcher = parallel(cssWatcher, hbsWatcher);
const build = series(css_startup, js, serveDocker, checkTheme);
const build_prod = series(css_prod, js, serveDocker);

exports.build = build;
exports.build_prod = build_prod;
exports.zip = series(build, zipper);
exports.default = series(build, serve, watcher);
exports.test = series(checkTheme);

const previousRelease = () => {
    return releaseUtils.releases
        .get({
            userAgent: USER_AGENT,
            uri: `https://api.github.com/repos/${REPO_READONLY}/releases`,
        })
        .then((response) => {
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
                default: "3.0.0",
            },
        ])
        .then((result) => {
            let compatibleWithGhost = result.compatibleWithGhost;

            previousRelease().then((previousVersion) => {
                const changelog = new releaseUtils.Changelog({
                    changelogPath: CHANGELOG_PATH,
                    folder: path.join(process.cwd(), "."),
                });

                changelog
                    .write({
                        githubRepoPath: `https://github.com/${REPO}`,
                        lastVersion: previousVersion,
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
                            token: config.github.token,
                        },
                        content: [
                            `**Compatible with Ghost ≥ ${compatibleWithGhost}**\n\n`,
                        ],
                        changelogPath: CHANGELOG_PATH,
                    })
                    .then((response) => {
                        console.log(
                            `\nRelease draft generated: ${response.releaseUrl}\n`
                        );
                    });
            });
        });
};
