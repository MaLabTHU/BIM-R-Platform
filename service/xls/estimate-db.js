'use strict';

const Sequelize = require('sequelize');
const requestify = require('requestify');
const standardDb = require('../dat/standard-db');

module.exports = {};

const int = Sequelize.INTEGER;
const str = Sequelize.STRING;
const float = Sequelize.FLOAT;
const bool = Sequelize.BOOLEAN;

let estimateDb = new Sequelize('database', null, null, {
    dialect: 'sqlite',
    storage: 'data/bim-estimate.sqlite',
    logging: false,
});
module.exports.transaction = function (f) {
    return estimateDb.transaction(f);
};

let Upload = estimateDb.define('upload', {
    uuid: {type: str, primaryKey: true},
    name: {type: str},
    path: {type: str},
});
module.exports.Upload = Upload;

let Project = estimateDb.define('project', {
    projectName: {type: str},
    projectCode: {type: str},
    projectType: {type: str},
    structureType: {type: str},
    footingType: {type: str},
    shapeType: {type: str},
    underGrounds: {type: int},
    floors: {type: int},
    height: {type: float},
    area: {type: float},
    zero: {type: float},
    ownerOrg: {type: str},
    designerOrg: {type: str},
    constructorOrg: {type: str},
    estimatorOrg: {type: str},
    estimateDate: {type: Sequelize.DATEONLY},
    estimator: {type: str},
    estimatorId: {type: str},
    reviewer: {type: str},
    reviewerId: {type: str},
    boqStandard: {type: str},
    quotaStandard: {type: str},
    modelUuid: {type: str},
    modelPath: {type: str},

    loaded: {type: int},
    inferred: {type: int},
    generatedBoq: {type: int},
    generatedQuota: {type: int},
}, {
    instanceMethods: {
        loadModel: function (nancyApi, progressFunc) {
            progressFunc = progressFunc ? progressFunc : (product, key, value) => {
            };
            return new Promise((resolve, reject) => {
                if (this.loaded) {
                    return resolve(this.loaded);
                }
                let _model;
                let _products;
                this._openModel(nancyApi).then(model => {
                    _model = model;
                    return requestify.get(nancyApi + 'v1/ifcs/' + model.id + '/structure');
                }).then(res => {
                    return this._prepareProducts(res.getBody());
                }).then(rawProducts => {
                    return Product.bulkCreate(rawProducts);
                }).then(_ => {
                    return this.getProducts();
                }).then(products=>{
                    _products = products;
                    return estimateDb.transaction(transaction => {
                        let promises = [];
                        for (let product of products) {
                            // promises.push(
                            //     product.getAttributes(nancyApi, _model).then(attrs => {
                            //         let features = [];
                            //         // todo parse attrs to features
                            //         return estimateDb.ProductFeature.bulkCreate(features, {transaction: transaction});
                            //     })
                            // );
                            promises.push(
                                product.getQuantities(nancyApi, _model).then(quantities => {
                                    product.volume = quantities.volume / 1000000000;
                                    product.surfaceArea = quantities.surfaceArea / 1000000;
                                    progressFunc(product, quantities);
                                    return product.save({transaction: transaction});
                                })
                            );
                        }
                        return Promise.all(promises);
                    });
                }).then(_ => {
                    this.loaded = _products.length;
                    return this.save();
                }).then(_ => {
                    resolve(this.loaded);
                }).catch(reject);
            });
        },
        _openModel: function (nancyApi) {
            return new Promise((resolve, reject) => {
                requestify.post(nancyApi + 'v1/ifcs', {path: this.modelPath}).then(res => {
                    resolve(res.getBody());
                }).catch(res => {
                    if (res.code == 409) {
                        resolve(res.getBody());
                    } else {
                        reject(res);
                    }
                });
            });
        },
        _prepareProducts: function (entity, parent) {
            let entities = [];
            if (parent && parent.type.toLowerCase() == 'ifcbuildingstorey') {
                entities.push({
                    lineId: entity.id, type: entity.type, name: entity.name,
                    projectId: this.id, // for bulkCreate
                });
            }
            for (let child of entity.contains || entity.decomposedBy || []) {
                entities = entities.concat(this._prepareProducts(child, entity));
            }
            return entities;
        },
        // calcModel: function (nancyApi, progressFunc) {
        //     return new Promise((resolve, reject) => {
        //         let _products;
        //         this.getProducts().then(products => {
        //             _products = products;
        //             return this._openModel(nancyApi);
        //         }).then(model => {
        //             return estimateDb.transaction(transaction => {
        //                 let promises = [];
        //                 for (let product of _products) {
        //                     promises.push(
        //                         product.getQuantities(nancyApi, model).then(quantities => {
        //                             product.volume = quantities.volume / 1000000000;
        //                             product.surfaceArea = quantities.surfaceArea / 1000000;
        //                             progressFunc(product, quantities);
        //                             return product.save({transaction: transaction});
        //                         })
        //                     );
        //                 }
        //                 return Promise.all(promises);
        //             });
        //         }).then(_ => {
        //             resolve(_products.length);
        //         }).catch(reject);
        //     });
        // },
        inferModel: function (sparkApi, progressFunc) { // time consuming ?
            return new Promise((resolve, reject) => {
                if (this.inferred) {
                    return resolve(this.inferred);
                }
                let nancyApi = 'http://127.0.0.1:5000/';
                let _products;
                this.getProducts().then(products => {
                    _products = products;
                    return this._openModel(nancyApi);
                }).then(model => {

                    function searchProperty(propertySet, targetName) {
                        for (let type in propertySet) {
                            let typeSet = propertySet[type];
                            for (let group in typeSet) {
                                let groupSet = typeSet[group];
                                for (let name in groupSet) {
                                    if (name == targetName) {
                                        return groupSet[name];
                                    }
                                }
                            }
                        }
                        return null;
                    }

                    return estimateDb.transaction(transaction => {
                        let promises = [];
                        for (let product of _products) {
                            promises.push(
                                new Promise((rs, rj)=>{
                                    product.getAttributes(nancyApi, model).then(attrs => {
                                        let boqCode = searchProperty(attrs.p, '项目编码');
                                        product.boqCodes = boqCode ? ':' + boqCode : null;
                                        progressFunc(product, 'attr', attrs);
                                        rs(product.save({transaction: transaction}));
                                    }).catch(error=>{
                                        rj(error);
                                        console.log(product.lineId, product.type);
                                    });
                                })
                            );
                        }
                        return Promise.all(promises);
                    });
                }).then(_ => {
                    this.inferred = _products.length;
                    return this.save();
                }).then(_ => {
                    resolve(this.inferred);
                }).catch(reject);
            });
        },
        generateBoqs: function (sparkApi, owl) {
            return new Promise((resolve, reject) => {
                if (this.generatedBoq) {
                    return resolve(this.generatedBoq);
                }
                let _boqCodeDict;
                let _boqItems;
                this.getProducts({order: ['boqCodes']}).then(products => {
                    return this._prepareBoqItems(products);
                }).then(value => {
                    _boqCodeDict = value.dict;
                    // return this.addBoqItems(boqItems);
                    return BoqItem.bulkCreate(value.raw);
                }).then(_ => {
                    // fixme boqItems don't have ids
                    // todo add boqProducts
                    return this.getBoqItems();
                }).then(boqItems => {
                    _boqItems = boqItems;
                    let promises = [];
                    for (let boqItem of boqItems) {
                        let value = _boqCodeDict[boqItem.code];
                        promises.push(boqItem.addProducts(value.products));
                        promises.push(BoqFeature.bulkCreate(value.features.map(feature => {
                            return {
                                boqItemId: boqItem.id,
                                name: feature.name,
                            };
                        })));
                    }
                    return Promise.all(promises);
                }).then(_ => {
                    this.generatedBoq = _boqItems.length;
                    return this.save();
                }).then(_ => {
                    resolve(this.generatedBoq);
                }).catch(reject);
            });
        },
        _prepareBoqItems: function (products) {
            return new Promise((resolve, reject) => {
                let nullProducts = [];
                let boqCodeDict = {null: {products: nullProducts}};
                let promises = [];
                for (let product of products) {
                    if (product.boqCodes) {
                        for (let boqCode of product.boqCodes.split(':').slice(1)) {
                            let value = boqCodeDict[boqCode];
                            if (!value) {
                                value = {products: []};
                                boqCodeDict[boqCode] = value;
                            }
                            value.products.push(product);
                        }

                    } else {
                        nullProducts.push(product);
                    }
                }
                for (let boqCode in boqCodeDict) {
                    if (boqCode != 'null') {
                        promises.push(this._prepareBoqItem(boqCode, boqCodeDict[boqCode].products));
                    }
                }
                Promise.all(promises).then(values => {
                    let rawBoqItems = [];
                    for (let value of values) {
                        let item = value.item;
                        rawBoqItems.push(item);
                        boqCodeDict[item.code].features = value.features;
                    }
                    resolve({raw: rawBoqItems, dict: boqCodeDict});
                }).catch(reject);
            });
        },
        _prepareBoqItem: function (boqCode, boqProducts) {
            return new Promise((resolve, reject) => {
                let _item;
                standardDb.BoqItem.findOne({
                    where: {code: boqCode},
                    include: {
                        model: standardDb.BoqFeature,
                    }
                }).then(item => {
                    _item = item;
                    return this._getBoqQuantity(boqProducts);
                }).then(quantity => {
                    resolve({
                        item: {
                            projectId: this.id,
                            code: _item.code,
                            name: _item.name,
                            unit: _item.unit,
                            quantity: quantity,
                        },
                        features: _item.Features.map(feature => feature.dataValues),
                    });
                }).catch(reject);
            });
        },
        _getBoqQuantity: function (boqProducts) {
            // fixme cut intersection part according to rules
            return new Promise((resolve, reject) => {
                let quantity = 0;
                for (let product of boqProducts) {
                    quantity += product.volume || 0;
                }
                resolve(quantity);
            });
        }
    },
});
Upload.hasOne(Project, {foreignKey: 'modelUuid'});
Project.belongsTo(Upload, {foreignKey: 'modelUuid'});
module.exports.Project = Project;

