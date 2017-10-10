using Nancy;
using Nancy.Bootstrapper;
using Nancy.Conventions;
using Nancy.Diagnostics;
using Nancy.Hosting.Self;
using System;
using System.IO;
using System.Linq;

namespace nancy_xbim {
    class CustomRootPathProvider : IRootPathProvider {
        public string GetRootPath() {
            return Program.rootPath;
        }
    }

    public class CustomBoostrapper : DefaultNancyBootstrapper {
        protected override void ApplicationStartup(Nancy.TinyIoc.TinyIoCContainer container, IPipelines pipelines) {
            if (Program.debug) {
                StaticConfiguration.EnableRequestTracing = true;
            } else {
                DiagnosticsHook.Disable(pipelines);
            }
            base.ApplicationStartup(container, pipelines);
            pipelines.EnableCORS();
        }
        protected override DiagnosticsConfiguration DiagnosticsConfiguration {
            get { return new DiagnosticsConfiguration { Password = Program.password }; }
        }

        protected override IRootPathProvider RootPathProvider {
            get { return new CustomRootPathProvider(); }
        }
        protected override void ConfigureConventions(NancyConventions conventions) {
            conventions.StaticContentsConventions.Add(StaticContentConventionBuilder.AddDirectory("/static", Program.staticPath));
            var serviceWorkerJs = Path.Combine(Program.staticPath, @"service-worker.js");
            conventions.StaticContentsConventions.Add(StaticContentConventionBuilder.AddFile("/service-worker.js", serviceWorkerJs));
            base.ConfigureConventions(conventions);
        }
    }

    public static class MyNancyExtension {
        public static void EnableCORS(this IPipelines pipelines) {
            pipelines.AfterRequest.AddItemToEndOfPipeline(ctx => {
                if (ctx.Request.Headers.Keys.Contains("Origin")) {
                    var origins = "" + string.Join(" ", ctx.Request.Headers["Origin"]);
                    ctx.Response.Headers["Access-Control-Allow-Origin"] = origins;
                    if (ctx.Request.Method == "OPTIONS") {
                        // handle CORS preflight request
                        ctx.Response.Headers["Access-Control-Allow-Methods"] =
                            "GET, POST, PUT, DELETE, OPTIONS";
                        if (ctx.Request.Headers.Keys.Contains("Access-Control-Request-Headers")) {
                            var allowedHeaders = "" + string.Join(
                                                     ", ", ctx.Request.Headers["Access-Control-Request-Headers"]);
                            ctx.Response.Headers["Access-Control-Allow-Headers"] = allowedHeaders;
                        }
                    }
                }
            });
        }
    }

    class Program {
        public static bool debug = false;
        public static string password = "123456789";
        public static string rootPath = Path.Combine(Directory.GetCurrentDirectory(), @"..\..\..\..\static\");
        public static string staticPath = @".";
        static void Main(string[] args) {
            var uri = "http://localhost:5000/";
            if (args.Length > 0) {
                //debug = True;
                //rootPath = @".";
                //staticPath = @".";
                uri = args[0];
            }
            Directory.SetCurrentDirectory(rootPath);
            var config = new HostConfiguration();
            config.UrlReservations.CreateAutomatically = true;
            using(var host = new NancyHost(new CustomBoostrapper(), config, new Uri(uri))) {
                host.Start();
                Console.WriteLine("running on " + uri);
                Console.ReadLine();
            }
        }
    }

    public class HelloModule : NancyModule {
        public HelloModule() {
            Get["/"] = _ => "Hello, world!";
        }
    }
}
