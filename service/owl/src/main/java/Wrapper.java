import com.google.gson.Gson;
import com.google.gson.JsonElement;
import openllet.jena.PelletReasonerFactory;
import openllet.query.sparqldl.jena.SparqlDLExecutionFactory;
import org.apache.jena.ontology.OntModel;
import org.apache.jena.query.Query;
import org.apache.jena.query.QueryFactory;
import org.apache.jena.query.ResultSet;
import org.apache.jena.query.ResultSetFormatter;
import org.apache.jena.rdf.model.ModelFactory;

import java.io.ByteArrayOutputStream;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Created by Luciferz2012 on 02/18/2017.
 */
public class Wrapper {

    static Map<String, Wrapper> WRAPPERS = new ConcurrentHashMap<>();
    static int ID = 0;
    static String generateId() {
        return "" + ID++;
    }

    final String id;
    final transient OntModel model;

    String path;

    public Wrapper() {
        id = generateId();
        model = ModelFactory.createOntologyModel(PelletReasonerFactory.THE_SPEC);
        WRAPPERS.put(id, this);
    }

    public Wrapper open(String path) {
        model.read(path);
        this.path = path;
        return this;
    }

    public Wrapper close(){
        model.close();
        WRAPPERS.remove(id);
        this.path = null;
        return this;
    }

    public ResultSet query(Query query) {
        return SparqlDLExecutionFactory.create(query, model).execSelect();
    }

    public String query(String query) {
        return toJson(query(QueryFactory.create(query)));
    }

    static String toJson(ResultSet resultSet) {
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        ResultSetFormatter.outputAsJSON(stream, resultSet);
        // todo simplify prefixes
        return new Gson().fromJson(new String(stream.toByteArray()), JsonElement.class).toString();
    }

}
