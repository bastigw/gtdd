const gulp = require("gulp");

// gulp plugins and utils
const postcss = require("gulp-postcss");
const sourcemaps = require("gulp-sourcemaps");
const zip = require("gulp-zip");
const concat = require("gulp-concat");

// postcss plugins
const postCSSPresetEnv = require("postcss-preset-env");
const autoprefixer = require("autoprefixer");
const postCSSImport = require("postcss-import");

//babel
const babel = require("gulp-babel");

const source = ".",
  destination = "./docker-mount";

// Partial 

gulp.task("partial", function() {
  return gulp.src(``${source}/assets/css/styles.css``)
});

gulp.task("watch-css", function() {
  gulp.watch(`${source}/assets/css/**/*.css`, gulp.series("css"));
});


//  CSS
gulp.task("css", function() {
  const processors = [
    postCSSImport(),
    postCSSPresetEnv({
      stage: 3,
      features: {
        "nesting-rules": true
      }
    }),
    autoprefixer
  ];
  return gulp
    .src(`${source}/assets/css/styles.css`)
    .pipe(sourcemaps.init())
    .pipe(postcss(processors))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("assets/built/"));
});

gulp.task("watch-css", function() {
  gulp.watch(`${source}/assets/css/**/*.css`, gulp.series("css"));
});

// JavaScript

gulp.task("js", function() {
  return gulp
    .src(`${source}/assets/js/**/*.js`)
    .pipe(sourcemaps.init())
    .pipe(
      babel({
        presets: [
          [
            "@babel/env",
            {
              targets: {
                browsers: "> 5%"
              }
            }
          ]
        ]
      })
    )
    .pipe(concat("main.js"))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("assets/built/"));
});

gulp.task("watch-js", function() {
  gulp.watch(`${source}/assets/js/**/*.js`, gulp.series("js"));
});

// File mover
const sourceFiles = [
  "*.hbs",
  "assets/built/**/*",
  "package.json",
  "locales**/*"
];

gulp.task("move-source-files", function(done) {
  gulp.src(sourceFiles, { base: source }).pipe(gulp.dest(destination));
  done();
});

gulp.task("watch-source-files", function() {
  gulp.watch(sourceFiles, gulp.series("move-source-files"));
});

// MISC
gulp.task(
  "watch",
  gulp.series(
    "css",
    "js",
    "move-source-files",
    gulp.parallel("watch-css", "watch-js", "watch-source-files")
  )
);

gulp.task(
  "zip",
  gulp.series("css", function() {
    const targetDir = "zip/";
    const themeName = require("./package.json").name;
    const filename = themeName + ".zip";

    return gulp
      .src([
        "**",
        "!node_modules",
        "!node_modules/**",
        "!zip",
        "!zip/**",
        "!docker-mount",
        "!docker-mount/**"
      ])
      .pipe(zip(filename))
      .pipe(gulp.dest(targetDir));
  })
);

gulp.task("default", gulp.series("watch"));
