'use strict';
const Sequelize = require('sequelize');

module.exports = {};

const int = Sequelize.INTEGER;
const str = Sequelize.STRING;
const float = Sequelize.FLOAT;

function getSectionCode(section) {
    return ('0' + section.code).slice(-10).slice(0, 6);
}
module.exports.getSectionCode = getSectionCode;

function getSectionCodePlus(section) {
    let code = ('0' + section.code).slice(-10);
    while(code.endsWith('00')){
        code = code.slice(0, -2);
    }
    return code;
}
module.exports.getSectionCodePlus = getSectionCodePlus;

function getMainSections(Section, mainSections) {
    return new Promise((resolve, reject) => {
        if (Object.keys(mainSections).length) {
            resolve(mainSections);
        } else {
            Section.findAll({
                where: {
                    code: {$like: '%000000'},
                },
            }).then(sections => {
                for (let section of sections) {
                    mainSections[getSectionCode(section).slice(0, 4)] = section;
                }
                resolve(mainSections);
            }).catch(reject);
        }
    });
}

function getSectionMap(Section, sectionMap) {
    return new Promise((resolve, reject) => {
        if (Object.keys(sectionMap).length) {
            resolve(sectionMap);
        } else {
            Section.findAll({
                order: 'code',
            }).then(sections => {
                for (let section of sections) {
                    let code = getSectionCodePlus(section);
                    sectionMap[code] = section;
                    let parentCode = code.slice(0, -2);
                    let parentSection = sectionMap[parentCode];
                    if (parentSection) {
                        parentSection.children.push(section);
                    }
                    section.children = [];
                }
                resolve(sectionMap);
            }).catch(reject);
        }
    });
}

let boqDB = new Sequelize('database', null, null, {
    dialect: 'sqlite',
    storage: 'data/boq_beijing_2013.sqlite',
    logging: false,
});

let BoqTrade = boqDB.define('Trade', {
    id: {type: int, field: 'TradeID', primaryKey: true},
    code: {type: str},
    name: {type: str, field: 'Description'},
}, {
    tableName: 'Trade',
    timestamps: false,
});
module.exports.BoqTrade = BoqTrade;

let BoqSection = boqDB.define('Section', {
    id: {type: int, field: 'SectionID', primaryKey: true},
    code: {type: str, field: 'MatchedID'},
    name: {type: str, field: 'Description'},
    remark: {type: str, field: 'Remark'},
    // code: {
    //     type: str,
    //     field: 'MatchedID',
    //     get: function () {
    //         return ('0' + this.getDataValue('code')).slice(-10).slice(0, 6);
    //     },
    // },
}, {
    tableName: 'Section',
    timestamps: false,
});
BoqTrade.hasMany(BoqSection, {foreignKey: 'TradeID'});
BoqSection.belongsTo(BoqTrade, {foreignKey: 'TradeID'});
module.exports.BoqSection = BoqSection;

let BoqItem = boqDB.define('Item', {
    id: {type: int, field: 'BQItemID', primaryKey: true},
    code: {type: str, field: 'Code'},
    name: {type: str, field: 'Description'},
    unit: {type: str, field: 'Unit'},
    calcRule: {type: str, field: 'QuantityCalcRule'},
}, {
    tableName: 'BQItem',
    timestamps: false,
});
BoqSection.hasMany(BoqItem, {foreignKey: 'SectionID'});
BoqItem.belongsTo(BoqSection, {foreignKey: 'SectionID'});
module.exports.BoqItem = BoqItem;

let BoqFeature = boqDB.define('Feature', {
    id: {type: int, field: 'BQSpecID', primaryKey: true},
    name: {type: str, field: 'Description'},
}, {
    tableName: 'BQSpec',
    timestamps: false,
});
BoqItem.hasMany(BoqFeature, {foreignKey: 'BQItemID'});
BoqFeature.belongsTo(BoqItem, {foreignKey: 'BQItemID'});
module.exports.BoqFeature = BoqFeature;

let BoqWork = boqDB.define('Work', {
    id: {type: int, field: 'BQWorkScopeID', primaryKey: true},
    name: {type: str, field: 'Description'},
}, {
    tableName: 'BQWorkScope',
    timestamps: false,
});
BoqItem.hasMany(BoqWork, {foreignKey: 'BQItemID'});
BoqWork.belongsTo(BoqItem, {foreignKey: 'BQItemID'});
module.exports.BoqWork = BoqWork;

