import openllet.jena.PelletReasonerFactory;
import openllet.query.sparqldl.jena.SparqlDLExecutionFactory;
import org.apache.jena.ontology.OntModel;
import org.apache.jena.query.*;
import org.apache.jena.rdf.model.ModelFactory;
import org.junit.Test;

/**
 * Created by Luciferz2012 on 02/17/2017.
 */
public class QueryWrapperTest {

    @Test
    public void rlQuery() {
        OntModel model = ModelFactory.createOntologyModel(PelletReasonerFactory.THE_SPEC);
        model.read(getClass().getResource("cost.rl.owl").getFile());
        Query query = QueryFactory.read(getClass().getResource("cost.sparql").getFile());
        QueryExecution execution = SparqlDLExecutionFactory.create(query, model);
        ResultSet resultSet = execution.execSelect();
        System.out.println(query);
        ResultSetFormatter.out(resultSet);
        System.out.println();
    }

    @Test
    public void dlQuery() {
        OntModel model = ModelFactory.createOntologyModel(PelletReasonerFactory.THE_SPEC);
        model.read(getClass().getResource("cost.dl.owl").getFile());
        Query query = QueryFactory.read(getClass().getResource("cost.sparql").getFile());
        QueryExecution execution = SparqlDLExecutionFactory.create(query, model);
        ResultSet resultSet = execution.execSelect();
        System.out.println(query);
        ResultSetFormatter.out(resultSet);
        System.out.println();
    }

}
