import com.github.kevinsawicki.http.HttpRequest;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.junit.Test;
import org.semanticweb.owlapi.model.AddImport;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLOntologyCreationException;
import org.semanticweb.owlapi.model.OWLOntologyStorageException;
import org.semanticweb.owlapi.util.AutoIRIMapper;

import java.io.File;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.Assert.assertTrue;

public class MainTest {
    String api = "http://127.0.0.1:5001/";

    void log(Object object) {
        System.out.println(object);
        String str = object.toString();
        assertTrue(str != null && !str.contains("error") && !str.contains("404 not found"));
    }

    @Test
    public void getHello() {
        HttpRequest res = HttpRequest.get(api + "/hello");
        log(res.body());
    }

    HttpRequest _postOwl() {
        JsonObject data = new JsonObject();
        data.addProperty("path", "static/data/owl/pizza.owl");
        return HttpRequest.post(api + "v1/owls").send(data.toString());
    }

    @Test
    public void postOwl() {
        HttpRequest res = _postOwl();
        System.out.println(res.body());
        assertTrue(res.code() == 201 || res.code() == 409);
    }

    HttpRequest _getOwls() {
        return HttpRequest.get(api + "v1/owls");
    }

    @Test
    public void getOwls() {
        HttpRequest res = _getOwls();
        log(res.body());
    }

    JsonObject _getFirstOwlAsJson() {
        HttpRequest res = _getOwls();
        JsonArray owls = new Gson().fromJson(res.body(), JsonArray.class);
        return owls.size() > 0 ? owls.get(0).getAsJsonObject() : null;
    }

    @Test
    public void getOwl() {
        _postOwl().body();
        JsonObject o1 = _getFirstOwlAsJson();
        String id = o1.get("id").getAsString();
        HttpRequest res = HttpRequest.get(api + "v1/owls/" + id);
        JsonObject o2 = new Gson().fromJson(res.body(), JsonObject.class);
        assertTrue(o1.toString().equals(o2.toString()));
    }

    HttpRequest _postOwlToSave(String owlId, String path) {
        JsonObject data = new JsonObject();
        data.addProperty("path", path);
        return HttpRequest.post(api + "v1/owls/" + owlId + "/save").send(data.toString());
    }

    @Test
    public void postOwlToSave() {
        _postOwl().body();
        JsonObject owl = _getFirstOwlAsJson();
        log(_postOwlToSave(owl.get("id").getAsString(), "static/data/owl/save.test.owl").body());
    }

    JsonArray _getClassesAsJson(String owlId) {
        return new Gson().fromJson(HttpRequest.get(api + "v1/owls/" + owlId + "/classes").body(), JsonArray.class);
    }

    @Test
    public void getClasses() {
        _postOwl().body();
        JsonObject owl = _getFirstOwlAsJson();
        if (owl != null) {
            log(_getClassesAsJson(owl.get("id").getAsString()));
        }
    }

    JsonObject _getClassAsJson(String owlId, String iri) {
        return new Gson().fromJson(HttpRequest.get(api + "v1/owls/" + owlId + "/classes/" + iri).body(), JsonObject.class);
    }

    @Test
    public void getCls() {
        _postOwl().body();
        JsonObject owl = _getFirstOwlAsJson();
        log(_getClassAsJson(owl.get("id").getAsString(), "abc"));
        log(_getClassAsJson(owl.get("id").getAsString(), "test:abc"));
    }

    HttpRequest _postClass(String owlId, OWLClsWrapper cls) {
        return HttpRequest.post(api + "v1/owls/" + owlId + "/classes").send(new Gson().toJson(cls.toJsonable()));
    }

    @Test
    public void postClass() throws OWLOntologyCreationException {
        _postOwl().body();
        JsonObject owl = _getFirstOwlAsJson();
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.create();
        OWLClsWrapper cls = ont.addClass("TestClass");
        log(_postClass(owl.get("id").getAsString(), cls).body());
    }

    JsonArray _getExpressionsAsJson(String owlId) {
        String res = HttpRequest.get(api + "v1/owls/" + owlId + "/expressions/class").body();
        return new Gson().fromJson(res, JsonArray.class);
    }

    @Test
    public void getExpressions() {
        JsonObject owl = new Gson().fromJson(_postOwl().body(), JsonObject.class);
        log(_getExpressionsAsJson(owl.get("id").getAsString()));
    }

    HttpRequest _postExp(String owlId, OWLClsExpJsonable exp) {
        return HttpRequest.post(api + "v1/owls/" + owlId + "/expressions/class").send(new Gson().toJson(exp));
    }

    @Test
    public void postClsExp() {
        String res = HttpRequest.post(api + "v1/owls").body();
        log(res);
        JsonObject owl = new Gson().fromJson(res, JsonObject.class);
        OWLClsExpJsonable definedClass = new OWLClsExpJsonable("DefinedClassA");
        OWLClsExpJsonable eqCls = new OWLClsExpJsonable();
        definedClass.eqClses = Collections.singletonList(eqCls);
        OWLClsExpJsonable rst1 = new OWLClsExpJsonable();
        rst1.p = "hasB";
        rst1.o = new OWLClsExpJsonable("ClassB");
        OWLClsExpJsonable rst2 = new OWLClsExpJsonable("ClassC");
        eqCls.exps = Arrays.asList(rst1, rst2);
        String owlId = owl.get("id").getAsString();
        log(_postExp(owlId, definedClass).body());
        log(_postOwlToSave(owlId, "static/data/owl/exp.save.test.owl").body());
    }

