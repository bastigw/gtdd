const chalk = require("chalk");
const _ = require("lodash");
const gscan = require("gscan");

const levels = {
    error: chalk.red,
    warning: chalk.yellow,
    recommendation: chalk.yellow,
    feature: chalk.green,
};

const getSummary = (theme, options) => {
    let summaryText = "";
    const errorCount = theme.results.error.length;
    const warnCount = theme.results.warning.length;
    const pluralize = require("pluralize");
    const checkSymbol = "\u2713";

    if (errorCount === 0 && warnCount === 0) {
        if (options.onlyFatalErrors) {
            summaryText = `${chalk.green(
                checkSymbol
            )} Your theme has no fatal compatibility issues with Ghost ${
                theme.checkedVersion
            }`;
        } else {
            summaryText = `${chalk.green(
                checkSymbol
            )} Your theme is compatible with Ghost ${theme.checkedVersion}`;
        }
    } else {
        summaryText = `Your theme has`;

        if (!_.isEmpty(theme.results.error)) {
            summaryText += chalk.red.bold(
                ` ${pluralize("error", theme.results.error.length, true)}`
            );
        }

        if (
            !_.isEmpty(theme.results.error) &&
            !_.isEmpty(theme.results.warning)
        ) {
            summaryText += " and";
        }

        if (!_.isEmpty(theme.results.warning)) {
            summaryText += chalk.yellow.bold(
                ` ${pluralize("warning", theme.results.warning.length, true)}`
            );
        }

        summaryText += "!";

        // NOTE: had to subtract the number of 'invisible' formating symbols
        //       needs update if formatting above changes
        const hiddenSymbols = 38;
        summaryText += "" + _.repeat("-", summaryText.length - hiddenSymbols);
    }

    return summaryText;
};

const outputResult = (result, options, log) => {
    log(levels[result.level](`- ${_.capitalize(result.level)}:`), result.rule);

    if (options.verbose) {
        log(`${chalk.bold("Details:")} ${result.details}`);
    }

    if (result.failures && result.failures.length) {
        if (options.verbose) {
            log(""); // extra line-break
            log(`${chalk.bold("Files:")}`);
            result.failures.forEach((failure) => {
                log(`${failure.ref} - ${failure.message}`);
            });
        } else {
            log(`${chalk.bold("Files:")} ${_.map(result.failures, "ref")}`);
        }
    }

    log(""); // extra line-break
};

function outputResults(theme, options, log) {
    try {
        theme = gscan.format(theme, options);
    } catch (err) {
        log.error("Error formating result, some results may be missing.");
        log.error(err);
    }

    let errorCount = theme.results.error.length;

    log("" + getSummary(theme, options));

    if (!_.isEmpty(theme.results.error)) {
        log(chalk.red.bold("Errors"));
        log(chalk.red.bold("------"));
        log(chalk.red("Important to fix, functionality may be degraded."));

        _.each(theme.results.error, (rule) => outputResult(rule, options, log));
    }

    if (!_.isEmpty(theme.results.warning)) {
        log(chalk.yellow.bold("Warnings"));
        log(chalk.yellow.bold("--------"));

        _.each(theme.results.warning, (rule) =>
            outputResult(rule, options, log)
        );
    }

    if (!_.isEmpty(theme.results.recommendation)) {
        log(chalk.yellow.bold("Recommendations"));
        log(chalk.yellow.bold("---------------"));

        _.each(theme.results.recommendation, (rule) =>
            outputResult(rule, options, log)
        );
    }

    log(
        `Get more help at ${chalk.cyan.underline(
            "https://ghost.org/docs/api/handlebars-themes/"
        )}`
    );
    log(
        `You can also check theme compatibility at ${chalk.cyan.underline(
            "https://gscan.ghost.org/"
        )}`
    );
}

exports.outputResults = outputResults;
