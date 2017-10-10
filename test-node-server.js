'use strict';

const requestify = require('requestify');

function log(msg) {
    console.log(msg);
}

function get(url) {
    return new Promise((resolve, reject) => {
        requestify.get(url).then(res => {
            resolve(res.getBody());
        }).catch(reject);
    });
}

function post(url, data) {
    return new Promise((resolve, reject) => {
        requestify.post(url, data).then(res => {
            resolve(res.getBody());
        }).catch(reject);
    });
}

let restifyApi = 'http://127.0.0.1:4999/';

function getProjects() {
    return get(restifyApi + 'v1/projects');
}

function getDefaultProject() {
    return new Promise((resolve, reject) => {
        getProjects().then(projects => {
            if (projects.length) {
                resolve(projects[0]);
            } else {
                reject(new Error('no project'));
            }
        }).catch(reject);
    });
}

function analyzeProject(project) {
    return post(restifyApi + 'v1/projects/' + project.id + '/analyze');
}

module.exports = {
    'v1/projects': {
        '/{projectId}/analyze': {
            'post': function (done) {
                this.timeout(30000);
                getDefaultProject().then(project => {
                    return analyzeProject(project);
                }).then(project => {
                    log(project);
                    done();
                }).catch(log);
            },
            'get': function (done) {
                // todo
                done();
            },
        },
        // '/{projectId}/products': {
        //     'get': function (done) {
        //         getDefaultProject().then(project=> {
        //             return get(sparkApi + 'v1/projects/' + project.id + '/products')
        //         }).then(products=> {
        //             for (let product of products) {
        //                 log(product.name);
        //             }
        //             done();
        //         }).catch(log);
        //     },
        // },
        '/{projectId}/boqs': {
            'get': function (done) {
                getDefaultProject().then(project => {
                    return get(restifyApi + 'v1/projects/' + project.id + '/boqs');
                }).then(boqs => {
                    for (let boq of boqs) {
                        log(boq.name);
                    }
                    done();
                }).catch(log);
            },
        },
        '/{projectId}/generate/boq': {
            'post': function (done) {
                getDefaultProject().then(project => {
                    return post(restifyApi + 'v1/projects/' + project.id + '/generate/boq');
                }).then(data => {
                    log(data);
                    done();
                }).catch(log);
            },
        },
        '/{projectId}/boq/direct-boq': {
            'get': function (done) {
                getDefaultProject().then(project => {
                    return get(restifyApi + 'v1/projects/' + project.id + '/boqs/direct-boq');
                }).then(items => {
                    log(items);
                    done();
                }).catch(log);
            },
        },
    },
};

