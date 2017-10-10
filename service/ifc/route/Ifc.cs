using log4net;
using Nancy;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Dynamic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using Xbim.Common.Geometry;
using Xbim.Geometry.Engine.Interop;
using Xbim.Ifc;
using Xbim.ModelGeometry.Scene;
using Xbim.Common;
using Xbim.Ifc4.Interfaces;
using Xbim.Ifc4.MeasureResource;

namespace nancy_xbim.route {
    public class IfcModule : NancyModule {
        private static readonly ILog log = LogManager.GetLogger(MethodBase.GetCurrentMethod().DeclaringType);

        // data
        static Dictionary<string, string> modelPath_modelId_dict = new Dictionary<string, string>();
        class IfcModel {
            public string id;
            public string path;
            public string wexbimPath;
            //public string modelName;
            internal IfcStore store;
        }
        static Dictionary<string, IfcModel> modelId_model_dict = new Dictionary<string, IfcModel>();
        static IXbimGeometryEngine engine = new XbimGeometryEngine();

        // todo seperate model and api definition

        // route
        public IfcModule() : base("/v1/ifcs") {
            Before += ctx => {
                log.Info(string.Format("{0}\t{1}-{2}\t{3}", Request.UserHostAddress, Request.ProtocolVersion, Request.Method, Request.Url));
                return null;
            };
            Post[""] = _ => {
                var path = requestData().path;
                if (path) {
                    string id;
                    // fixme should be replaced with session management to open same model for modification
                    if (modelPath_modelId_dict.TryGetValue(path, out id)) {
                        return responseJson(modelId_model_dict[id], HttpStatusCode.Conflict);
                    }
                    id = generateId();
                    try {
                        var model = openModel(id, path);
                        return model != null ? responseJson(model, HttpStatusCode.Created) :
                               responseJson(new { error = "failed to open model in path: " + path }, HttpStatusCode.BadRequest);
                    } catch (Exception e) {
                        return responseJson(new { error = e.ToString() }, HttpStatusCode.InternalServerError);
                    }
                }
                return responseJson(new { error = "missing path in post data" }, HttpStatusCode.BadRequest);
            };
            Get[""] = _ => {
                return responseJson(modelId_model_dict);
            };
            Get["/{modelId}"] = parameters => checkModelId(parameters,
            (DWithModel)(model => {
                return responseJson(model);
            }));
            Delete["/{modelId}"] = parameters => checkModelId(parameters,
            (DWithModel)(model => {
                closeModel(model);
                return responseJson(new { id = model.id });
            }));
            Get["/{modelId}/structure"] = parameters => checkModelId(parameters,
            (DWithModel)(model => {
                var ifcProject = model.store.Instances.FirstOrDefault<IIfcProject>();
                if (ifcProject != null) {
                    return responseJson(entityToJson(ifcProject, true, Request.Query["check"])); //check for multi shape
                }
                return responseJson(new { error = "IfcProject not found in model: " + model.path }, HttpStatusCode.NotFound);
            }));
            Get["/{modelId}/entities/{entityId?}"] = parameters => checkEntityId(parameters,
            (DWithEntity)((model, entity) => {
                return responseJson(entityToJson(entity));
            }));
            Get["/{modelId}/entities/{entityId}/attributes"] = parameters => checkEntityId(parameters,
            (DWithEntity)((model, entity) => {
                dynamic attributes = new ExpandoObject();
                attributes.e = entityToJson(entity);
                if (entity is IIfcProduct) {
                    var product = (IIfcProduct)entity;
                    attributes.g = getGeometries(product);
                    attributes.m = getMaterials(product);
                    attributes.p = getProperties(product);
                    // todo attributes.s(hapes)
                }
                return responseJson(attributes);
            }));
            Get["/{modelId}/entities/{entityId}/attributes/{attributePath}"] = parameters => checkEntityId(parameters,
            (DWithEntity)((model, entity) => {
                string attributePath = parameters.attributePath;
                // todo
                return responseJson(new { msg = "todo" });
            }));
            Get["/{modelId}/entities/{entityId}/quantities"] = parameters => checkEntityId(parameters,
            (DWithEntity)((model, entity) => {
                if (entity is IIfcProduct) {
                    var json = entityToJson(entity);
                    json.volume = (double)0;
                    json.surfaceArea = (double)0;
                    handleProductForShape((IIfcProduct)entity, (DHandleShape)((shape, isMapped) => {
                        addQuantities(json, shapeToSolid(shape, engine));
                    }));
                    return responseJson(json);
                }
                return null;
            }));
        }

