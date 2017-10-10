using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Xbim.Common;
using Xbim.Ifc;
using Xbim.Ifc4.Interfaces;

namespace ifc {
    class Filter {

        public static PropertyTranformDelegate GeometryAndPlacementRules = (property, parentObject) => {
            var name = property.PropertyInfo.Name;
            //leave out geometry and placement
            if (parentObject is IIfcProduct && (name == nameof(IIfcProduct.Representation) || name == nameof(IIfcProduct.ObjectPlacement))) { return null; }
            //leave out mapped geometry
            if (parentObject is IIfcTypeProduct && name == nameof(IIfcTypeProduct.RepresentationMaps)) { return null; }
            //only bring over IsDefinedBy and IsTypedBy inverse relationships which will take over all properties and types
            if (property.EntityAttribute.Order < 0 && !(name == nameof(IIfcProduct.IsDefinedBy) || name == nameof(IIfcProduct.IsTypedBy))) { return null; }
            return property.PropertyInfo.GetValue(parentObject, null);
        };

        public void apply(IfcStore oldModel, IfcStore newModel, PropertyTranformDelegate rules) {
            using (var transaction = newModel.BeginTransaction("InsertCopy")) {
                // single map should be used for all insertions between two models
                var map = new XbimInstanceHandleMap(oldModel, newModel);
                foreach (var item in oldModel.Instances.OfType<IIfcRoot>()) {
                    newModel.InsertCopy(item, map, rules, true, false);
                }
                transaction.Commit();
            }
        }

        public static void Test(string[] args) {
            var oldFile = "house.ifc";
            var newFile = "house_simplified.ifc";
            using (var oldModel = IfcStore.Open(oldFile)) {
                using (var newModel = IfcStore.Create(oldModel.IfcSchemaVersion, XbimStoreType.InMemoryModel)) {
                    new Filter().apply(oldModel, newModel, Filter.GeometryAndPlacementRules);
                    newModel.SaveAs(newFile);
                }
            }
        }

    }
}
