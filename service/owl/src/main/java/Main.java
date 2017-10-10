import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.semanticweb.owlapi.model.OWLOntologyCreationException;
import org.semanticweb.owlapi.model.OWLOntologyStorageException;
import spark.Request;
import spark.Response;

import java.nio.file.Paths;
import java.util.stream.Collectors;

import static spark.Spark.*;

interface Wrapper {
    Object toJsonable();
}

public class Main {
    static Gson gson = new Gson();

    static JsonElement strToJson(String string) {
        return gson.fromJson(string, JsonElement.class);
    }

    static String jsonify(Object object, Response res) {
        res.type("application/json");
        return gson.toJson(object);
    }

    static String jsonify(Exception error, Response res) {
        return jsonify(error, res, 500);
    }

    static String jsonify(Exception error, Response res, int code) {
        return jsonify(error.getMessage(), res, code);
    }

    static String jsonify(String error, Response res, int code) {
        res.status(code);
        return jsonify(new ResponseError(error), res);
    }

    static String jsonify(Wrapper wrapper, Response res) {
        return jsonify(wrapper.toJsonable(), res);
    }

    static JsonObject getJsonData(Request req) {
        JsonElement json = strToJson(req.body());
        return json != null ? json.getAsJsonObject() : null;
    }

    static String checkPath(Request req) {
        JsonObject data = getJsonData(req);
        if (data != null) {
            JsonElement path = data.get("path");
            if (path != null) {
                return path.getAsString();
            }
        }
        return null;
    }

    static Object checkOwlId(Request req, Response res,
                             Func1<OWLOntWrapper, Object> withOwl) {
        String id = req.params(":owlId");
        OWLOntWrapper ont = OWLOntWrapper.map.get(id);
        return ont != null ? withOwl.apply(ont) : jsonify("owlId not found: " + id, res, 404);
    }

    static Object checkIri(Request req, Response res, Func2<OWLOntWrapper, String, Object> withIri) {
        return checkOwlId(req, res, ont -> {
            String iri = req.params(":iri");
            return iri != null ? withIri.apply(ont, iri) : jsonify("missing iri in url", res, 404);
        });
    }