let BoqItem = estimateDb.define('boqItem', {
    code: {type: str},
    name: {type: str},
    unit: {type: str},
    quantity: {type: float},
    price: {type: float},
});
Project.hasMany(BoqItem);
BoqItem.belongsTo(Project);
module.exports.BoqItem = BoqItem;

let BoqFeature = estimateDb.define('boqFeature', {
    name: {type: str},
    value: {type: str},
});
BoqItem.hasMany(BoqFeature, {as: 'features'});
BoqFeature.belongsTo(BoqItem);
module.exports.BoqFeature = BoqFeature;

let QuotaItem = estimateDb.define('quotaItem', {
    code: {type: str},
    name: {type: str},
    unit: {type: str},
    quantity: {type: float},
    laborPrice: {type: float},
    materialPrice: {type: float},
    equipmentPrice: {type: float},
    otherPrice: {type: float},
    laborCost: {type: float},
    materialCost: {type: float},
    equipmentCost: {type: float},
    otherCost: {type: float},
});
BoqItem.hasMany(QuotaItem);
QuotaItem.belongsTo(BoqItem);
module.exports.QuotaItem = QuotaItem;

function wrapper(promise) {
    return new Promise((resolve, reject) => {
        promise.then(res => {
            resolve(res.getBody());
        }).catch(reject);
    });
}
let Product = estimateDb.define('product', {
    lineId: {type: int},
    type: {type: str},
    name: {type: str},
    boqCodes: {type: str},
    quotaCodes: {type: str},
    volume: {type: float},
    surfaceArea: {type: float},
}, {
    instanceMethods: {
        getAttributes: function (nancyApi, model) {
            return wrapper(requestify.get(nancyApi + 'v1/ifcs/' + model.id + '/entities/' + this.lineId + '/attributes'));
        },
        getQuantities: function (nancyApi, model) {
            return wrapper(requestify.get(nancyApi + 'v1/ifcs/' + model.id + '/entities/' + this.lineId + '/quantities'));
        },
    },
});
Project.hasMany(Product);
Product.belongsTo(Project);
BoqItem.belongsToMany(Product, {through: 'BoqAndProduct'});
Product.belongsToMany(BoqItem, {through: 'BoqAndProduct'});
module.exports.Product = Product;

let ProductFeature = estimateDb.define('productFeature', {
    name: {type: str},
    value: {type: str},
    isOrigin: {type: bool},
});
Product.hasMany(ProductFeature, {as: 'features'});
ProductFeature.belongsTo(Product);
module.exports.ProductFeature = ProductFeature;

estimateDb.sync();
module.exports._sync = (options) => {
    return estimateDb.sync(options);
};
