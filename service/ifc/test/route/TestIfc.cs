using log4net;
using Nancy;
using Nancy.Testing;
using nancy_xbim.route;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.IO;
using System.Reflection;
using Xunit;

namespace nancy_xbim.test {
    public class TestIfc: Test {
        BrowserResponse postModel(string path = @"data\wall.ifc") {
            return logResponse(browser.Post("/v1/ifcs", with => {
                //with.FormValue("path", path);
                with.JsonBody(new { path = path });
            }));
        }
        [Fact]
        void testPostModel() {
            var r1 = postModel(@"data\house.ifc");
            Assert.Equal(HttpStatusCode.Created, r1.StatusCode);
            var r2 = postModel(@"data\house.ifc");
            Assert.Equal(HttpStatusCode.Conflict, r2.StatusCode);
        }

        [Fact]
        void testWexbim() {
            var r1 = postModel(@"data\\glodon_structure - Copy.ifc");
            logResponse(r1);
        }

        [Fact]
        void testGetModels() {
            logResponse(browser.Get("/v1/ifcs"));
        }

        BrowserResponse getModel(string id = "") {
            return logResponse(browser.Get(string.Format("/v1/ifcs/{0}", id)));
        }
        [Fact]
        void testGetModel() {
            getModel();
            var j1 = parseResponseAsJson(postModel());
            getModel();
            var j2 = parseResponseAsJson(getModel((string)j1.id));
        }

        BrowserResponse deleteModel(string id) {
            return logResponse(browser.Delete(string.Format("/v1/ifcs/{0}", id)));
        }
        [Fact]
        void testDeleteModel() {
            var j1 = parseResponseAsJson(postModel());
            var r2 = deleteModel((string)j1.id);
            var j2 = parseResponseAsJson(r2);
            Assert.Equal(j1.id, j2.id);
        }

        BrowserResponse getEntity(string modelId, string entityId = "") {
            return logResponse(browser.Get(string.Format("/v1/ifcs/{0}/entities/{1}", modelId, entityId)));
        }
        [Fact]
        void testGetEntity() {
            var j1 = parseResponseAsJson(postModel());
            var j2 = parseResponseAsJson(getEntity((string)j1.id));
            var r3 = getEntity((string)j1.id, "3000");
            Assert.Equal(HttpStatusCode.NotFound, r3.StatusCode);
            var r4 = getEntity((string)j1.id, (string)j2.id);
        }

        BrowserResponse getAttribute(string modelId, string entityId) {
            return logResponse(browser.Get(string.Format("v1/ifcs/{0}/entities/{1}/attributes", modelId, entityId)));
        }

        [Fact]
        void testGetAttributes() {
            var j1 = parseResponseAsJson(postModel(@"data\glodon_structure.ifc"));
            string modelId = j1.id;
            string entityId = "18874";
            var r2 = getAttribute(modelId, entityId);
            logResponse(r2);
            var j2 = parseResponseAsJson(r2);
        }

        BrowserResponse getAttributeByPath(string modelId, string entityId, string attributePath = "") {
            return logResponse(browser.Get(string.Format("/v1/ifcs/{0}/entities/{1}/attributes/q={2}", modelId, entityId, attributePath)));
        }
        [Fact]
        void testGetAttribute() {
            // todo
        }

        BrowserResponse getQuantity(string modelId, string entityId) {
            return logResponse(browser.Get(string.Format("/v1/ifcs/{0}/entities/{1}/quantities", modelId, entityId)));
        }
        [Fact]
        void testGetQuantity() {
            var j1 = parseResponseAsJson(postModel(@"data\10mWall.ifc"));
            var j2 = parseResponseAsJson(getQuantity((string)j1.id, "140"));
            double volume;
            if (double.TryParse((string)j2.volume, out volume)) {
                Assert.True(Math.Abs(volume - 10000.0 * 4000.0 * 200.0) < 1);
            }
            var j3 = parseResponseAsJson(postModel(@"data\10mWallwithWindow.ifc"));
            parseResponseAsJson(getQuantity((string)j3.id, "140"));
            parseResponseAsJson(getQuantity((string)j3.id, "408"));
        }
    }

    public class TestModule: NancyModule {
        public TestModule(): base("/v1/ifcs/test/") {
            Get["/post"] = _ => {
                Test.post(Request, "/v1/ifcs/", new { path = @"data\house.ifc" });
                return "posted";
            };
        }
    }
}