"use strict";

let nancyApi = 'http://127.0.0.1:5000/';
let sparkApi = 'http://127.0.0.1:5001/';

const path = require('path');
const fs = require('fs-extra');

const estimateDb = require('./service/xls/estimate-db');
const standardDb = require('./service/dat/standard-db.js');

const restify = require('restify');
const requestify = require('requestify');

let server = restify.createServer();

server.use(restify.CORS());
server.use(restify.queryParser());
server.use(restify.bodyParser({keepExtensions: true}));

server.listen(4999, () => {
    console.log('%s listening at %s', server.name, server.url);
});

server.use((req, res, next) => {
    console.log(req.headers.origin || 'localhost', '\t', req.httpVersion, '-', req.method, '\t', req.url);
    next();
});

server.get(':name', (req, res, next) => {
    res.send('hello ' + req.params.name);
    next();
});

server.get(/\/static\/?.*/, restify.serveStatic({
    directory: __dirname,
}));

// fixme move some basic business logic into model

function createProject(data, res, next) {
    estimateDb.Project.create(data).then(project => {
        res.send(project);
        next();
    });
}

function acceptUpload(uuid) {
    return new Promise((resolve, reject) => {
        estimateDb.Upload.findOne({
            where: {
                uuid: uuid,
            },
        }).then(upload => {
            if (upload) {
                let target = path.join('data/upload', path.basename(upload.path));
                fs.copy(upload.path, path.join('static', target), reject);
                resolve(target);
            } else {
                reject(new Error('upload not found with uuid: ' + uuid));
            }
        }).catch(reject);
    });
}

server.post('v1/uploads', (req, res, next) => {
    estimateDb.Upload.create({
        uuid: req.body.uuid,
        name: req.files.file.name,
        path: req.files.file.path,
    }).then(upload => {
        res.send(upload);
        next();
    });
});

server.post('v1/projects', (req, res, next) => {
    estimateDb.Project.findOne({
        where: {
            projectName: req.body.projectName,
        },
        include: [
            {model: estimateDb.Upload}
        ],
    }).then(project => {
        if (project) {
            res.send(409);
            next();
        } else {
            if (req.body.modelPath) {
                createProject(req.body, res, next);
            } else if (req.body.modelUuid) {
                acceptUpload(req.body.modelUuid).then(target => {
                    req.body.modelPath = target;
                    createProject(req.body, res, next);
                }).catch(error => {
                    error.stateCode = 404;
                    res.send(error);
                    next();
                });
            } else {
                res.send(400);
                next();
            }
        }
    });
});

server.get('v1/projects', (req, res, next) => {
    let options = {
        include: [
            {model: estimateDb.Upload}
        ],
        order: [
            ['id', 'DESC'],
        ],
    };
    if (req.params.limit) {
        options.limit = req.params.limit;
    }
    estimateDb.Project.findAll(options).then(projects => {
        res.send(projects);
        next();
    });
});

function checkProject(req) {
    return new Promise((resolve, reject) => {
        estimateDb.Project.findOne({
            where: {
                id: req.params.projectId,
            },
            include: [
                {model: estimateDb.Upload}
            ],
        }).then(project => {
            if (project) {
                resolve(project);
            } else {
                reject(new Error('project not found with id: ' + req.params.projectId));
            }
        }).catch(reject);
    });
}

function getProjectHandler(req, res, next) {
    checkProject(req).then(project => {
        res.send(project);
        next();
    }).catch(error => {
        res.send(error);
        next();
    });
}

server.get('v1/projects/:projectId', getProjectHandler);

server.put('v1/projects/:projectId', (req, res, next) => {
    let project = req.body || req.params;
    // fixme check modelPath and uuid then acceptUpload
    estimateDb.Project.update(project, {
        where: {
            id: req.params.projectId,
        }
    }).then(_ => {
        getProjectHandler(req, res, next);
    });
});

// server.get('v1/projects/:projectId/products', (req, res, next)=> {
//     checkProject(req).then(project=> {
//         return project.getProducts();
//     }).then(products=> {
//         res.send(products);
//         next();
//     }).catch(error=> {
//         res.send(404);
//         res.send(error);
//         next();
//     });
// });

