import openllet.jena.PelletReasonerFactory;
import org.apache.jena.ontology.Individual;
import org.apache.jena.ontology.OntModel;
import org.apache.jena.rdf.model.ModelFactory;
import org.junit.Test;

import java.util.Iterator;

/**
 * Created by Luciferz2012 on 02/15/2017.
 */
public class ReasoningWrapperTest {

    void printIterator(Iterator<?> i, String header) {
        System.out.println(header);
        for (int c = 0; c < header.length(); c++)
            System.out.print("=");
        System.out.println();
        if (i.hasNext()) {
            while (i.hasNext()) {
                System.out.println(i.next());
            }
        } else {
            System.out.println("<EMPTY>");
        }
        System.out.println();
    }

    @Test
    public void rlReasoning() {
        String ns = "http://www.semanticweb.org/luciferz2012/ontologies/2016/10/untitled-ontology-17#";
        OntModel model = ModelFactory.createOntologyModel(PelletReasonerFactory.THE_SPEC);
        model.read(getClass().getResource("cost.rl.owl").getFile());
        Individual individual = model.getIndividual(ns+"wall1");
        printIterator(individual.listOntClasses(true),"classes of wall1");
    }

    @Test
    public void dlReasoning() {
        String ns = "http://www.semanticweb.org/luciferz2012/ontologies/2016/10/untitled-ontology-17#";
        OntModel model = ModelFactory.createOntologyModel(PelletReasonerFactory.THE_SPEC);
        model.read(getClass().getResource("cost.dl.owl").getFile());
        Individual individual = model.getIndividual(ns+"wall1");
        printIterator(individual.listOntClasses(true),"classes of wall1");
    }

}