        // helper func
        Response responseJson(object o, HttpStatusCode c = HttpStatusCode.OK) {
            var response = Response.AsJson(o);
            response.StatusCode = c;
            return response;
        }
        dynamic requestData() {
            if (Request.Headers.ContentType.ToLower() == "application/json") {
                int length = (int)Request.Body.Length;
                byte[] data = new byte[length];
                Request.Body.Read(data, 0, length);
                return JObject.Parse(Encoding.UTF8.GetString(data)).ToObject<DynamicDictionary>();
            }
            return Request.Form;
        }
        static int id = 0;
        static string generateId() {
            return (id++).ToString();
        }
        IfcModel openModel(string id, string path) {
            var editor = new XbimEditorCredentials {
                //ApplicationDevelopersName = "You",
                //ApplicationFullName = "Your app",
                //ApplicationIdentifier = "Your app ID",
                //ApplicationVersion = "4.0",
                //your user
                //EditorsFamilyName = "Santini Aichel",
                //EditorsGivenName = "Johann Blasius",
                //EditorsOrganisationName = "Independent Architecture"
            };
            // var store = IfcStore.Open(path, editor, false);
            var store = IfcStore.Open(path, editor);
            if (store != null) {
                modelPath_modelId_dict[path] = id;
                var wexbimPath = Path.ChangeExtension(path, "wexbim");
                var model = new IfcModel { id = id, path = path, store = store, wexbimPath = wexbimPath};
                modelId_model_dict[id] = model;
                if (!File.Exists(wexbimPath)) {
                    var modelContext = new Xbim3DModelContext(store);
                    modelContext.CreateContext();
                    using (var wexbimFile = File.Create(wexbimPath)) {
                        using (var writer = new BinaryWriter(wexbimFile)) {
                            store.SaveAsWexBim(writer);
                            writer.Close();
                        }
                        wexbimFile.Close();
                    }
                }
                return model;
            }
            return null;
        }
        void closeModel(IfcModel model) {
            modelId_model_dict.Remove(model.id);
            modelPath_modelId_dict.Remove(model.path);
            model.store.Close();
        }
        void setName(dynamic json, IfcLabel? name) {
            if (name != null) {
                json.name = name.Value.Value;
            }
        }
        dynamic entityToJson(IPersistEntity entity, bool iterate = false, bool check = false) {
            dynamic json = new ExpandoObject();
            json.id = entity.EntityLabel;
            json.type = entity.GetType().Name;
            if (entity is IIfcRoot) {
                setName(json, ((IIfcRoot)entity).Name);
            }
            if (iterate) {
                if (entity is IIfcObjectDefinition) {
                    var decomposedBy = new List<dynamic>();
                    foreach (var r in((IIfcObjectDefinition)entity).IsDecomposedBy) {
                        foreach (var e in r.RelatedObjects) {
                            decomposedBy.Add(entityToJson(e, iterate, check));
                        }
                    }
                    if (decomposedBy.Any()) {
                        json.decomposedBy = decomposedBy;
                    }
                }
                if (entity is IIfcSpatialStructureElement) {
                    var contains = new List<dynamic>();
                    foreach (var r in((IIfcSpatialStructureElement)entity).ContainsElements) {
                        foreach (var e in r.RelatedElements) {
                            contains.Add(entityToJson(e, iterate, check));
                        }
                    }
                    if (contains.Any()) {
                        json.contains = contains;
                    }
                }
            }
            if (check) {
                if (entity is IIfcProduct) {
                    var numOfShape = 0;
                    handleProductForShape((IIfcProduct)entity, (DHandleShape)((shape, isMapped) => {
                        numOfShape++;
                    }));
                    if (numOfShape > 1) {
                        json.multiShape = true;
                    }
                }
            }
            return json;
        }
        IIfcShapeRepresentation getBodyRepresentation(IIfcProduct product) {
            return product.Representation != null
                   ? product.Representation.Representations.OfType<IIfcShapeRepresentation>()
                   .Where(r => string.Compare(r.RepresentationIdentifier.GetValueOrDefault(), "Body", true) == 0).FirstOrDefault()
                   : null;
        }
        IIfcShapeRepresentation getMappedBodyRepresentation(IIfcMappedItem item) {
            return string.Compare(item.MappingSource.MappedRepresentation.RepresentationIdentifier, "Body", true) == 0
                   ? (IIfcShapeRepresentation)item.MappingSource.MappedRepresentation
                   : null;
        }
        delegate void DHandleShape(IIfcGeometricRepresentationItem shape, bool isMapped = true);
        void handleProductForShape(IIfcProduct product, DHandleShape handleShape) {
            var representation = getBodyRepresentation(product);
            if (representation != null) {
                foreach (var shape in representation.Items.OfType<IIfcGeometricRepresentationItem>()) {
                    handleShape(shape);
                }
                foreach (var item in representation.Items.OfType<IIfcMappedItem>()) {
                    foreach (var shape in getMappedBodyRepresentation(item).Items.OfType<IIfcGeometricRepresentationItem>()) {
                        handleShape(shape, false);
                    }
                }
            }
        }
        IXbimSolid shapeToSolid(IIfcGeometricRepresentationItem shape, IXbimGeometryEngine engine = null) {
            engine = engine != null ? engine : new XbimGeometryEngine();
            var type = shape.GetType();
            if (shape == null) {
            } else if (shape is IIfcBlock) {
                return engine.CreateSolid((IIfcBlock)shape);
            } else if (shape is IIfcBooleanClippingResult) {
                return engine.CreateSolid((IIfcBooleanClippingResult)shape);
            } else if (shape is IIfcBoundingBox) {
                return engine.CreateSolid((IIfcBoundingBox)shape);
            } else if (shape is IIfcBoxedHalfSpace) {
                return engine.CreateSolid((IIfcBoxedHalfSpace)shape);
            } else if (shape is IIfcCsgPrimitive3D) {
                return engine.CreateSolid((IIfcCsgPrimitive3D)shape);
            } else if (shape is IIfcCsgSolid) {
                return engine.CreateSolid((IIfcCsgSolid)shape);
            } else if (shape is IIfcExtrudedAreaSolid) {
                return engine.CreateSolid((IIfcExtrudedAreaSolid)shape);
            } else if (shape is IIfcHalfSpaceSolid) {
                return engine.CreateSolid((IIfcHalfSpaceSolid)shape);
            } else if (shape is IIfcPolygonalBoundedHalfSpace) {
                return engine.CreateSolid((IIfcPolygonalBoundedHalfSpace)shape);
            } else if (shape is IIfcRectangularPyramid) {
                return engine.CreateSolid((IIfcRectangularPyramid)shape);
            } else if (shape is IIfcRevolvedAreaSolid) {
                return engine.CreateSolid((IIfcRevolvedAreaSolid)shape);
            } else if (shape is IIfcRightCircularCone) {
                return engine.CreateSolid((IIfcRightCircularCone)shape);
            } else if (shape is IIfcRightCircularCylinder) {
                return engine.CreateSolid((IIfcRightCircularCylinder)shape);
            } else if (shape is IIfcSphere) {
                return engine.CreateSolid((IIfcSphere)shape);
            } else if (shape is IIfcSurfaceCurveSweptAreaSolid) {
                return engine.CreateSolid((IIfcSurfaceCurveSweptAreaSolid)shape);
            } else if (shape is IIfcSweptAreaSolid) {
                return engine.CreateSolid((IIfcSweptAreaSolid)shape);
            } else if (shape is IIfcSweptDiskSolid) {
                return engine.CreateSolid((IIfcSweptDiskSolid)shape);
            } else if (shape is IIfcBooleanOperand) {
                return engine.CreateSolid((IIfcBooleanOperand)shape);
            }
            return null;
        }
        void addQuantities(dynamic json, IXbimSolid solid) {
            json.volume += solid.Volume;
            json.surfaceArea += solid.SurfaceArea;
        }
        List<dynamic> getGeometries(IIfcProduct product) {
            var geometries = new List<dynamic>();
            handleProductForShape(product, (DHandleShape)((shape, isMapped) => {
                dynamic geometry = new ExpandoObject();
                geometries.Add(geometry);
                geometry.profile = new ExpandoObject();
                geometry.axis = new ExpandoObject();
                if (shape == null) {
                } else if (shape is IIfcSweptAreaSolid) {
                    var solid = (IIfcSweptAreaSolid)shape;
                    var area = solid.SweptArea;
                    var _profileShape = "";
                    if (area == null) {
                    } else if (area is IIfcRectangleProfileDef) {
                        geometry.profile.shape = _profileShape = "rectangle";
                    }
                    if (solid is IIfcExtrudedAreaSolid) {
                        geometry.axis.shape = "line";
                        var extrudedAreaSolid = (IIfcExtrudedAreaSolid)solid;
                        var direction = extrudedAreaSolid.ExtrudedDirection;
                        if (_profileShape == "rectangle" && direction.X == 0 && direction.Y == 0) {
                            geometry.shape = "box";
                        }
                    }
                }
            }));
            return geometries;
        }
        dynamic getMaterials(IIfcProduct product) {
            return materialToJson(product.Material);
        }
        dynamic materialToJson(IIfcMaterialSelect material) {
            dynamic json = new ExpandoObject();
            if (material is IIfcMaterialLayerSetUsage) {
                json.set = materialToJson(((IIfcMaterialLayerSetUsage)material).ForLayerSet);
            } else if (material is IIfcMaterialLayerSet) {
                var layerSet = (IIfcMaterialLayerSet)material;
                setName(json, layerSet.LayerSetName);
                json.t = layerSet.TotalThickness.Value;
                var layers = new List<dynamic>();
                foreach (var layer in layerSet.MaterialLayers) {
                    layers.Add(materialToJson(layer));
                }
                json.layers = layers;
            } else if (material is IIfcMaterialLayer) {
                var layer = (IIfcMaterialLayer)material;
                json.t = layer.LayerThickness.Value;
                json.m = materialToJson(layer.Material);
            } else if (material is IIfcMaterial) {
                var m = (IIfcMaterial)material;
                setName(json, m.Name);
                // todo
            }
            return json;
        }
        dynamic getProperties(IIfcProduct product) {
            var properties = new Dictionary<object, object>();
            var self = new Dictionary<object, object>();
            foreach (var r in product.IsDefinedBy.OfType<IIfcRelDefinesByProperties>()) {
                addProperty(self, r.RelatingPropertyDefinition);
            }
            if (self.Any()) {
                properties[""] = self;
            }
            foreach (var r in product.IsTypedBy) {
                var t = r.RelatingType;
                var json = new Dictionary<object, object>();
                foreach (var p in t.HasPropertySets) {
                    addProperty(json, p);
                }
                if (json.Any()) {
                    properties[t.Name.Value.Value] = json;
                }
            }
            return properties;
        }
        void addProperty(IDictionary<object, object> properties, IIfcPropertySetDefinitionSelect property) {
            if (property is IIfcPropertySet) {
                var set = (IIfcPropertySet)property;
                var json = new Dictionary<object, object>();
                foreach (var p in set.HasProperties) {
                    if (p is IIfcPropertySingleValue) {
                        var value = ((IIfcPropertySingleValue)p).NominalValue.Value;
                        if (!(value is string && value.ToString().Length == 0)) {
                            json[p.Name.Value] = value;
                        }
                        //json[p.Name.Value] = ((IIfcPropertySingleValue)p).NominalValue.Value;
                    }
                }
                if (json.Any()) {
                    properties[set.Name.Value.Value] = json;
                }
            }
        }

        // check model id
        delegate Response DWithModel(IfcModel model);
        Response checkModelId(dynamic parameters, DWithModel withModel) {
            var modelId = parameters.modelId;
            if (modelId) {
                IfcModel model;
                if (modelId_model_dict.TryGetValue(modelId, out model)) {
                    return withModel(model);
                }
                return responseJson(new { error = "invalid modelId: " + modelId }, HttpStatusCode.NotFound);
            }
            return responseJson(new { error = "missing modelId in url" }, HttpStatusCode.BadRequest);
        }

        // check object id
        delegate Response DWithEntity(IfcModel model, IPersistEntity entity);
        Response checkEntityId(dynamic parameters, DWithEntity withEntity) {
            return checkModelId(parameters, (DWithModel)(model => {
                var entityId = parameters.entityId;
                if (entityId) {
                    int id;
                    if (Int32.TryParse(entityId, out id)) {
                        var entity = model.store.Instances[id];
                        if (entity != null) {
                            return withEntity(model, entity);
                        }
                    }
                    return responseJson(new { error = "invalid entityId: " + entityId }, HttpStatusCode.NotFound);
                }
                return responseJson(new { error = "missing entityId in url" }, HttpStatusCode.BadRequest);
            }));
        }
    }
}
