using System;
using System.IO;
using Xbim.Ifc2x3.Kernel;
using Xbim.Ifc2x3.Extensions;
using Xbim.IO;
using Xbim.ModelGeometry.Scene;
using XbimGeometry.Interfaces;
using Xbim.Geometry.Engine.Interop;
using Xbim.Ifc2x3.GeometricModelResource;

namespace xbim_convert {
    class Program {
        static void Main(string[] args) {
            if (args.Length > 0) {
                WriteWexBim(args[0]);
            } else {
                //TestGeo(@"..\..\..\..\data\wall.ifc");
                WriteWexBim(@"..\..\..\..\data\wall.ifc");
            }
        }

        private static void WriteWexBim(string fNameIn) {
            using(var m = new XbimModel()) {
                m.CreateFrom(fNameIn, null, null, true);
                var m3D = new Xbim3DModelContext(m);
                //m3D.CreateContext(XbimGeometryType.Polyhedron); // wrong geometryType
                //using(TextWriter writer = File.CreateText(Path.ChangeExtension(fNameIn, "json"))) {
                //    m3D.CreateSceneJs(writer);
                //}
                m3D.CreateContext(XbimGeometryType.PolyhedronBinary);
                using(var bw = new BinaryWriter(new FileStream(Path.ChangeExtension(fNameIn, "wexbim"), FileMode.Create))) {
                    m3D.Write(bw);
                    bw.Close();
                }
            }
        }

        private static void TestGeo(string fNameIn) {
            var fNameInEx = Path.ChangeExtension(fNameIn, "xbim");
            using(var m = new XbimModel()) {
                m.CreateFrom(fNameIn, fNameInEx, null, true);
                foreach (IfcProduct product in m.IfcProducts) {
                    Console.WriteLine(product);
                    var shape = ProductExtensions.GetBodyRepresentation(product);
                    if (shape != null) {
                        Console.WriteLine(shape.RepresentationIdentifier);
                        Console.WriteLine(shape.RepresentationType);
                        var engine = new XbimGeometryEngine();
                        foreach (IfcFacetedBrep item in shape.Items) {
                            var solid = engine.CreateSolid(item);
                            Console.WriteLine(solid.Volume);
                            Console.WriteLine(solid.SurfaceArea);
                            foreach (var face in solid.Faces) {
                                Console.WriteLine(face.Area);
                                Console.WriteLine(face.Normal);
                            }
                        }
                    }
                }
                Console.ReadKey();
            }
        }
    }
}
