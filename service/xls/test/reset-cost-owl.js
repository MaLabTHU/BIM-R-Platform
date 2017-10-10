'use strict';

const owlapi = require('../owlapi.js');
const fs = require('fs-extra');
const requestify = require('requestify');

function log(msg) {
    console.log(msg);
}

let restifyApi = 'http://127.0.0.1:4999/';
let nancyApi = 'http://127.0.0.1:5000/';
let sparkApi = 'http://127.0.0.1:5001/';
let costOwlPath = 'static/data/owl/cost.owl';
let costOwlTestPath = 'static/data/owl/cost.test.owl';
// todo quota

function getCostOwl(path) {
    path = path || costOwlPath;
    let _owl;
    return owlapi.getOwls(sparkApi).then(owls => {
        for (let owl of owls) {
            if (owl.path == path) {
                return owl;
            }
        }
        return owlapi.createOrOpenOwl(sparkApi, path);
    }).then(owl => {
        _owl = owl;
        let base = 'http://civil.tsinghua.edu.cn/owl/';
        let prefixes = {};
        for (let prefix of ['cost', 'ifc']) {
            prefixes[prefix] = base + prefix;
        }
        prefixes['ie'] = base + 'ifc/extension';
        return owlapi.addPrefixes(sparkApi, owl, prefixes);
    }).then(_ => {
        return _owl;
    });
}

function getPromisesFromNode(sparkApi, owl, node, parentNode, prefixes, works, topSectionCode) {
    let promises = [];
    let prefix = prefixes[node.type];
    node.iri = prefix + node.code;
    let cls = {
        iri: node.iri,
        labels: {
            cn: node.name,
        },
        supClses: [parentNode.iri],
    };
    if (node.works) {
        for (let work of node.works) {
            if (!(work in works)) {
                let iri = prefixes['work'] + topSectionCode;
                works[work] = iri + '-' + (Object.keys(works).length + 1);
                promises.push(owlapi.addCls(sparkApi, owl, {
                    iri: works[work],
                    supClses: [iri],
                    labels: {
                        cn: work,
                    },
                }));
                console.log(work, works[work]);
            }
        }
        cls.rsts = node.works.map(work => {
            return {p: 'ie:byWork', o: {iri: works[work]}};
        });
    }
    promises.push(owlapi.addCls(sparkApi, owl, cls));
    return promises;
}

function iterTree(sparkApi, owl, node, parentNode, prefixes, works, topSectionCode, superWork) {
    works = works || {};
    let promises = [];
    if (node.code.length == 4 && node.type == 'section') {
        topSectionCode = node.code;
        promises.push(owlapi.addCls(sparkApi, owl, {
            iri: prefixes['work'] + topSectionCode,
            supClses: [superWork],
        }));
        works = {};
    }
    promises.concat(getPromisesFromNode(sparkApi, owl, node, parentNode, prefixes, works, topSectionCode));
    log(node.iri + ', ' + parentNode.iri);
    for (let child of node.children || []) {
        promises.concat(iterTree(sparkApi, owl, child, node, prefixes, works, topSectionCode, superWork));
    }
    return promises;
}

