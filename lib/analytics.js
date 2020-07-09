const Amplitude = require("@amplitude/node");
const debug = require("debug")("npm-groovy-lint");
const os = require("os");

let amplitudeClient;
let pkgJson;
let anonymousUserId;

// Record anonymous statistics for better use. Returns a promise that can be awaited by the caller or not
function recordAnonymousEvent(eventType, data) {
    debug("Analytics init: " + eventType);
    if (amplitudeClient == null) {
        amplitudeClient = Amplitude.init("2e52ce300e4bd3a76e97e27fe1bf31ad");
    }
    if (pkgJson == null) {
        pkgJson = getPackageJson();
    }
    if (anonymousUserId == null) {
        anonymousUserId = getUuidV4();
    }

    return new Promise(resolve => {
        const eventPayloadFiltered = buildEventPayload(data);
        amplitudeClient.logEvent({
            event_type: eventType,
            event_properties: eventPayloadFiltered,
            user_id: anonymousUserId,
            ip: "127.0.0.1"
        });
        debug("Analytics sent: " + eventType + " " + JSON.stringify(eventPayloadFiltered));
        resolve();
    });
}

function buildEventPayload(data) {
    const payloadFiltered = {
        app: pkgJson.name,
        appVersion: pkgJson.version,
        osPlatform: os.platform(),
        osRelease: os.release(),
        ci: process.env.CI ? true : false // boolean
    };
    // Status
    if (data.status || data.status === 0) {
        payloadFiltered.status = data.status === 0 ? 69 : data.status;
    }
    // Error
    if (data.error) {
        payloadFiltered.error = data.error;
    }
    // Elapsed time
    if (data.elapsed) {
        payloadFiltered.elapsedTimeMs = data.elapsed;
    }
    // Options
    if (data.options) {
        if (data.options.rulesets) {
            payloadFiltered.rulesets = data.options.rulesets;
        }
        if (data.options.overridenRules) {
            payloadFiltered.overridenRules = data.options.overridenRules;
        }
        if (data.options.path) {
            payloadFiltered.optionPath = data.options.path;
        }
        if (data.options.files) {
            payloadFiltered.optionFiles = data.options.files.replace(/\*/g, "#");
        } else if (data.options.sourcefilepath) {
            payloadFiltered.optionFiles = data.options.sourcefilepath;
        }
        if (data.options.parse) {
            payloadFiltered.optionParse = data.options.parse;
        }
        if (data.options.output) {
            payloadFiltered.optionOutput = data.options.output;
        }
        if (data.options.failonerror || data.options.failonwarning || data.options.failoninfo) {
            payloadFiltered.optionFailOn = data.options.failonerror ? "error" : data.options.failonwarning ? "warning" : "info";
        }
        if (data.options.codenarcargs) {
            payloadFiltered.optionCodeNarcArgs = data.options.codenarcargs;
        }
        if (data.options.ignorepattern) {
            payloadFiltered.optionIgnorePattern = data.options.ignorepattern;
        }
        if (data.options.config) {
            payloadFiltered.optionConfig = data.options.config;
        }
    }
    // Counters
    if (data.summary) {
        if (data.summary.totalFoundNumber) {
            payloadFiltered.totalFoundNumber = data.summary.totalFoundNumber;
        }
        if (data.options && [data.options.format, data.options.fix].includes(true) && data.summary.totalFixedNumber) {
            payloadFiltered.totalFixedNumber = data.summary.totalFixedNumber;
        }
        if (data.options && [data.options.format, data.options.fix].includes(true) && data.summary.totalRemainingNumber) {
            payloadFiltered.totalRemainingNumber = data.summary.totalRemainingNumber;
        }
    }
    return payloadFiltered;
}

// Retrieve npm-groovy-lint package.json
function getPackageJson() {
    const FindPackageJson = require("find-package-json");
    const finder = FindPackageJson(__dirname);
    const packageJsonFileNm = finder.next().filename;
    let pkg;
    if (packageJsonFileNm) {
        pkg = require(packageJsonFileNm);
    } else {
        pkg = { name: "npm-groovy-lint", version: "0.0.0" };
        console.warn(`package.json not found, use default value ${JSON.stringify(pkg)} instead`);
    }
    return pkg;
}

// Get unique anonymous user identifier
function getUuidV4() {
    const localStorageFileNm = "./local-storage.json";
    const fse = require("fs-extra");
    let usrLocalStorage = {};
    if (fse.existsSync(localStorageFileNm)) {
        usrLocalStorage = fse.readJsonSync(localStorageFileNm);
    }
    if (usrLocalStorage.anonymousUserId) {
        return usrLocalStorage.anonymousUserId;
    }
    const { v4: uuidv4 } = require("uuid");
    const anonUsrId = uuidv4();
    usrLocalStorage.anonymousUserId = anonUsrId;
    fse.writeJsonSync(localStorageFileNm, usrLocalStorage);
    return usrLocalStorage.anonymousUserId;
}

module.exports = { recordAnonymousEvent };