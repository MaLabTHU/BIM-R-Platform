'use strict';

const assert = require('assert');

const standardDb = require('../standard-db.js');

function log(msg) {
    // console.log(msg);
}

module.exports = {
    'standard-db': {
        '#getBoqItems()': {
            'should return value{items[], mainSections{}}': function (done) {
                standardDb.getBoqItems({$like: '10501%'}).then(value=> {
                    assert.equal(true, value.items.length > 0);
                    log('---Items---');
                    for (let item of value.items) {
                        log(item.code, item.name);
                    }
                    assert.equal(true, Object.keys(value.mainSections).length > 0);
                    log('---Sections---');
                    for (let sectionCode of Object.keys(value.mainSections)) {
                        log(sectionCode, value.mainSections[sectionCode].name);
                    }
                    done();
                }).catch(log);
            },
        },
    },
};