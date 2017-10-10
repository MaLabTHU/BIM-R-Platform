#pragma once

#include <stdint.h>

intptr_t openModelBN(char* fileName, char* schemaName);
void closeModel(intptr_t model);
char* getSPFFHeaderItemAsString(intptr_t model, intptr_t itemIndex, intptr_t itemSubIndex);
wchar_t* getSPFFHeaderItemAsUnicode(intptr_t model, intptr_t itemIndex, intptr_t itemSubIndex);
intptr_t* getEntityExtentBN(intptr_t model, char* entityName);
intptr_t getMemberCount(intptr_t* aggregate);
intptr_t getAggrElementAsInteger(intptr_t* aggregate, intptr_t elementIndex);
double getAggrElementAsDouble(intptr_t* aggregate, intptr_t elementIndex);
char* getAggrElementAsString(intptr_t* aggregate, intptr_t elementIndex);
wchar_t* getAggrElementAsUnicode(intptr_t* aggregate, intptr_t elementIndex);
intptr_t getAggrElementAsInstance(intptr_t* aggregate, intptr_t elementIndex);
intptr_t getAttrBNAsInteger(intptr_t instance, char* attributeName);
double getAttrBNAsDouble(intptr_t instance, char* attributeName);
char* getAttrBNAsString(intptr_t instance, char* attributeName);
wchar_t* getAttrBNAsUnicode(intptr_t instance, char* attributeName);
intptr_t getAttrBNAsInstance(intptr_t instance, char* attributeName);
intptr_t* getAttrBNAsAggr(intptr_t instance, char* attributeName);
char* getInstanceClassInfo(intptr_t instance);
intptr_t getInstanceLocalId(intptr_t instance);

typedef struct {
    intptr_t noVertices, noIndices, primitiveCount;
    float* vertices;
    int* indices;
} IfcGeo;

// do not call getGeo with the same parameters twice, function "initializingModelInstance" will consume twice memory, which could not be released until the model is closed
IfcGeo* getGeo(intptr_t model, intptr_t instance);
float getGeoVerticesFloat(IfcGeo* geo, int i);
int getGeoIndicesInt(IfcGeo* geo, int i);
void delGeo(IfcGeo* geo);
