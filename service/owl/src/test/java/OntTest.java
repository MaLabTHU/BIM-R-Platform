import com.google.gson.Gson;
import org.junit.Test;
import org.semanticweb.owlapi.io.FileDocumentTarget;
import org.semanticweb.owlapi.io.OWLOntologyDocumentTarget;
import org.semanticweb.owlapi.model.OWLOntologyCreationException;
import org.semanticweb.owlapi.model.OWLOntologyStorageException;
import org.semanticweb.owlapi.util.InferredOntologyGenerator;
import org.semanticweb.owlapi.util.InferredPropertyAssertionGenerator;

import java.io.FileNotFoundException;
import java.util.Collections;

public class OntTest {

    @Test
    public void testGsonNull() throws OWLOntologyCreationException {
        OWLOntWrapper ont = new OWLOntWrapper().create();
        OWLOntJsonable o = (OWLOntJsonable) ont.toJsonable();
        String json = new Gson().toJson(o);
        System.out.println(json);
        System.out.println(new Gson().toJson(new OWLOntWrapper().create().close().toJsonable()));
    }

    OWLOntWrapper _getDefaultOntology() throws OWLOntologyCreationException {
        OWLOntWrapper ont = new OWLOntWrapper();
        return ont.load("../../static/data/owl/reason.owl");
    }

    @Test
    public void getPrefixes() throws OWLOntologyCreationException {
        OWLOntWrapper ont = _getDefaultOntology();
        ont.getPrefixes().forEach((key, value) -> System.out.println(key + ' ' + value));
    }

    @Test
    public void testReasoner() throws OWLOntologyCreationException {
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.load("../../static/data/owl/reason.owl");
//        System.out.println(ont.getIRI());
//        ont.setPrefix("base", ont.getIRI().toString());
//        ont.getPrefixes().forEach((name, prefix)->{
//            System.out.println(name+ ' '+ prefix);
//        });
        InferredOntologyGenerator gen = new InferredOntologyGenerator(ont.getReasoner());
        OWLOntWrapper inferred = new OWLOntWrapper();
        inferred.create();
        gen.fillOntology(inferred.factory, inferred.ont);
        inferred.ont.axioms().forEach(System.out::println);
        InferredPropertyAssertionGenerator pag = new InferredPropertyAssertionGenerator();
        pag.createAxioms(inferred.factory, ont.getReasoner()).forEach(ax -> {
            System.out.println(ax.getObject());
            System.out.println(ax.getProperty());
            System.out.println(ax.getSubject());
            System.out.println();
        });
        OWLIdvWrapper x = ont.addIndividual("x");
        pag.createAxioms(inferred.factory, ont.getReasoner()).stream().filter(ax -> ax.getSubject().compareTo(x.idv) == 0).forEach(System.out::println);
    }

    @Test
    public void testImport() throws OWLOntologyCreationException {
        OWLOntWrapper o1 = new OWLOntWrapper().create();
        OWLOntWrapper o2 = new OWLOntWrapper().load("../../static/data/owl/reason.owl");
        InferredPropertyAssertionGenerator pag = new InferredPropertyAssertionGenerator();
        pag.createAxioms(o1.factory, o1.getReasoner()).forEach(ax -> {
            System.out.println(ax.getObject());
            System.out.println(ax.getProperty());
            System.out.println(ax.getSubject());
            System.out.println();
        });
    }

    @Test
    public void testPrefixError() throws OWLOntologyCreationException {
        OWLOntWrapper ont = new OWLOntWrapper().create();
        try {
            ont.addClass("test:ABC");
        } catch (Exception e) {
            System.out.println(e.getClass());
            e.printStackTrace();
        }
    }

    @Test
    public void testCopy() throws OWLOntologyCreationException {
        OWLOntWrapper ont = new OWLOntWrapper().load("../../static/data/owl/pizza.owl");
        OWLOntWrapper o1 = ont.copy();
        OWLOntWrapper o2 = ont.copy();
    }

    @Test
    public void testInfer() throws OWLOntologyCreationException, FileNotFoundException, OWLOntologyStorageException {
        OWLOntWrapper old = new OWLOntWrapper().load("../../static/data/owl/pizza.owl");
        OWLOntWrapper ont = old.copy();
        ont.infer();
        OWLClsWrapper cls = ont.getClass("CheesyPizza");
        System.out.println(new Gson().toJson(cls.toJsonable()));
    }

    @Test
    public void testInferForIdv() throws OWLOntologyCreationException {
        OWLOntWrapper ont = new OWLOntWrapper().load("../../static/data/owl/pizza.owl");
        ont.infer();
        ont.ont.axioms().forEach(System.out::println);
        OWLIdvWrapper idv = ont.getIndividual("TwoCaloriesPizza");
        System.out.println(idv.idv);
        System.out.println(new Gson().toJson(idv.toJsonable()));
    }

    @Test
    public void addIdv() throws OWLOntologyCreationException {
        OWLOntWrapper ont = new OWLOntWrapper().create();
        OWLIdvWrapper idv = ont.addIndividual("test");
        OWLIdvJsonable i = (OWLIdvJsonable) idv.toJsonable();
        i.datPrps = Collections.singletonList(new OWLIdvDatPrpAxmJsonable("hasA", "object", null));
        ont.addIndividual(i);
        ont.ont.axioms().forEach(System.out::println);
    }

    @Test
    public void testSaveWithPrefix() throws OWLOntologyCreationException, OWLOntologyStorageException {
        OWLOntWrapper ont = new OWLOntWrapper().create();
        ont.setPrefix("abc", "test");
        ont.save("../../static/data/owl/save-prefix.test.owl");
    }
}