    OWLClsExpJsonable _getClsExp(String owlId, String iri) {
        String res = HttpRequest.get(api + "v1/owls/" + owlId + "/expressions/class/" + iri).body();
        log(res);
        return new Gson().fromJson(res, OWLClsExpJsonable.class);
    }

    @Test
    public void getClsExp() {
        JsonObject owl = _getRequestData(_postOwl());
        OWLClsExpJsonable exp = _getClsExp(owl.get("id").getAsString(), "CheesyPizza");
        log(exp);
    }

    JsonObject _getPrefixes(String owlId) {
        return new Gson().fromJson(HttpRequest.get(api + "v1/owls/" + owlId + "/prefixes").body(), JsonObject.class);
    }

    @Test
    public void getPrefixes() {
        _postOwl().body();
        JsonObject owl = _getFirstOwlAsJson();
        log(_getPrefixes(owl.get("id").getAsString()));
    }

    HttpRequest _postPrefixes(String owlId, Map<String, String> prefixes) {
        return HttpRequest.post(api + "v1/owls/" + owlId + "/prefixes").send(new Gson().toJson(prefixes));
    }

    @Test
    public void postPrefixes() throws OWLOntologyCreationException {
        _postOwl().body();
        JsonObject owl = _getFirstOwlAsJson();
        String owlId = owl.get("id").getAsString();
        log(_postPrefixes(owlId, Stream.of(
                "product", "geometric", "material", "construction", "function",
                "cost", "boq", "quota", "test"
        ).collect(Collectors.toMap(name -> name, name -> "abc/" + name))).body());
        log(_getClassAsJson(owlId, "test:test"));
        log(_postOwlToSave(owlId, "static/data/owl/prefixes.test.owl").body());
    }

    JsonObject _getRequestData(HttpRequest request) {
        return new Gson().fromJson(request.body(), JsonObject.class);
    }

    @Test
    public void infer() {
        JsonObject oldOwl = _getRequestData(_postOwl());
        HttpRequest copyRequest = HttpRequest.post(api + "v1/owls/" + oldOwl.get("id").getAsString() + "/copy");
        JsonObject newOwl = _getRequestData(copyRequest);
        log(newOwl);
        HttpRequest inferRequest = HttpRequest.post(api + "v1/owls/" + newOwl.get("id").getAsString() + "/infer");
        JsonObject inferredOwl = _getRequestData(inferRequest);
        log(inferredOwl);
        JsonObject cheesyPizza = _getClassAsJson(inferredOwl.get("id").getAsString(), "CheesyPizza");
        log(cheesyPizza);
    }

    @Test
    public void close() {
        JsonObject owl = _getRequestData(_postOwl());
        HttpRequest request = HttpRequest.delete(api + "v1/owls/" + owl.get("id").getAsString());
        System.out.println(request.body());
//        JsonObject deleted = _getRequestData(request);
//        System.out.println(deleted);
    }

    @Test
    public void postIdv() throws OWLOntologyCreationException {
        HttpRequest newReq = HttpRequest.post(api + "v1/owls");
        JsonObject owl = _getRequestData(newReq);
        OWLOntWrapper ont = new OWLOntWrapper().load("../../static/data/owl/reason.owl");
        OWLIdvWrapper idv = ont.getIndividual("x");
        String data = new Gson().toJson(idv.toJsonable());
        log(data);
        HttpRequest postReq = HttpRequest.post(api + "v1/owls/" + owl.get("id").getAsString() + "/individuals").send(data);
        log(postReq.body());
    }

    @Test
    public void testImportAfterOpen() throws OWLOntologyCreationException, OWLOntologyStorageException {
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.load("../../static/data/owl/house_no_geo.ttl");
        ont.manager.getIRIMappers().add(new AutoIRIMapper(new File("../../static/data/owl/ifc2x3_tc1.ttl"), false));
        ont.manager.applyChange(new AddImport(ont.ont, ont.factory.getOWLImportsDeclaration(
                IRI.create("http://www.buildingsmart-tech.org/ifcOWL/IFC2X3_TC1"))));
        ont.save("../../static/data/owl/test.import.after.owl");
    }

    @Test
    public void testImportBeforeOpen() throws OWLOntologyCreationException, OWLOntologyStorageException {
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.manager.getIRIMappers().add(new AutoIRIMapper(new File("../../static/data/owl/ifc2x3_tc1.ttl"), false));
        ont.load("../../static/data/owl/house_no_geo.import.ttl");
//        ont.manager.applyChange(new AddImport(ont.ont, ont.factory.getOWLImportsDeclaration(
//                IRI.create("http://www.buildingsmart-tech.org/ifcOWL/IFC2X3_TC1"))));
        ont.save("../../static/data/owl/test.import.before.owl");
    }

    @Test
    public void testImportAfterOpenReverse() throws OWLOntologyCreationException, OWLOntologyStorageException {
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.manager.getIRIMappers().add(new AutoIRIMapper(new File("../../static/data/owl/express.ttl"), false));
        ont.manager.getIRIMappers().add(new AutoIRIMapper(new File("../../static/data/owl/house_no_geo.named.ttl"), false));
        ont.load("../../static/data/owl/ifc2x3_tc1.ttl");
        ont.manager.applyChange(new AddImport(ont.ont, ont.factory.getOWLImportsDeclaration(
                IRI.create("http://linkedbuildingdata.net/ifc/resources20170107_153526/"))));
        ont.save("../../static/data/owl/test.import.after.reversed.owl");
    }
}
