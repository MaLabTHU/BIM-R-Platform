'use strict';

const requestify = require('requestify');

function wrapper(promise) {
    return new Promise((resolve, reject)=>promise.then(res=>resolve(res.getBody())).catch(reject));
}

function getOwls(api) {
    return wrapper(requestify.get(api + 'v1/owls'));
}
module.exports.getOwls = getOwls;

function createOrOpenOwl(api, path) {
    return wrapper(requestify.post(api + 'v1/owls', {path: path}));
}
module.exports.createOrOpenOwl = createOrOpenOwl;

function closeOwl(api, owl) {
    return wrapper(requestify.delete(api + 'v1/owls/' + owl.id));
}
module.exports.closeOwl = closeOwl;

function saveOwl(api, owl, path) {
    return wrapper(requestify.post(api + 'v1/owls/' + owl.id + '/save', {path: path}));
}
module.exports.saveOwl = saveOwl;

function copyOwl(api, owl) {
    return wrapper(requestify.post(api + 'v1/owls/' + owl.id + '/copy'));
}
module.exports.copyOwl = copyOwl;

function inferOwl(api, owl) {
    return wrapper(requestify.post(api + 'v1/owls/' + owl.id + '/infer'));
}
module.exports.inferOwl = inferOwl;

function getPrefixes(api, owl) {
    return wrapper(requestify.get(api + 'v1/owls/' + owl.id + '/prefixes'));
}
module.exports.getPrefixes = getPrefixes;

function addPrefixes(api, owl, prefixes) {
    return wrapper(requestify.post(api + 'v1/owls/' + owl.id + '/prefixes', prefixes));
}
module.exports.addPrefixes = addPrefixes;

function getClses(api, owl) {
    return wrapper(requestify.get(api + 'v1/owls/' + owl.id + '/classes'));
}
module.exports.getClses = getClses;

function getCls(api, owl, iri) {
    return wrapper(requestify.get(api + 'v1/owls/' + owl.id + '/classes/' + iri));
}
module.exports.getCls = getCls;

class Cls {
    constructor(iri, labels, supClses, eqClses, subClses, idvs) {
        this.iri = iri;
        this.labels = labels;
        this.supClses = supClses;
        this.eqClses = eqClses;
        this.subClses = subClses;
        this.idvs = idvs;
    }
}
module.exports.Cls = Cls;

function addCls(api, owl, cls) {
    return wrapper(requestify.post(api + 'v1/owls/' + owl.id + '/classes', cls));
}
module.exports.addCls = addCls;

function getClsExps(api, owl) {
    return wrapper(requestify.get(api + 'v1/owls/' + owl.id + '/expressions/class'));
}
module.exports.getClsExps = getClsExps;

function getClsExp(api, owl, iri) {
    return wrapper(requestify.get(api + 'v1/owls/' + owl.id + '/expressions/class/' + iri));
}
module.exports.getClsExp = getClsExp;

class ClsExp {
    constructor(exps, isOr, iri, eqClses, p, o, d, t) {
        this.exps = exps;
        this.isOr = isOr;
        this.iri = iri;
        this.eqClses = eqClses;
        this.p = p;
        this.o = o;
        this.d = d;
        this.t = t;
    }
}
module.exports.ClsExp = ClsExp;

function addClsExp(api, owl, clsExp) {
    return wrapper(requestify.post(api + 'v1/owls/' + owl.id + '/expressions/class', clsExp));
}
module.exports.addClsExp = addClsExp;

function getIdvs(api, owl) {
    return wrapper(requestify.get(api + 'v1/owls/' + owl.id + '/individuals'));
}
module.exports.getIdvs = getIdvs;

function getIdv(api, owl, iri) {
    return wrapper(requestify.get(api + 'v1/owls/' + owl.id + '/individuals/' + iri));
}
module.exports.getIdv = getIdv;

class Idv {
    constructor(iri, labels, types, objPrps, datPrps) {
        this.iri = iri;
        this.labels = labels;
        this.types = types;
        this.objPrps = objPrps;
        this.datPrps = datPrps;
    }
}
module.exports.Idv = Idv;

function addIdv(api, owl, idv) {
    return wrapper(requestify.post(api + 'v1/owls/' + owl.id + '/individuals', idv));
}
module.exports.addIdv = addIdv;

function addObjPrp(api, owl, objPrp) {
    return wrapper(requestify.post(api + 'v1/owls/' + owl.id + '/properties/object', objPrp));
}
module.exports.addObjPrp = addObjPrp;

function addDatPrp(api, owl, datPrp) {
    return wrapper(requestify.post(api + 'v1/owls/' + owl.id + '/properties/data', datPrp));
}
module.exports.addDatPrp = addDatPrp;