    static void route(String staticLocation) {
        exception(Exception.class, (e, req, res) -> res.body(jsonify(e, res)));

        post("v1/owls", (req, res) -> {
            OWLOntWrapper ont = new OWLOntWrapper();
            String path = checkPath(req);
            if (path != null) {
                ont.load(staticLocation + "/" + path);
                ont.path = path;
            } else {
                ont.create();
            }
            res.status(201);
            return jsonify(ont, res);
        });

        get("v1/owls", (req, res) -> jsonify(OWLOntWrapper.map.values().stream().map(OWLOntWrapper::toJsonable).collect(Collectors.toList()), res));

        get("v1/owls/:owlId", (req, res) -> checkOwlId(req, res, ont -> jsonify(ont, res)));

        post("v1/owls/:owlId/save", (req, res) -> checkOwlId(req, res, ont -> {
            String path = checkPath(req);
            if (path != null) {
                try {
                    ont.save(staticLocation + "/" + path);
                    return jsonify(ont, res);
                } catch (OWLOntologyStorageException e) {
                    return jsonify(e, res);
                }
            }
            return jsonify("missing path in post data", res, 400);
        }));

        post("v1/owls/:owlId/copy", (req, res) -> checkOwlId(req, res, ont -> {
            try {
                return jsonify(ont.copy(), res);
            } catch (OWLOntologyCreationException e) {
                return jsonify(e, res);
            }
        }));

        delete("v1/owls/:owlId", (req, res) -> checkOwlId(req, res, ont -> {
            OWLOntWrapper temp = new OWLOntWrapper();
            temp.id = ont.id;
            ont.close();
            return jsonify(temp, res);
        }));

        post("v1/owls/:owlId/infer", (req, res) -> checkOwlId(req, res, ont -> jsonify(ont.infer(), res)));

        get("v1/owls/:owlId/prefixes", (req, res) -> checkOwlId(req, res, ont -> jsonify(ont.getPrefixes(), res)));

        post("v1/owls/:owlId/prefixes", (req, res) -> checkOwlId(req, res, ont -> {
            JsonObject data = getJsonData(req);
            if (data != null) {
                data.entrySet().forEach(e -> ont.setPrefix(e.getKey(), e.getValue().getAsString()));
                res.status(201);
                return jsonify(data, res);
            }
            return jsonify("missing prefix in post data", res, 400);
        }));

        get("v1/owls/:owlId/classes", (req, res) -> checkOwlId(req, res, ont ->
                jsonify(ont.getClasses().map(OWLClsWrapper::toJsonable).collect(Collectors.toSet()), res)
        ));

        post("v1/owls/:owlId/classes", (req, res) -> checkOwlId(req, res, ont -> {
            OWLClsJsonable cls = gson.fromJson(req.body(), OWLClsJsonable.class);
            OWLClsWrapper wrapper = ont.addClass(cls);
            return jsonify(wrapper, res);
        }));

        get("v1/owls/:owlId/classes/:iri", (req, res) ->
                checkIri(req, res, (ont, iri) -> jsonify(ont.getClass(iri), res)
                ));

        get("v1/owls/:owlId/expressions/class", (req, res) -> checkOwlId(req, res, ont ->
                jsonify(ont.getClasses().map(ont::getClassExpression).collect(Collectors.toSet()), res)
        ));

        post("v1/owls/:owlId/expressions/class", (req, res) -> checkOwlId(req, res, ont -> {
            OWLClsExpJsonable exp = gson.fromJson(req.body(), OWLClsExpJsonable.class);
            OWLClsWrapper wrapper = ont.addClass(exp);
            return jsonify(ont.getClassExpression(wrapper), res);
        }));

        get("v1/owls/:owlId/expressions/class/:iri", (req, res) ->
                checkIri(req, res, (ont, iri) -> jsonify(ont.getClassExpression(iri), res)
                ));

        get("v1/owls/:owlId/properties/object", (req, res) -> checkOwlId(req, res, ont ->
                jsonify(ont.getObjectProperties().map(OWLPrpWrapper::toJsonable).collect(Collectors.toSet()), res)
        ));

        post("v1/owls/:owlId/properties/object", (req, res) -> checkOwlId(req, res, ont -> {
            OWLPrpJsonable prp = gson.fromJson(req.body(), OWLPrpJsonable.class);
            OWLObjPrpWrapper wrapper = ont.addObjectProperty(prp.iri);
            return jsonify(wrapper, res);
        }));

        get("v1/owls/:owlId/properties/object/:iri", (req, res) ->
                checkIri(req, res, (ont, iri) -> jsonify(ont.getObjectProperty(iri), res)
                ));

        get("v1/owls/:owlId/properties/data", (req, res) -> checkOwlId(req, res, ont ->
                jsonify(ont.getDataProperties().map(OWLPrpWrapper::toJsonable).collect(Collectors.toSet()), res)
        ));

        post("v1/owls/:owlId/properties/data", (req, res) -> checkOwlId(req, res, ont -> {
            OWLPrpJsonable prp = gson.fromJson(req.body(), OWLPrpJsonable.class);
            OWLDatPrpWrapper wrapper = ont.addDataProperty(prp.iri);
            return jsonify(wrapper, res);
        }));

        get("v1/owls/:owlId/properties/data/:iri", (req, res) ->
                checkIri(req, res, (ont, iri) -> jsonify(ont.getDataProperty(iri), res)
                ));

        get("v1/owls/:owlId/individuals", (req, res) -> checkOwlId(req, res, ont ->
                jsonify(ont.getIndividuals().map(OWLIdvWrapper::toJsonable).collect(Collectors.toSet()), res)
        ));

        post("v1/owls/:owlId/individuals", (req, res) -> checkOwlId(req, res, ont -> {
            OWLIdvJsonable idv = gson.fromJson(req.body(), OWLIdvJsonable.class);
            OWLIdvWrapper wrapper = ont.addIndividual(idv);
            return jsonify(wrapper, res);
        }));

        get("v1/owls/:owlId/individuals/:iri", (req, res) ->
                checkIri(req, res, (ont, iri) -> jsonify(ont.getIndividual(iri), res)
                ));
    }

    public static void main(String[] args) {
        int serverPort = 5001;
        port(serverPort);
        String staticLocation = Paths.get("../../").toAbsolutePath().toString();
        staticFiles.externalLocation(staticLocation); // unsafe
        System.out.println("running wrapper " + serverPort + " and serving static files wrapper " + staticLocation);

        before((req, res) -> System.out.println(req.host() + '\t' + req.protocol() + '-' + req.requestMethod() + '\t' + req.url()));

        get("hello", (req, res) -> "Hello World");

        route(staticLocation);
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
}

class ResponseError {
    String error;

    ResponseError(String error) {
        this.error = error;
    }
}