module.exports = {
    'init': {
        // 'createEmpty': function (done) {
        //     this.timeout(10000);
        //     owlapi.createOrOpenOwl(sparkApi).then(owl=> {
        //         return owlapi.saveOwl(sparkApi, owl, costOwlTestPath);
        //     }).then(owl=> {
        //         return owlapi.closeOwl(sparkApi, owl);
        //     }).then(owl=> {
        //         log(owl);
        //         done();
        //     }).catch(log);
        // },
        '': function (done) {
            this.timeout(10000);
            getCostOwl().then(owl => {
                log(owl);
                done();
            }).catch(log);
        },
    },
    'fill': {
        'addIfc': function (done) {
            this.timeout(30000);
            getCostOwl().then(owl => {
                fs.readJson('data/ifcproduct.json', (error, ifcs) => {

                    function parseIfcs(selfIri, node, parentIri) {
                        let cls = {iri: selfIri, supClses: [parentIri]}
                        // let ts = node['.translation'];
                        // if (ts && ts.length == 1 && ts[0]) {
                        //     cls.labels = {cn: ts[0]};
                        // }
                        let promises = [owlapi.addCls(sparkApi, owl, cls)];
                        for (let child in node.children) {
                            let childIri = 'ifc:' + child.slice(3);
                            promises.concat(parseIfcs(childIri, node.children[child], selfIri));
                        }
                        return promises;
                    };

                    Promise.all(parseIfcs('ifc:Product', ifcs['IfcProduct'], 'owl:Thing')).then(_ => {
                        let promises = [
                            'ie:Material',
                            'ie:Shape',
                            'ie:Function',
                            'ie:Method',
                            'ie:Work',
                        ].map(iri => owlapi.addCls(sparkApi, owl, {iri: iri}));
                        promises.push(owlapi.addCls(sparkApi, owl, {iri: 'ie:2DShape', supClses: ['ie:Shape']}));
                        promises.push(owlapi.addCls(sparkApi, owl, {iri: 'ie:1DShape', supClses: ['ie:Shape']}));
                        return Promise.all(promises);
                    }).then(_ => {
                        return owlapi.saveOwl(sparkApi, owl, costOwlTestPath);
                    }).then(owl => {
                        log(owl);
                        done();
                    }).catch(log);
                });
            });
        },
        'addBoq': function (done) {
            this.timeout(30000);
            let _owl;
            let _boqTree;
            getCostOwl().then(owl => {
                _owl = owl;
                return requestify.get(restifyApi + 'v1/standards/boq/0/structure');
            }).then(res => {
                _boqTree = res.getBody();
                _boqTree.code = 'GB500854-2013';
                _boqTree.name = '房屋建筑与装饰工程计量规范 GB 500854-2013';
                let base = 'http://civil.tsinghua.edu.cn/owl/boq';
                return owlapi.addPrefixes(sparkApi, _owl, {
                    'boq': base,
                    'bt': base + '/' + _boqTree.code + '/trade',
                    'bs': base + '/' + _boqTree.code + '/section',
                    'bi': base + '/' + _boqTree.code + '/item',
                    'bw': base + '/' + _boqTree.code + '/work',
                });
            }).then(_ => {
                return Promise.all(iterTree(sparkApi, _owl, _boqTree, {iri: 'cost:ProductSetForBoqStandard'},
                    {
                        'standard': 'boq:',
                        'trade': 'bt:',
                        'section': 'bs:',
                        'item': 'bi:',
                        'work': 'bw:',
                    },
                    null,
                    null,
                    'cost:WorkForBoqStandard'));
            }).then(_ => {
                return owlapi.saveOwl(sparkApi, _owl, costOwlTestPath);
            }).then(_ => {
                done();
            }).catch(log);
        },
        'addQuota': function (done) {
            this.timeout(30000);
            let _owl;
            let _quotaTree;
            getCostOwl().then(owl => {
                _owl = owl;
                return requestify.get(restifyApi + 'v1/standards/quota/0/structure');
            }).then(res => {
                _quotaTree = res.getBody();
                _quotaTree.code = 'Quota-Beijing-2012-01';
                _quotaTree.name = '北京市建设工程预算定额 2012 - 房屋建筑与装饰工程';
                let base = 'http://civil.tsinghua.edu.cn/owl/quota';
                return owlapi.addPrefixes(sparkApi, _owl, {
                    'quota': base,
                    'qt': base + '/' + _quotaTree.code + '/trade',
                    'qs': base + '/' + _quotaTree.code + '/section',
                    'qi': base + '/' + _quotaTree.code + '/item',
                    'qw': base + '/' + _quotaTree.code + '/work',
                })
            }).then(_ => {
                return Promise.all(iterTree(sparkApi, _owl, _quotaTree, {iri: 'cost:ProductSetForQuotaStandard'},
                    {
                        'standard': 'quota:',
                        'trade': 'qt:',
                        'section': 'qs:',
                        'item': 'qi:',
                        'work': 'qw:',
                    },
                    null,
                    null,
                    'cost:WorkForQuotaStandard'));
            }).then(_ => {
                return owlapi.saveOwl(sparkApi, _owl, costOwlTestPath);
            }).then(_ => {
                done();
            }).catch(log);
        },
        'addProperty': function (done) {
            this.timeout(30000);
            let _owl;
            getCostOwl().then(owl => {
                _owl = owl;
                let promises = [];
                let objPrps = [
                    'ie:hasMaterial',
                    'ie:hasProfileShape',
                    'ie:hasAxialSectionShape',
                    'ie:hasAxisShape',
                    'ie:hasFunction',
                    'ie:byMethod',
                    'ie:byWork',
                    'ie:other',
                ];
                let datPrps = [
                    // todo
                ];
                promises.concat(objPrps.map(objPrp => owlapi.addObjPrp(sparkApi, owl, {iri: objPrp})));
                promises.concat(datPrps.map(datPrp => owlapi.addDatPrp(sparkApi, owl, {iri: datPrp})));
                return Promise.all(promises);
            }).then(_ => {
                return owlapi.saveOwl(sparkApi, _owl, costOwlTestPath);
            }).then(owl => {
                log(owl);
                done();
            }).catch(log);
        },
        'addContent': function (done) {
            this.timeout(30000);
            let _owl;
            owlapi.createOrOpenOwl(sparkApi, costOwlPath).then(owl => {
                _owl = owl;
                let promises = [

                    {
                        iri: 'ie:ConcreteElement',
                        exps: [
                            {iri: 'ifc:Element'},
                            {p: 'ie:hasMaterial', o: {iri: 'ie:Concrete'}},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteElement',
                        exps: [
                            {iri: 'ie:ConcreteElement'},
                            {p: 'ie:byMethod', o: {iri: 'ie:Insitu'}},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteElement',
                        exps: [
                            {iri: 'ie:ConcreteElement'},
                            {p: 'ie:byMethod', o: {iri: 'ie:Precast'}},
                        ],
                    },

                    {
                        iri: 'ie:AntiEarthquakeElement',
                        exps: [
                            {iri: 'ifc:Element'},
                            {p: 'ie:hasFunction', o: {iri: 'ie:AntiEarthquake'}},
                        ]
                    },

                    {
                        iri: 'ie:RectangularElement',
                        exps: [
                            {iri: 'ifc:Element'},
                            {p: 'ie:hasProfileShape', o: {iri: 'ie:Rectangle'}},
                        ],
                    },

                    {
                        iri: 'ie:SpecialProfiledElement',
                        exps: [
                            {iri: 'ifc:Element'},
                            {p: 'ie:hasProfileShape', o: {iri: 'ie:SpecialProfile'}},
                        ]
                    },

                    {
                        iri: 'ie:CurvedElement',
                        exps: [
                            {iri: 'ifc:Element'},
                            {p: 'ie:hasAxisShape', o: {iri: 'ie:Curve'}},
                        ],
                    },

                    {
                        iri: 'ie:StraightElement',
                        exps: [
                            {iri: 'ifc:Element'},
                            {p: 'ie:hasAxisShape', o: {iri: 'ie:Line'}},
                        ],
                    },

                    {
                        iri: 'ie:Lintel',
                        exps: [
                            {iri: 'ifc:Beam'},
                            {p: 'ie:hasFunction', o: {iri: 'ie:SupportOpening'}},
                        ],
                    },

                    {
                        iri: 'ie:ShearWall',
                        exps: [
                            {iri: 'ifc:Wall'},
                            {p: 'ie:hasFunction', o: {iri: 'ie:ResistShearForce'}},
                        ],
                    },

                    {
                        iri: 'ie:ShortLimbShearWall',
                        exps: [
                            {iri: 'ie:ShearWall'},
                            {p: 'ie:hasProfile', o: {iri: 'ie:ShortLimb'}},
                        ],
                    },

                    {
                        iri: 'ie:RetainingWall',
                        exps: [
                            {iri: 'ifc:Wall'},
                            {p: 'ie:hasFunction', o: {iri: 'ie:RetainEarth'}},
                        ],
                    },

                    // boq
                    {
                        iri: 'ie:InsituConcreteFooting',
                        eqClses: [{iri: 'bs:010501'}],
                        exps: [
                            {iri: 'ifc:Footing'},
                            {iri: 'ie:InsituConcreteElement'},
                        ],
                    },

                    // todo 010501001
                    // todo 010501002
                    // todo 010501003
                    // todo 010501004
                    // todo 010501005

                    {
                        iri: 'ie:InsituConcreteFootingForEquipment',
                        eqClses: [{iri: 'bi:010501006'}],
                        exps: [
                            {iri: 'ie:InsituConcreteFooting'},
                            {p: 'ie:hasFunction', o: {iri: 'ie:SupportEquipment'}},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteColumn',
                        eqClses: [{iri: 'bs:010502'}],
                        exps: [
                            {iri: 'ifc:Column'},
                            {iri: 'ie:InsituConcreteElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteRectangularColumn',
                        eqClses: [{iri: 'bi:010502001'}],
                        exps: [
                            {iri: 'ie:InsituConcreteColumn'},
                            {iri: 'ie:RectangularElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteStructuralColumn',
                        eqClses: [{iri: 'bi:010502002'}],
                        exps: [
                            {iri: 'ie:InsituConcreteColumn'},
                            {iri: 'ie:AntiEarthquakeElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteSpecialProfiledColumn',
                        eqClses: [{iri: 'bi:010502003'}],
                        exps: [
                            {iri: 'ie:InsituConcreteColumn'},
                            {iri: 'ie:SpecialProfiledElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteBeam',
                        eqClses: [{iri: 'bs:010503'}],
                        exps: [
                            {iri: 'ifc:Beam'},
                            {iri: 'ie:InsituConcreteElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteFootingBeam',
                        eqClses: [{iri: 'bi:010503001'}],
                        exps: [
                            {iri: 'ie:InsituConcreteBeam'},
                            {p: 'ie:hasFunction', o: {iri: 'ie:BearLoadOnGround'}},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteRectangularBeam',
                        eqClses: [{iri: 'bi:010503002'}],
                        exps: [
                            {iri: 'ie:InsituConcreteBeam'},
                            {iri: 'ie:RectangularElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteSpecialProfiledBeam',
                        eqClses: [{iri: 'bi:010503003'}],
                        exps: [
                            {iri: 'ie:InsituConcreteBeam'},
                            {iri: 'ie:SpecialProfiledElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteRingBeam',
                        eqClses: [{iri: 'bi:010503004'}],
                        exps: [
                            {iri: 'ie:InsituConcreteBeam'},
                            {iri: 'ie:AntiEarthquakeElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteLintel',
                        eqClses: [{iri: 'bi:010503005'}],
                        exps: [
                            {iri: 'ie:InsituConcreteBeam'},
                            {iri: 'ie:Lintel'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteCurvedBeam',
                        eqClses: [{iri: 'bi:010503006'}],
                        exps: [
                            {iri: 'ie:InsituConcreteBeam'},
                            {iri: 'ie:CurvedElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteWall',
                        eqClses: [{iri: 'bs:010504'}],
                        exps: [
                            {iri: 'ifc:Wall'},
                            {iri: 'ie:InsituConcreteElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteStraightWall',
                        eqClses: [{iri: 'bi:010504001'}],
                        exps: [
                            {iri: 'ie:InsituConcreteWall'},
                            {iri: 'ie:StraightElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteCurvedWall',
                        eqClses: [{iri: 'bi:010504002'}],
                        exps: [
                            {iri: 'ie:InsituConcreteWall'},
                            {iri: 'ie:CurvedElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteShortLimbShearWall',
                        eqClses: [{iri: 'bi:010504003'}],
                        exps: [
                            {iri: 'ie:InsituConcreteWall'},
                            {iri: 'ie:ShortLimbShearWall'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteRetainingWall',
                        eqClses: [{iri: 'bi:010504004'}],
                        exps: [
                            {iri: 'ie:InsituConcreteWall'},
                            {iri: 'ie:RetainingWall'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteSlab',
                        eqClses: [{iri: 'bs:010505'}],
                        exps: [
                            {iri: 'ifc:Slab'},
                            {iri: 'ie:InsituConcreteElement'},
                        ],
                    },

                    // todo 010505001
                    // todo 010505002
                    // todo 010505003
                    // todo 010505004
                    // todo 010505005
                    // todo 010505006
                    // todo 010505007
                    // todo 010505008
                    // todo 010505009
                    // todo 010505010

                    {
                        iri: 'ie:InsituConcreteStair',
                        eqClses: [{iri: 'bs:010506'}],
                        exps: [
                            {iri: 'ifc:Stair'},
                            {iri: 'ie:InsituConcreteElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteStraightStair',
                        eqClses: [{iri: 'bi:010506001'}],
                        exps: [
                            {iri: 'ie:InsituConcreteStair'},
                            {iri: 'ie:StraightElement'},
                        ],
                    },

                    {
                        iri: 'ie:InsituConcreteCurvedStair',
                        eqClses: [{iri: 'bi:010506002'}],
                        exps: [
                            {iri: 'ie:InsituConcreteStair'},
                            {iri: 'ie:CurvedElement'},
                        ],
                    },

                    // bs:010507

                    {
                        iri: 'ie:InsituConcreteRamp',
                        eqClses: [{iri: 'bi:010507001'}],
                        exps: [
                            {iri: 'ifc:Ramp'},
                            {iri: 'ie:InsituConcreteElement'},
                        ],
                    },

                    // todo bi:010507002
                    // todo bi:010507003
                    // todo bi:010507004

                    {
                        iri: 'ie:InsituConcreteRailing',
                        eqClses: [{iri: 'bi:010507005'}],
                        exps: [
                            {iri: 'ifc:Railing'},
                            {iri: 'ie:InsituConcreteElement'},
                        ],
                    },

                    // todo bi:010507006
                    // todo bi:010507008

                    // todo bs:010508

                    {
                        iri: 'ie:PrecastConcreteColumn',
                        eqClses: [{iri: 'bs:010509'}],
                        exps: [
                            {iri: 'ifc:Column'},
                            {iri: 'ie:PrecastConcreteElement'},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteRectangularColumn',
                        eqClses: [{iri: 'bi:010509001'}],
                        exps: [
                            {iri: 'ie:PrecastConcreteColumn'},
                            {iri: 'ie:RectangularElement'},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteSpecialProfiledColumn',
                        eqClses: [{iri: 'bi:010509002'}],
                        exps: [
                            {iri: 'ie:PrecastConcreteColumn'},
                            {iri: 'ie:SpecialProfiledElement'},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteBeam',
                        eqClses: [{iri: 'bs:010510'}],
                        exps: [
                            {iri: 'ifc:Beam'},
                            {iri: 'ie:PrecastConcreteElement'},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteRectangularBeam',
                        eqClses: [{iri: 'bi:010510001'}],
                        exps: [
                            {iri: 'ie:PrecastConcreteBeam'},
                            {iri: 'ie:RectangularElement'},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteSpecialProfiledBeam',
                        eqClses: [{iri: 'bi:010510002'}],
                        exps: [
                            {iri: 'ie:PrecastConcreteBeam'},
                            {iri: 'ie:SpecialProfiledElement'},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteLintel',
                        eqClses: [{iri: 'bi:010510003'}],
                        exps: [
                            {iri: 'ie:PrecastConcreteBeam'},
                            {iri: 'ie:Lintel'},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteCurvedBeam',
                        eqClses: [{iri: 'bi:010510004'}],
                        exps: [
                            {iri: 'ie:PrecastConcreteBeam'},
                            {iri: 'ie:CurvedElement'},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteFishBelliedCraneBeam',
                        eqClses: [{iri: 'bi:010510005'}],
                        exps: [
                            {iri: 'ie:PrecastConcreteBeam'},
                            {p: 'ie:hasAxialSectionShape', o: {iri: 'ie:FishBelly'}},
                            {p: 'ie:hasFunction', o: {iri: 'ie:SupportCrane'}},
                        ],
                    },

                    {
                        iri: 'ie:PrecastConcreteRoof',
                        eqClses: [{iri: 'bs:010511'}],
                        exps: [
                            {iri: 'ifc:Roof'},
                            {iri: 'ie:PrecastConcreteElement'},
                        ],
                    },

                    // todo 010511001
                    // todo 010511002
                    // todo 010511003
                    // todo 010511004
                    // todo 010511005

                    {
                        iri: 'ie:PrecastConcreteSlab',
                        eqClses: [{iri: 'bs:010512'}],
                        exps: [
                            {iri: 'ifc:Slab'},
                            {iri: 'ie:PrecastConcreteElement'},
                        ],
                    },

                    // todo 0105012001
                    // todo 0105012002
                    // todo 0105012003
                    // todo 0105012004
                    // todo 0105012005
                    // todo 0105012006
                    // todo 0105012007
                    // todo 0105012008

                    {
                        iri: 'ie:PrecastConcreteStair',
                        eqClses: [{iri: 'bs:010513'}, {iri: 'bi:010513001'}],
                        exps: [
                            {iri: 'ifc:Stair'},
                            {iri: 'ie:PrecastConcreteElement'},
                        ],
                    },

                    // todo 010514
                    // todo 010515
                    // todo 010516

                    {
                        iri: 'qs:010501',
                        eqClses: [{iri: 'ie:InsituConcreteFooting'}],
                    },

                    {
                        iri: 'qs:010502',
                        eqClses: [{iri: 'ie:InsituConcreteColumn'}],
                    },

                    {
                        iri: 'qs:010503',
                        eqClses: [{iri: 'ie:InsituConcreteBeam'}],
                    },

                    {
                        iri: 'qs:010504',
                        eqClses: [{iri: 'ie:InsituConcreteWall'}],
                    },

                    {
                        iri: 'qs:010505',
                        eqClses: [{iri: 'ie:InsituConcreteSlab'}],
                    },

                    {
                        iri: 'qs:010506',
                        eqClses: [{iri: 'ie:InsituConcreteStair'}],
                    },

                    // 010507
                    // todo 010508

                    {
                        iri: 'qs:010508',
                        eqClses: [{iri: 'ie:PrecastConcreteBeam'}],
                    },

                    {
                        iri: 'qs:010509',
                        eqClses: [{iri: 'ie:PrecastConcreteColumn'}],
                    },

                    {
                        iri: 'qs:010510',
                        eqClses: [{iri: 'ie:PrecastConcreteBeam'}],
                    },

                    {
                        iri: 'qs:010511',
                        eqClses: [{iri: 'ie:PrecastConcreteRoof'}],
                    },

                    {
                        iri: 'qs:010512',
                        eqClses: [{iri: 'ie:PrecastConcreteSlab'}],
                    },

                    {
                        iri: 'qs:010513',
                        eqClses: [{iri: 'ie:PrecastConcreteStair'}],
                    },

                    // 010514

                    // todo 010515
                    // todo 010516
                    // todo 010517
                    // todo 010518
                ].map(exp => owlapi.addClsExp(sparkApi, owl, exp));

                function addSubClses(subs, parent) {
                    return subs.map(sub => owlapi.addCls(sparkApi, owl, {
                        iri: 'ie:' + sub,
                        supClses: ['ie:' + parent],
                    }));
                }

                function addOther(others, parent) {
                    let promises = [];
                    promises.concat(others.map(other=>owlapi.addCls(sparkApi, owl, {
                        iri: other,
                        supClses: [parent],
                    })));
                    promises.push(owlapi.addCls(sparkApi, owl, {
                        iri: parent,
                        rsts: others.map(other=>{
                            return {p: 'ie:other', o: {iri: other}};
                        }),
                    }));
                    return promises;
                }

                promises.concat(addSubClses([
                    'Concrete',
                ], 'Material'));
                promises.concat(addSubClses([
                    'Insitu',
                    'Precast',
                ], 'Method'));
                promises.concat(addSubClses([
                    'SupportEquipment',
                    'AntiEarthquake',
                    'BearLoadOnGround',
                    'SupportOpening',
                    'ResistShearForce',
                    'RetainEarth',
                    'SupportCrane',
                ], 'Function'));
                promises.concat(addSubClses([
                    'Rectangle',
                    'SpecialProfile',
                    'ShortLimb',
                    'FishBelly',
                ], '2DShape'));
                promises.concat(addSubClses([
                    'Line',
                    'Curve',
                ], '1DShape'));

                // other InsituConcreteElement
                promises.concat(addOther([
                    'bs:010507',
                    'bi:010507007',
                    'qs:010507',
                    'qi:5-48',
                ], 'ie:InsituConcreteElement'));

                // other PrecastConcreteBeam
                promises.concat(addOther([
                    'bi:010510006',
                ], 'ie:PrecastConcreteBeam'));

                // other PrecastConcreteElement
                promises.concat(addOther([
                    'bs:010514',
                    'bi:010514002',
                    'qs:010514',
                    'qi:5-104',
                ], 'ie:PrecastConcreteElement'));
                return Promise.all(promises);
            }).then(_ => {
                return owlapi.saveOwl(sparkApi, _owl, costOwlTestPath);
            }).then(_ => {
                return owlapi.closeOwl(sparkApi, _owl);
            }).then(_ => {
                done();
            }).catch(log);
        },
    },
};