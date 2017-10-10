using log4net;
using Nancy;
using Nancy.Testing;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.IO;
using System.Reflection;
using Xunit;

namespace nancy_xbim.test {
    public class Test {
        protected static readonly ILog log = LogManager.GetLogger(MethodBase.GetCurrentMethod().DeclaringType);
        protected static readonly Browser browser = new Browser(new CustomBoostrapper());
        public Test() {
            Directory.SetCurrentDirectory(Program.rootPath);
        }

        protected dynamic parseResponseAsJson(BrowserResponse response) {
            return JObject.Parse(response.Body.AsString());
        }
        protected BrowserResponse logResponse(BrowserResponse response) {
            log.Debug(response.Body.AsString());
            return response;
        }
        public static void post(Request request, string api, object json) {
            using(var client = new System.Net.WebClient()) {
                client.Headers[System.Net.HttpRequestHeader.ContentType] = "application/json";
                client.UploadString(new Uri(new Uri(request.Url.SiteBase), api), JsonConvert.SerializeObject(json));
            }
        }

        BrowserResponse getServiceWorker() {
            return logResponse(browser.Get("/service-worker.js"));
        }
        [Fact]
        void testGetServiceWorker() {
            var r1 = getServiceWorker();
            Assert.Equal(HttpStatusCode.OK, r1.StatusCode);
        }

    }
}