// let boqMainSections = {};
// function getBoqItems(codeCondition) {
//     return new Promise((resolve, reject) => {
//         getMainSections(BoqSection, boqMainSections).then(mainSections => {
//             BoqItem.findAll({
//                 include: [{
//                     model: BoqSection,
//                     where: {
//                         code: codeCondition,
//                     },
//                     include: [{
//                         model: BoqTrade,
//                     }],
//                 }, {
//                     model: BoqFeature,
//                 }],
//             }).then(items => {
//                 resolve({items: items, mainSections: mainSections});
//             }).catch(reject);
//         }).catch(reject);
//     });
// }
// module.exports.getBoqItems = getBoqItems;

let boqSectionMap = {};
function getBoqItemsPlus(codeCondition) {
    return new Promise((resolve, reject) => {
        getSectionMap(BoqSection, boqSectionMap).then(boqSectionMap => {
            BoqItem.findAll({
                include: [{
                    model: BoqSection,
                    where: {
                        code: codeCondition,
                    },
                    include: [{
                        model: BoqTrade,
                    }],
                }, {
                    model: BoqFeature,
                }, {
                    model: BoqWork,
                }],
            }).then(items => {
                resolve({items: items, map: boqSectionMap});
            }).catch(reject);
        }).catch(reject);
    });
}
module.exports.getBoqItemsPlus = getBoqItemsPlus;

let quotaDB = new Sequelize('database', null, null, {
    dialect: 'sqlite',
    storage: 'data/quota_beijing_2012.sqlite',
    logging: false,
});

let QuotaTrade = quotaDB.define('Trade', {
    id: {type: int, field: 'TradeID', primaryKey: true},
    name: {type: str, field: 'Description'},
}, {
    tableName: 'Trade',
    timestamps: false,
    getterMethods: {
        code: function () {
            return this.getDataValue('id') / 10000000;
        },
    },
});
module.exports.QuotaTrade = QuotaTrade;

let QuotaSection = quotaDB.define('Section', {
    id: {type: int, field: 'SectionID', primaryKey: true},
    code: {type: str, field: 'SectionCode'},
    name: {type: str, field: 'Description'},
    remark: {type: str, field: 'Remark'},
}, {
    tableName: 'Section',
    timestamps: false,
});
QuotaTrade.hasMany(QuotaSection, {foreignKey: 'TradeID'});
QuotaSection.belongsTo(QuotaTrade, {foreignKey: 'TradeID'});
module.exports.QuotaSection = QuotaSection;

let QuotaWork = quotaDB.define('Work', {
    id: {type: int, field: 'WorkScopeID', primaryKey: true},
    name: {type: str, field: 'WorkScope'},
}, {
    tableName: 'WorkScope',
    timestamps: false,
});
module.exports.QuotaWork = QuotaWork;

let QuotaItem = quotaDB.define('Item', {
    id: {type: int, field: 'NormItemID', primaryKey: true},
    code: {type: str, field: 'Code'},
    name: {type: str, field: 'Description'},
    unit: {type: str, field: 'Unit'},
    rate: {type: float, field: 'NormRate'},
    laborRate: {type: float, field: 'NormLaborRate'},
    materialRate: {type: float, field: 'NormMaterialRate'},
    machineRate: {type: float, field: 'NormMachineRate'},
}, {
    tableName: 'NormItem',
    timestamps: false,
});
QuotaSection.hasMany(QuotaItem, {foreignKey: 'SectionID'});
QuotaItem.belongsTo(QuotaSection, {foreignKey: 'SectionID'});
QuotaWork.hasMany(QuotaItem, {foreignKey: 'WorkScopeID'});
QuotaItem.belongsTo(QuotaWork, {foreignKey: 'WorkScopeID'});
module.exports.QuotaItem = QuotaItem;

let ResourceCatalog = quotaDB.define('Catalog', {
    id: {type: int, field: 'ResCatalogID', primaryKey: true},
    name: {type: str, field: 'Description'},
}, {
    tableName: 'ResCatalog',
    timestamps: false,
});
ResourceCatalog.hasMany(ResourceCatalog, {foreignKey: 'PID', as: 'children'});
ResourceCatalog.belongsTo(ResourceCatalog, {foreignKey: 'PID', as: 'parent'});
module.exports.ResourceCatalog = ResourceCatalog;