server.post('v1/projects/:projectId/analyze', (req, res, next) => {
    let _project;
    checkProject(req).then(project => {
        _project = project;
        return project.loadModel(nancyApi);
    }).then(_ => {
        let i = 0;
        return _project.inferModel(sparkApi, _ => {
            console.log(i++);
        });
    }).then(inferred => {
        res.send({inferred: inferred}); // fixme return products with boqCode and quotaCode
        next();
    }).catch(error => {
        res.send(error);
        next();
    });
    // checkProject(req).then(project=> {
    //     let i = 0;
    //     project.inferModel('', _=> {
    //         console.log(i++); // fixme
    //     });
    //     setTimeout(_=> {
    //         res.send(project);
    //         next();
    //     }, 3000);
    // }).catch(error=> {
    //     res.send(404);
    //     res.send(error);
    //     next();
    // });
});

server.get('v1/projects/:projectId/boqs', (req, res, next) => {
    // fixme deprecate?
    let _products;
    checkProject(req).then(project => {
        return project.getProducts();
    }).then(products => {
        _products = products;
        return standardDb.getBoqItems({$or: [{$like: '105%'}, {$like: '117%'}]});
    }).then(value => {
        let items = {};
        let classified = {
            type: 'classified',
            id: req.params.boqId,
            name: '已分类构件', // fixme
            children: [],
        };
        parseStandardStructure(classified, value.items, value.mainSections, itemNode => {
            itemNode.children = [];
            items[itemNode.code] = itemNode;
            return itemNode;
        });
        let unclassified = {
            type: 'unclassified',
            id: -1,
            name: '未分类构件',
            children: [],
        };
        for (let product of _products) {
            let productNode = {
                type: product.type,
                id: product.lineId,
                name: product.name,
            };
            if (product.boqCode in items) {
                items[product.boqCode].children.push(productNode);
            } else {
                unclassified.children.push(productNode);
            }
        }
        let root = {
            type: 'root',
            id: '',
            name: 'root',
            children: [classified, unclassified],
        };
        res.send(root);
        next();
    }).catch(error => {
        res.send(error);
        next();
    });
});

// tables

server.post('v1/projects/:projectId/generate/boq', (req, res, next) => {
    checkProject(req).then(project => {
        return project.getProducts({
            order: ['boqCode'],
        });
    }).then(products => {
        let boqCodeDict = {};
        let boqCode = null;
        let boqProducts = [];
        boqCodeDict[boqCode] = boqProducts;
        for (let product of products) {
            if (boqCode != product.boqCode) {
                boqCode = product.boqCode;
                boqProducts = [];
                boqCodeDict[boqCode] = boqProducts;
            }
            boqProducts.push(product);
        }
        for (let boqCode in boqCodeDict) {
            if (boqCode) {
                project.addBoqItem({})
            }
            console.log(boqCode, boqCodeDict[boqCode].length);
        }
        res.send(boqCodeDict.length);
        next();
    });
});

server.post('v1/projects/:projectId/generate/quota', (req, res, next) => {

});

server.get('v1/projects/:projectId/boqs/direct-boq', (req, res, next) => {
    checkProject(req).then(project => {
        return project.getBoqItems({
            include: [
                {model: estimateDb.BoqFeature, as: 'features'},
                {model: estimateDb.Product},
            ],
        });
    }).then(boqItems => {
        res.send(boqItems);
        next();
    }).catch(error => {
        res.send(error);
        next();
    });
});

server.get('v1/projects/:projectId/boqs/price-analysis', (req, res, next) => {
    // todo
    res.send(404);
    next();
});

server.get('v1/projects/:projectId/boqs/measure-summary', (req, res, next) => {
    // todo
    res.send(404);
    next();
});

// standards - fixme deprecate?



function getSectionNode(section, sectionCode) {
    return {
        type: 'section',
        id: section.id,
        code: sectionCode,
        name: section.name,
        children: [],
    };
}

