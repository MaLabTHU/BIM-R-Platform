#include "interface.h"

#include <ifcengine.h>
#include <malloc.h>

intptr_t openModelBN(char* fileName, char* schemaName) {
    return sdaiOpenModelBN(0, fileName, schemaName);
}

void closeModel(intptr_t model) {
    sdaiCloseModel(model);
}

char* getSPFFHeaderItemAsString(intptr_t model, intptr_t itemIndex, intptr_t itemSubIndex) {
    char* value = 0;
    GetSPFFHeaderItem(model, itemIndex, itemSubIndex, sdaiSTRING, &value);
    return value;
}

wchar_t* getSPFFHeaderItemAsUnicode(intptr_t model, intptr_t itemIndex, intptr_t itemSubIndex) {
    wchar_t* value = 0;
    GetSPFFHeaderItem(model, itemIndex, itemSubIndex, sdaiUNICODE, (char**)&value);
    return value;
}

intptr_t* getEntityExtentBN(intptr_t model, char* entityName) {
    return sdaiGetEntityExtentBN(model, entityName);
}

intptr_t getMemberCount(intptr_t* aggregate) {
    return sdaiGetMemberCount(aggregate);
}

intptr_t getAggrElementAsInteger(intptr_t* aggregate, intptr_t elementIndex) {
    intptr_t value = 0;
    engiGetAggrElement(aggregate, elementIndex, sdaiINTEGER, &value);
    return value;
}

double getAggrElementAsDouble(intptr_t* aggregate, intptr_t elementIndex) {
    double value = 0;
    engiGetAggrElement(aggregate, elementIndex, sdaiREAL, &value);
    return value;
}

char* getAggrElementAsString(intptr_t* aggregate, intptr_t elementIndex) {
    char* value = 0;
    engiGetAggrElement(aggregate, elementIndex, sdaiSTRING, &value);
    return value;
}

wchar_t* getAggrElementAsUnicode(intptr_t* aggregate, intptr_t elementIndex) {
    wchar_t* value = 0;
    engiGetAggrElement(aggregate, elementIndex, sdaiUNICODE, &value);
    return value;
}

intptr_t getAggrElementAsInstance(intptr_t* aggregate, intptr_t elementIndex) {
    intptr_t value = 0;
    engiGetAggrElement(aggregate, elementIndex, sdaiINSTANCE, &value);
    return value;
}

intptr_t getAttrBNAsInteger(intptr_t instance, char* attributeName) {
    intptr_t value = 0;
    sdaiGetAttrBN(instance, attributeName, sdaiINTEGER, &value);
    return value;
}

double getAttrBNAsDouble(intptr_t instance, char* attributeName) {
    double value = 0;
    sdaiGetAttrBN(instance, attributeName, sdaiINTEGER, &value);
    return value;
}

char* getAttrBNAsString(intptr_t instance, char* attributeName) {
    char* value = 0;
    sdaiGetAttrBN(instance, attributeName, sdaiSTRING, &value);
    return value;
}

wchar_t* getAttrBNAsUnicode(intptr_t instance, char* attributeName) {
    wchar_t* value = 0;
    sdaiGetAttrBN(instance, attributeName, sdaiUNICODE, &value);
    return value;
}

intptr_t getAttrBNAsInstance(intptr_t instance, char* attributeName) {
    intptr_t value = 0;
    sdaiGetAttrBN(instance, attributeName, sdaiINSTANCE, &value);
    return value;
}

intptr_t* getAttrBNAsAggr(intptr_t instance, char* attributeName) {
    intptr_t* value = 0;
    sdaiGetAttrBN(instance, attributeName, sdaiAGGR, &value);
    return value;
}

char* getInstanceClassInfo(intptr_t instance) {
    return engiGetInstanceClassInfo(instance);
}

intptr_t getInstanceLocalId(intptr_t instance) {
    return engiGetInstanceLocalId(instance);
}

IfcGeo* getGeo(intptr_t model, intptr_t instance) {
    IfcGeo* geo = (IfcGeo*)calloc(1, sizeof(IfcGeo));
    initializeModellingInstance(model, &geo->noVertices, &geo->noIndices, 0, instance);
    if (geo->noVertices && geo->noIndices) {
        geo->vertices = (float*)calloc(geo->noVertices * 6, sizeof(float));
        geo->indices = (int*)calloc(geo->noIndices, sizeof(int));
        finalizeModelling(model, geo->vertices, (intptr_t*)geo->indices, 0);
        intptr_t startVertex, startIndex;
        getInstanceInModelling(model, instance, 1, &startVertex, &startIndex, &geo->primitiveCount);
    }
    return geo;
}

float getGeoVerticesFloat(IfcGeo* geo, int i) {
    return geo->vertices[i];
}

int getGeoIndicesInt(IfcGeo* geo, int i) {
    return geo->indices[i];
}

void delGeo(IfcGeo* geo) {
    free(geo->vertices);
    free(geo->indices);
    free(geo);
}