let CostType = quotaDB.define('Type', {
    id: {type: int, field: 'CostTypeID', primaryKey: true},
    name: {type: str, field: 'Description'},
    nameEn: {type: str, field: 'FieldName'},
}, {
    tableName: 'CostTypeDict',
    timestamps: false,
});
module.exports.CostType = CostType;

let Resource = quotaDB.define('Resource', {
    id: {type: int, field: 'ResID', primaryKey: true},
    name: {type: str, field: 'Description'},
    specification: {type: str, field: 'Spec'},
    unit: {type: str, field: 'Unit'},
    isMixed: {type: int, field: 'HasDetail'},
    rate: {type: float, field: 'BudgetRate'},
    factor: {type: float, field: 'Factor'},
    mainCatalog: {
        type: int,
        field: 'SCBH',
        get: function () {
            return [false, '钢材', '木材', '水泥', '钢筋'][this.getDataValue('mainCatalog')]; // todo to test
        },
    }
}, {
    tableName: 'Resource',
    timestamps: false,
});
ResourceCatalog.hasMany(Resource, {foreignKey: 'ResCatalogID'});
Resource.belongsTo(ResourceCatalog, {foreignKey: 'ResCatalogID'});
CostType.hasMany(Resource, {foreignKey: 'CostTypeID'});
Resource.belongsTo(CostType, {foreignKey: 'CostTypeID'});
module.exports.Resource = Resource;

let ResouceRelation = quotaDB.define('ResourceRelation', {
    id: {type: int, field: 'LMMDetailID', primaryKey: true},
    usage: {type: float, field: 'Usage'},
}, {
    tableName: 'LMMDetail',
    timestamps: false,
});
QuotaItem.belongsToMany(Resource, {through: 'ResourceRelation', foreignKey: 'NormItemID'});
Resource.belongsToMany(QuotaItem, {through: 'ResourceRelation', foreignKey: 'ResID'});
module.exports.ResourceRelation = ResouceRelation;

let ResourceMixRelation = quotaDB.define('ResourceMixRelation', {
    id: {type: int, field: 'MixResLMMDetailID', primaryKey: true},
    usage: {type: float, field: 'Usage'},
}, {
    tableName: 'MixResLMMDetail',
    timestamps: false,
});
Resource.belongsToMany(Resource, {through: 'ResourceMixRelation', foreignKey: 'MasterResID', as: 'masters'});
Resource.belongsToMany(Resource, {through: 'ResourceMixRelation', foreignKey: 'ResID', as: 'mixes'});
module.exports.ResourceMixRelation = ResourceMixRelation;

// let quotaMainSections = {};
// function getQuotaItems(codeCondition) {
//     return new Promise((resolve, reject) => {
//         getMainSections(QuotaSection, quotaMainSections).then(mainSections => {
//             QuotaItem.findAll({
//                 include: [{
//                     model: QuotaSection,
//                     where: {
//                         code: codeCondition,
//                     },
//                     include: [{
//                         model: QuotaTrade,
//                     }],
//                 }, {
//                     model: QuotaWork,
//                 }, {
//                     model: Resource,
//                 }],
//             }).then(items => {
//                 resolve({items: items, mainSections: mainSections});
//             }).catch(reject);
//         }).catch(reject);
//     });
// }
// module.exports.getQuotaItems = getQuotaItems;

let quotaSectionMap = {};
function getQuotaItemsPlus(codeCondition){
    return new Promise((resolve, reject)=>{
        getSectionMap(QuotaSection, quotaSectionMap).then(quotaSectionMap=>{
            QuotaItem.findAll({
                include: [{
                    model: QuotaSection,
                    where: {
                        code: codeCondition,
                    },
                    include: [{
                        model: QuotaTrade,
                    }],
                }, {
                    model: QuotaWork,
                }, {
                    model: Resource,
                }],
            }).then(items=>{
                resolve({items: items, map: quotaSectionMap});
            }).catch(reject);
        }).catch(reject);
    });
}
module.exports.getQuotaItemsPlus = getQuotaItemsPlus;