function parseStandardStructurePlus(root, items, sectionMap, itemHandler) {
    let tradeNode = {id: null};
    let sectionNode = {id: null};
    let sectionNodeIndex = {};
    for (let item of items) {
        let section = item.Section;
        let trade = section.Trade;
        if (trade.id != tradeNode.id) {
            tradeNode = {
                type: 'trade',
                id: trade.id,
                code: trade.code,
                name: trade.name,
                children: [],
            };
            root.children.push(tradeNode);
        }
        if (section.id != sectionNode.id) {
            let sectionCode = standardDb.getSectionCodePlus(section);
            sectionNode = getSectionNode(section, sectionCode);
            sectionNodeIndex[sectionCode] = sectionNode;
            let insertNode = sectionNode;
            while (true) {
                sectionCode = sectionCode.slice(0, -2);
                let parentSection = sectionMap[sectionCode];
                if (!parentSection) {
                    tradeNode.children.push(insertNode);
                    break;
                }
                let parentSectionNode = sectionNodeIndex[sectionCode];
                if (parentSectionNode) {
                    parentSectionNode.children.push(insertNode);
                    break;
                } else {
                    parentSectionNode = getSectionNode(parentSection, sectionCode);
                    sectionNodeIndex[sectionCode] = parentSectionNode;
                    parentSectionNode.children.push(insertNode);
                    insertNode = parentSectionNode;
                }
            }
        }
        let itemNode = {
            type: 'item',
            id: item.id,
            code: item.code,
            name: item.name,
        };
        if (item.Features) {
            itemNode.features = item.Features.map(feature => feature.name);
        }
        if (item.Works) {
            itemNode.works = item.Works.map(work => work.name);
        }
        if (item.Work) {
            let works = item.Work.name.split(/\d\. ?/);
            if (works[0].length == 0) {
                works = works.slice(1);
            }
            itemNode.works = works.map(work=>work.replace(/\. ?$/, ''));
        }
        if (itemHandler) {
            itemNode = itemHandler(itemNode, item);
        }
        sectionNode.children.push(itemNode);
    }
}

let defaultBoq = {
    id: 0,
    name: 'boq_beijing_2013',
};

server.get('v1/standards/boq', (req, res, next) => {
    res.send([defaultBoq]); // fixme
    next();
});

server.get('v1/standards/boq/:boqId', (req, res, next) => {
    res.send(defaultBoq); // fixme
    next();
});

// server.get('v1/standards/boq/:boqId/structure', (req, res, next) => {
//     standardDb.getBoqItems({$or: [{$like: '105%'}, {$like: '117%'}]}).then(value => {
//         let root = {
//             type: 'standard',
//             id: req.params.boqId,
//             name: 'boq_beijing_2013', // fixme
//             children: [],
//         };
//         parseStandardStructure(root, value.items, value.mainSections, null, standardDb.getSectionCode);
//         res.send(root);
//         next();
//     });
// });

server.get('v1/standards/boq/:boqId/structure', (req, res, next) => {
    standardDb.getBoqItemsPlus({$or: [{$like: '105%'}, {$like: '117%'}]}).then(value => {
        let root = {
            type: 'standard',
            id: req.params.boqId,
            name: 'boq_beijing_2013',
            children: [],
        };
        parseStandardStructurePlus(root, value.items, value.map);
        res.send(root);
        next();
    });
});

server.get('v1/standards/boq/:boqId/items/:code', (req, res, next) => {
    res.send(404);
    next();
});

let defaultQuota = {
    id: 0,
    name: 'quota_beijing_2012',
};

server.get('v1/standards/quota', (req, res, next) => {
    res.send([defaultQuota]);
    next();
});

server.get('v1/standards/quota/:quotaId', (req, res, next) => {
    res.send(defaultQuota);
    next();
});

// server.get('v1/standards/quota/:quotaId/structure', (req, res, next) => {
//     standardDb.getQuotaItems({$or: [{$like: '105%'}, {$like: '112%'}]}).then(value => {
//         let root = {
//             type: 'standard',
//             id: req.params.quotaId,
//             name: 'quota_beijing_2012', // fixme
//             children: [],
//         };
//         parseStandardStructure(root, value.items, value.mainSections, null, section => {
//             return ('0' + section.code).slice(-10);
//         });
//         res.send(root);
//         next();
//     });
// });

server.get('v1/standards/quota/:quotaId/structure', (req, res, next) => {
    standardDb.getQuotaItemsPlus({$or: [{$like: '105%'}, {$like: '112%'}]}).then(value => {
        let root = {
            type: 'standard',
            id: req.params.quotaId,
            name: 'quota_beijing_2012', // fixme
            children: [],
        };
        parseStandardStructurePlus(root, value.items, value.map);
        res.send(root);
        next();
    });
});

server.get('v1/standards/quotas/:quotaId/items/:code', (req, res, next) => {
    res.send(404);
    next();
});
