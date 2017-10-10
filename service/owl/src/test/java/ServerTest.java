import com.github.kevinsawicki.http.HttpRequest;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import openllet.jena.PelletReasonerFactory;
import openllet.query.sparqldl.jena.SparqlDLExecutionFactory;
import org.apache.jena.ontology.OntModel;
import org.apache.jena.query.*;
import org.apache.jena.rdf.model.ModelFactory;
import org.junit.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * Created by Luciferz2012 on 02/18/2017.
 */
public class ServerTest {

    String api = "http://127.0.0.1:5000";

//    @SuppressWarnings("unused")
//    class ModelWrapper{
//        String url;
//        transient OntModel model;
//    }

    @Test
    public void modelJsonify() {
//        OntModel model = Wrapper.open(getClass().getResource("cost.dl.owl").getFile());
//        ModelWrapper wrapper = new ModelWrapper();
//        wrapper.url = "abc";
//        wrapper.model = model;
//        System.out.println(new Gson().toJson(wrapper));
        System.out.println(new Gson().toJson(new Wrapper().open(getClass().getResource("cost.dl.owl").getFile())));
    }

    HttpRequest _postOwl(String path) {
        JsonObject data = new JsonObject();
        data.addProperty("path", path);
        return HttpRequest.post(api + "/v1/owls").send(data.toString());
    }

    @Test
    public void postOwl() {
        System.out.println(_postOwl("C:\\.code\\bim-r-platform\\owl\\src\\test\\resources\\cost.dl.owl").body());
    }

    HttpRequest _getOwl(String id) {
        return HttpRequest.get(api + "/v1/owls/" + id);
    }

    @Test
    public void getOwl() {
        HttpRequest request = _postOwl("C:\\.code\\bim-r-platform\\owl\\src\\test\\resources\\cost.dl.owl");
        JsonObject owl = Server.fromJson(request.body()).getAsJsonObject();
        JsonElement id = owl.get("id");
        System.out.println(_getOwl(id.getAsString()).body());
    }

    HttpRequest _deleteOwl(String id) {
        return HttpRequest.delete(api + "/v1/owls/" + id);
    }

    @Test
    public void deleteOwl() {
        HttpRequest request = _postOwl("C:\\.code\\bim-r-platform\\owl\\src\\test\\resources\\cost.dl.owl");
        JsonObject owl = Server.fromJson(request.body()).getAsJsonObject();
        JsonElement id = owl.get("id");
        System.out.println(_deleteOwl(id.getAsString()).body());
    }

    @Test
    public void queryToJson() {
        OntModel model = ModelFactory.createOntologyModel(PelletReasonerFactory.THE_SPEC);
        model.read(getClass().getResource("cost.rl.owl").getFile());
        Query query = QueryFactory.read(getClass().getResource("cost.sparql").getFile());
        QueryExecution execution = SparqlDLExecutionFactory.create(query, model);
        ResultSet resultSet = execution.execSelect();
        System.out.println(query);
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        ResultSetFormatter.outputAsJSON(stream, resultSet);
        String json = new String(stream.toByteArray());
        System.out.println(json);
        System.out.println();
    }

    HttpRequest _queryOwl(String id, String query){
        JsonObject data = new JsonObject();
        data.addProperty("query", query);
        return HttpRequest.post(api+"/v1/owls/"+id+"/query").send(data.toString());
    }

    @Test
    public void queryOwl() throws IOException {
        HttpRequest request = _postOwl("C:\\.code\\bim-r-platform\\owl\\src\\test\\resources\\cost.dl.owl");
        JsonObject owl = Server.fromJson(request.body()).getAsJsonObject();
        JsonElement id = owl.get("id");
        System.out.println(getClass().getResource("cost.sparql").getFile().substring(1));
        String query = new String(Files.readAllBytes(Paths.get(getClass().getResource("cost.sparql").getFile().substring(1))));
        System.out.println(_queryOwl(id.getAsString(), query).body());
    }

}
