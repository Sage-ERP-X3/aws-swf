#!/usr/bin/env node

var colors = require('colors'),
    optimist = require('optimist'),
    path = require('path'),
    fs = require('fs'),
    async = require('async');

var config, configFilePath = path.join(__dirname, '..', 'config.js');
try {
    config = require(configFilePath);
} catch (ex) {
    console.error(("Config file not found : " + configFilePath + "\nCall 'swf-set-credentials' first !").red);
    process.exit(1);
}

var argv = optimist
    .usage('Register a new activity-type, workflow or domain on AWS SWF.\nUsage: swf-register resource-name')
    .options('k', {
        'alias' : 'kind',
        'default' : 'activity',
        'describe': 'Kind of resource to register. "activity", "workflow", or "domain"'
    })
    .check(function (value) {
        return (value.k === 'activity') || (value.k === 'workflow') || (value.k === 'domain');
    })
    .options('d', {
        'alias' : 'domain',
        'default' : config.domain,
        'describe': 'SWF domain of the activity-type or workflow to register'
    })
    .options('v', {
        'alias' : 'version',
        'default' : '1.0',
        'describe': 'version of the activity-type or workflow to register'
    })
    .options('h', {
        'alias' : 'help',
        'describe': 'show this help'
    })
    .argv;

if (argv.help) {
    optimist.showHelp();
    process.exit(0);
}

var swf = require('../index');
var swfClient = swf.createClient(config);


var registerWorkflows = function (toRegister) {

    var registerAT = function (a, callback) {
        console.log("registering Workflow : ", a, argv.version);
        swfClient.call("RegisterWorkflowType",  {
            domain: argv.domain,
            name: a,
            version: argv.version
        }, function (err, results) {
            if (err) { console.log("err: ", err); }
            //console.log("RegisterActivityType results: ", results);
            callback();
        });
    };

    async.map(toRegister, registerAT, function (err) {
        if (err) {
            console.log(err);
        }
    });

};


var registerMissingWorkflows = function (workflowsToRegister) {

    swfClient.call("ListWorkflowTypes",  {
        domain: argv.domain,
        registrationStatus: "REGISTERED",
        maximumPageSize: 500
    }, function (err, registeredWorkflows) {
        if (err) {
            console.log("error", err);
            return;
        }

        registeredWorkflows = registeredWorkflows.typeInfos.map(function (w) {
            return w.workflowType.name + '-v' + w.workflowType.version;
        });

        var toRegister = [];

        workflowsToRegister.forEach(function (a) {
            if (registeredWorkflows.indexOf(a + '-v' + argv.version) === -1) {
                console.log("Workflow " + a + " not registered yet !");
                toRegister.push(a);
            } else {
                console.log("Workflow " + a + " already registered !");
            }
        });

        if (toRegister.length > 0) {
            registerWorkflows(toRegister);
        }

    });

};


var registerActivityTypes = function (toRegister) {

    var registerAT = function (a, callback) {
        console.log("registering ActivityType : ", a, argv.version);
        swfClient.call("RegisterActivityType",  {
            domain: argv.domain,
            name: a,
            version: argv.version
        }, function (err, results) {
            if (err) { console.log("err: ", err); }
            //console.log("RegisterActivityType results: ", results);
            callback();
        });
    };

    async.map(toRegister, registerAT, function (err) {
        if (err) {
            console.log(err);
        }
    });

};

var registerMissingActivityTypes = function (activityTypesToRegister) {

    swfClient.call("ListActivityTypes",  {
        domain: argv.domain,
        registrationStatus: "REGISTERED",
        maximumPageSize: 500
    }, function (err, registeredActivityTypes) {
        if (err) {
            console.log("error", err);
            return;
        }

        registeredActivityTypes = registeredActivityTypes.typeInfos.map(function (w) {
            return w.activityType.name + '-v' + w.activityType.version;
        });

        var toRegister = [];

        activityTypesToRegister.forEach(function (a) {
            if (registeredActivityTypes.indexOf(a + '-v' + argv.version) === -1) {
                console.log("ActivityType " + a + " not registered yet !");
                toRegister.push(a);
            } else {
                console.log("ActivityType " + a + " already registered !");
            }
        });

        if (toRegister.length > 0) {
            registerActivityTypes(toRegister);
        }

    });

};

/**
 * Register everything within the current working directory
 */
if (argv._.length === 0) {

    // List workflows using a disk access
    var workflowsToRegister = [];
    var activityTypesToRegister = [];
    fs.readdirSync(process.cwd()).forEach(function (file) {
        var m;
        try {
            m = require(path.join(process.cwd(), file));
        } catch (ex) {}
        if (m.workflow) { workflowsToRegister.push(file); }
        if (m.worker) { activityTypesToRegister.push(file); }
    });

    if (workflowsToRegister.length > 0) {
        registerMissingWorkflows(workflowsToRegister);
    }

    if (activityTypesToRegister.length > 0) {
        registerMissingActivityTypes(activityTypesToRegister);
    }

} else {

    /**
     * Single registration
     */

    var action, params;

    if (argv.k === "activity") {
        action = "RegisterActivityType";
        params = {
            name: argv._[0],
            domain: argv.d,
            version: argv.v
        };
    } else if (argv.k === "workflow") {
        action = "RegisterWorkflowType";
        params = {
            name: argv._[0],
            domain: argv.d,
            version: argv.v
        };
    } else if (argv.k === "domain") {
        action = "RegisterDomain";
        params = {
            name: argv._[0],
            description: "no description",
            workflowExecutionRetentionPeriodInDays: "1"
        };
    }

    swfClient.call(action,  params, function (err, results) {

        if (err) {
            console.error(("Error in " + action).red);
            console.error(err);
            process.exit(1);
        }

        console.log(action + " OK !");
        console.log("results: ", results);

    });

}
