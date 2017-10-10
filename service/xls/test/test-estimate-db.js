'use strict';

const estimateDb = require('../estimate-db.js');

function log(msg) {
    console.log(msg);
}

let nancyApi = 'http://127.0.0.1:5000/';

module.exports = {
    'Project': {
        '_findOne()': {
            '': function (done) {
                estimateDb.Product.findOne({
                    where: {
                        id: -1,
                    },
                }).then(project => {
                    log('then not found: ' + project);
                    done();
                }).catch(error => {
                    log('catch not found: ' + error);
                    done();
                });
            },
        },
        '_addProduct()': {
            '': function (done) {
                let _project;
                estimateDb.Project.findOne().then(project => {
                    _project = project;
                    return estimateDb.Product.create({lineId: 1, type: 'test', name: 'hello'});
                }).then(product => {
                    return _project.addProduct(product);
                }).then(_ => {
                    done();
                }).catch(log);
            },
        },
        '_addProductsWithBulkCreate()': {
            '': function (done) {
                let _project;
                let _products;
                estimateDb.Project.findOne().then(project => {
                    _project = project;
                    return estimateDb.transaction(t => { // faster for each create
                        return estimateDb.Product.bulkCreate(
                            [
                                {lineId: 1, type: 'test', name: 'hello'},
                                {lineId: 1, type: 'test', name: 'hello', projectId: project.id},
                            ],
                            {
                                individualHooks: true, // work but slow
                                // returning: true, // not working in sqlite
                                transaction: t,
                            });
                    });
                }).then(products => {
                    _products = products;
                    return _project.addProducts(products);
                }).then(_ => {
                    for (let product of _products) {
                        log(product.id);
                    }
                    done();
                }).catch(log);
            },
        },
        '_openModel()': {
            '': function (done) {
                this.timeout(30000);
                estimateDb.Project.findOne().then(project => {
                    return project._openModel(nancyApi);
                }).then(model => {
                    log(model);
                    done();
                }).catch(log);
            },
        },
        '#loadModel()': {
            '': function (done) {
                this.timeout(30000);
                estimateDb.Project.findOne().then(project => {
                    return project.loadModel(nancyApi);
                }).then(loaded => {
                    log(loaded);
                    done();
                }).catch(log);
            },
        },
        '_getAttributes()': {
            '': function (done) {
                this.timeout(30000);
                let _project;
                let _model;
                estimateDb.Project.findOne().then(project => {
                    _project = project;
                    return project._openModel(nancyApi);
                }).then(model => {
                    _model = model;
                    return estimateDb.Product.findOne({
                        where: {
                            projectId: _project.id,
                            type: 'IfcWall',
                        },
                    });
                }).then(wall => {
                    return wall.getAttributes(nancyApi, _model);
                }).then(attrs => {
                    log(attrs);
                    done();
                }).catch(log);
            },
        },
        // 'calcModel()': {
        //     '': function (done) {
        //         this.timeout(30000);
        //         estimateDb.Project.findOne().then(project => {
        //             let number = 0;
        //             return project.calcModel(nancyApi, _ => {
        //                 log(number++);
        //             });
        //         }).then(calculated => {
        //             log(calculated);
        //             done();
        //         }).catch(log);
        //     },
        // },
        '_loopCalcToTestMemoryUsageForXbim': {
            'it will consume 2GB+ ram and release it after hours': function (done) {
                this.timeout(1000 * 60 * 30);
                let number = 0;
                estimateDb.Project.findOne().then(project => {
                    let promiseFor = function (condition, action, value) {
                        return new Promise((resolve, reject) => {
                            if (condition(value)) {
                                return resolve(action(value).then(promiseFor.bind(null, condition, action)));
                            }
                            return resolve(value);
                        });
                    };

                    promiseFor(_ => true, _ => project.calcModel(nancyApi, _ => {
                        log(number++);
                    }));
                });
            }
        },
        '#inferModel()': {
            '': function (done) {
                this.timeout(30000);
                estimateDb.Project.findOne().then(project => {
                    let number = 0;
                    return project.inferModel('', (product, key, value) => {
                        // log(product.lineId);
                    });
                }).then(infered => {
                    log(infered);
                    done();
                }).catch(log);
            },
        },
        '_createBoqItems():': {
            // addBoqItems([list of instances or primary keys])
            '': function (done) {
                estimateDb.Project.findOne().then(project => {
                    return project.createBoqItem({name: 'test'});
                }).then(item => {
                    log(item);
                    done();
                }).catch(log);
            },
        },
        '#generateBoqs()': {
            '': function (done) {
                this.timeout(30000);
                estimateDb.Project.findOne().then(project => {
                    return project.generateBoqs();
                }).then(boqItems => {
                    log(boqItems);
                    done();
                }).catch(log);
            }
        },
        '_queryBoqs()': {
            '': function (done) {
                estimateDb.Project.findOne().then(project => {
                    return project.getBoqItems();
                }).then(boqItems => {
                    for (let boqItem of boqItems) {
                        log(boqItem.name);
                    }
                    done();
                }).catch(log);
            },
        },
    },
    'Product': {
        '#getFeatures()': {
            '': function (done) {
                // todo
                done();
            },
        },
    },
};
