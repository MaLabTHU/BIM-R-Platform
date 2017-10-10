'use strict';

const estimateDb = require('../estimate-db.js');
const fs = require('fs-extra');
const requestify = require('requestify');

module.exports = {
    'estimateDb': {
        '#output project as json': {
            '': function (done) {
                estimateDb.Project.findOne({
                    include: [
                        {model: estimateDb.Upload},
                    ],
                }).then(project=> {
                    fs.outputJson('data/upload.test.json', project.upload, error=> {
                        if (!error) {
                            fs.outputJson('data/project.test.json', project, error=> {
                                if (!error) {
                                    done();
                                }
                            });
                        }
                    });
                });
            },
        },
        '#force sync estimateDb': {
            '': function (done) {
                this.timeout(30000);
                estimateDb._sync({force: true}).then(_=> {
                    done();
                });
            },
        },
        '#input json as project': {
            '': function (done) {
                fs.readJson('data/upload.json', (error, upload)=> {
                    if (!error) {
                        console.log(upload);
                        estimateDb.Upload.upsert(upload).then(_=> {
                            fs.readJson('data/project.json', (error, project)=> {
                                if (!error) {
                                    console.log(project);
                                    estimateDb.Project.upsert(project).then(_=> {
                                        done();
                                    });
                                }
                            });
                        });
                    }
                });
            },
        },
    },
};