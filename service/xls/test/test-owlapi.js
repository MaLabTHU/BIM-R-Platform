'use strict';

const assert = require('assert');
const owlapi = require('../owlapi.js');

function log(msg) {
    console.log(msg);
}

let sparkApi = 'http://127.0.0.1:5001/';
let reasonOwlPath = 'static/data/owl/reason.owl';

function getOrOpenOwl(path) {
    path = path || 'static/data/owl/pizza.owl';
    return new Promise((resolve, reject)=> {
        owlapi.getOwls(sparkApi).then(owls=> {
            for (let owl of owls) {
                if (owl.path == path) {
                    return resolve(owl);
                }
            }
            resolve(owlapi.createOrOpenOwl(sparkApi, path));
        }).catch(reject);
    });
}

module.exports = {
    'owls': {
        '#getOwls()': {
            '': function (done) {
                owlapi.getOwls(sparkApi).then(owls=> {
                    log(owls);
                    done();
                });
            },
        },
        '#createOrOpenOwl()': {
            'create': function (done) {
                this.timeout(10000);
                owlapi.createOrOpenOwl(sparkApi).then(owl=> {
                    log(owl);
                    assert(!owl.iri);
                    done()
                }).catch(log);
            },
            'open': function (done) {
                this.timeout(10000);
                owlapi.createOrOpenOwl(sparkApi, 'static/data/owl/pizza.owl').then(owl=> {
                    log(owl);
                    assert(owl.iri);
                    done();
                }).catch(log);
            },
        },
        '#closeOwl()': {
            'closeAll': function (done) {
                owlapi.getOwls(sparkApi).then(owls=> {
                    return Promise.all(owls.map(owl=>owlapi.closeOwl(sparkApi, owl)));
                }).then(owls=> {
                    return owlapi.getOwls(sparkApi);
                }).then(owls=> {
                    log(owls);
                    assert(owls.length == 0);
                    done();
                }).catch(log);
            },
            'closeOne': function (done) {
                let tempOwl;
                owlapi.createOrOpenOwl(sparkApi, 'static/data/owl/pizza.owl').then(owl=> {
                    tempOwl = owl;
                    return owlapi.closeOwl(sparkApi, owl);
                }).then(owl=> {
                    log(owl);
                    assert(tempOwl.id = owl.id);
                    done();
                });
            },
        },
        '#copyOwl()': {
            '': function (done) {
                let _owl;
                getOrOpenOwl(reasonOwlPath).then(owl=> {
                    _owl = owl;
                    return owlapi.copyOwl(sparkApi, owl);
                }).then(owl=> {
                    log(_owl);
                    log(owl);
                    return owlapi.closeOwl(sparkApi, owl);
                }).then(owl=> {
                    log(owl);
                    done();
                }).catch(log);
            },
        },
        '#inferOwl()': {
            'inferAndSave': function (done) {
                let _owl;
                getOrOpenOwl(reasonOwlPath).then(owl=> {
                    return owlapi.copyOwl(sparkApi, owl);
                }).then(owl=> {
                    _owl = owl;
                    return owlapi.inferOwl(sparkApi, owl);
                }).then(owl=> {
                    return owlapi.getIdvs(sparkApi, owl);
                }).then(idvs=> {
                    for (let idv of idvs) {
                        log(idv);
                    }
                    return owlapi.saveOwl(sparkApi, _owl, 'static/data/owl/infer.test.owl');
                }).then(owl=> {
                    return owlapi.closeOwl(sparkApi, owl);
                }).then(owl=> {
                    log(owl);
                    done();
                }).catch(log);
            },
            'inferCost': function (done) {
                let _owl;
                getOrOpenOwl('static/data/owl/cost.dl.owl').then(owl=> {
                    return owlapi.inferOwl(sparkApi, owl);
                }).then(owl=> {
                    return owlapi.getIdv(sparkApi, owl, 'wall1');
                }).then(idv=> {
                    log(idv);
                    done();
                }).catch(log);
            },
            'addIdvAndInfer': function (done) {
                this.timeout(30000);
                let _owl;
                getOrOpenOwl('static/data/owl/cost.owl').then(owl=> {
                    return owlapi.copyOwl(sparkApi, owl);
                }).then(owl=> {
                    _owl = owl;
                    let idvs = [
                        {
                            iri: 'rectangle',
                            types: ['ifc:Rectangle'],
                        },
                        {
                            iri: 'concrete',
                            types: ['ifc:Concrete'],
                        },
                        {
                            iri: 'insitu',
                            types: ['ifc:Insitu'],
                        },
                        {
                            iri: 'test',
                            types: ['ifc:Column'],
                            objPrps: [
                                {p: 'ifc:hasProfileShape', o: 'rectangle'},
                                {p: 'ifc:hasMaterial', o: 'concrete'},
                                {p: 'ifc:byMethod', o: 'insitu'},
                            ],
                        },
                    ];
                    return Promise.all(idvs.map(idv=>owlapi.addIdv(sparkApi, owl, idv)));
                }).then(_=> {
                    return owlapi.inferOwl(sparkApi, _owl);
                }).then(owl=> {
                    return owlapi.saveOwl(sparkApi, owl, 'static/data/owl/addIdvAndInfer.test.owl');
                }).then(owl=> {
                    return owlapi.getIdv(sparkApi, owl, 'test');
                }).then(idv=> {
                    log(idv);
                    return owlapi.closeOwl(sparkApi, _owl);
                }).then(owl=> {
                    done();
                }).catch(log);
            },
        },
        '#getPrefixes()': {
            '': function (done) {
                getOrOpenOwl().then(owl=> {
                    return owlapi.getPrefixes(sparkApi, owl);
                }).then(prefixes=> {
                    log(prefixes);
                    done();
                }).catch(log);
            },
        },
        '#addPrefixes()': {
            '': function (done) {
                let _owl;
                getOrOpenOwl().then(owl=> {
                    _owl = owl;
                    return owlapi.addPrefixes(sparkApi, owl, {test: 'abc'});
                }).then(_=> {
                    return owlapi.getPrefixes(sparkApi, _owl);
                }).then(prefixes=> {
                    log(prefixes);
                    return owlapi.saveOwl(sparkApi, _owl, 'static/data/owl/prefixes.test.owl');
                }).then(_=> {
                    done();
                }).catch(log);
            },
            'withIdv': function (done) {
                let _owl;
                getOrOpenOwl().then(owl=> {
                    _owl = owl;
                    return owlapi.addPrefixes(sparkApi, owl, {test: 'abc'});
                }).then(_=> {
                    return owlapi.addIdv(sparkApi, _owl, {iri: 'test:hello'});
                }).then(idv=> {
                    log(idv);
                    return owlapi.saveOwl(sparkApi, _owl, 'static/data/owl/prefixes.test.owl');
                }).then(_=> {
                    done();
                }).catch(log);
            }
        },
        '#getClses()': {
            '': function (done) {
                getOrOpenOwl().then(owl=> {
                    return owlapi.getClses(sparkApi, owl);
                }).then(clses=> {
                    for (let cls of clses) {
                        log(cls.iri);
                    }
                    done()
                }).catch(log);
            },
        },
        '#addCls()': {
            '': function (done) {
                getOrOpenOwl(reasonOwlPath).then(owl=> {
                    let cls = new owlapi.Cls('Test', {'en': 'Test class'});
                    return owlapi.addCls(sparkApi, owl, cls);
                }).then(cls=> {
                    log(cls);
                    done();
                }).catch(log);
            },
        },
        '#getClsExps()': {
            '': function (done) {
                getOrOpenOwl(reasonOwlPath).then(owl=> {
                    return owlapi.getClsExps(sparkApi, owl);
                }).then(clsExps=> {
                    for (let clsExp of clsExps) {
                        log(clsExp);
                    }
                    done();
                }).catch(log);
            },
        },
        '#addClsExp()': {
            '': function (done) {
                let _owl;
                getOrOpenOwl(reasonOwlPath).then(owl=> {
                    _owl = owl;
                    log(owl);
                    let exp = {
                        iri: 'test',
                        exps: [
                            {iri: 'DefinedClassA'},
                            {p: 'hasA', o: {iri: 'DefinedClassB'}},
                        ],
                    };
                    return owlapi.addClsExp(sparkApi, owl, exp);
                }).then(exp=> {
                    return owlapi.getClsExps(sparkApi, _owl);
                }).then(exps=> {
                    for (let exp of exps) {
                        log(exp);
                    }
                    done();
                }).catch(log);
            },
        },
        '#getIdvs()': {
            '': function (done) {
                getOrOpenOwl(reasonOwlPath).then(owl=> {
                    return owlapi.getIdvs(sparkApi, owl);
                }).then(idvs=> {
                    for (let idv of idvs) {
                        log(idv);
                    }
                    done();
                }).catch(log);
            },
        },
        '#addIdv()': {
            '': function (done) {
                getOrOpenOwl(reasonOwlPath).then(owl=> {
                    return owlapi.addIdv(sparkApi, owl, {
                        iri: 'something',
                        types: ['DefinedClassA'],
                        objPrps: [{p: 'hasA', o: 'z'}],
                    });
                }).then(idv=> {
                    log(idv);
                    done();
                }).catch(log);
            },
        },
    },
};