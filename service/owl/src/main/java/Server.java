import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.apache.jena.query.ResultSet;
import org.apache.jena.query.ResultSetFormatter;
import spark.Request;
import spark.Response;

import java.io.ByteArrayOutputStream;

import static spark.Spark.*;

/**
 * Created by Luciferz2012 on 02/18/2017.
 */
public class Server {

    Server run(int serverPort) {
        port(serverPort);
        System.out.println("running at " + serverPort);
        before((req, res) ->
                System.out.println(req.host() + '\t' + req.protocol() + '-' + req.requestMethod() + '\t' + req.url())
        );
        get("/", (req, res) ->
                "usage - todo" // todo
        );
        return route();
    }

    Server route() {
        post("/v1/owls", (req, res) -> {
            JsonObject data = getJsonData(req);
            if (data != null) {
                JsonElement path = data.get("path");
                if (path != null) {
                    return json(new Wrapper().open(path.getAsString()), res);
                }
            }
            return error(400, "missing path in post data", res);
        });
        get("/v1/owls", (req, res) ->
                json(Wrapper.WRAPPERS, res)
        );
        get("/v1/owls/:owlId", (req, res) ->
                checkOwlId(req, res, wrapper -> json(wrapper, res))
        );
        delete("/v1/owls/:owlId", (req, res) ->
                checkOwlId(req, res, wrapper -> json(wrapper.close(), res))
        );
        post("/v1/owls/:owlId/query", (req, res) ->
                checkOwlId(req, res, wrapper -> {
                    JsonObject data = getJsonData(req);
                    if (data != null) {
                        JsonElement query = data.get("query");
                        if (query != null) {
                            return json(wrapper.query(query.getAsString()), res);
                        }
                    }
                    return error(400, "missing query in post data", res);
                })
        );
        // todo
        return this;
    }

    static Object checkOwlId(Request req, Response res,
                             Func1<Wrapper, Object> withOwlId) {
        String id = req.params(":owlId");
        Wrapper wrapper = Wrapper.WRAPPERS.get(id);
        return wrapper != null ? withOwlId.apply(wrapper) : error(404, "owlId not found: " + id, res);
    }

    static String toJson(Object object) {
        return new Gson().toJson(object);
    }



    static JsonElement fromJson(String string) {
        return new Gson().fromJson(string, JsonElement.class);
    }

    static JsonObject getJsonData(Request req) {
        JsonElement json = fromJson(req.body());
        return json != null ? json.getAsJsonObject() : null;
    }

    static String json(Object object, Response res) {
        res.type("application/json");
        return toJson(object);
    }

    static String error(int code, String msg, Response res) {
        res.status(code);
        ResponseError error = new ResponseError();
        error.code = code;
        error.msg = msg;
        return json(error, res);
    }

}

class ResponseError {
    int code;
    String msg;
}

@FunctionalInterface
interface Func0<R> {
    R apply();
}

@FunctionalInterface
interface Func1<T1, R> {
    R apply(T1 t1);
}

@FunctionalInterface
interface Func2<T1, T2, R> {
    R apply(T1 t1, T2 t2);
}

@FunctionalInterface
interface Func3<T1, T2, T3, R> {
    R apply(T1 t1, T2 t2, T3 t3);
}

@FunctionalInterface
interface Func4<T1, T2, T3, T4, R> {
    R apply(T1 t1, T2 t2, T3 t3, T4 t4);
}