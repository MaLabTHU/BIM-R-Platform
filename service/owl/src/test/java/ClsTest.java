import com.google.gson.Gson;
import com.google.gson.JsonArray;
import org.junit.Test;
import org.semanticweb.owlapi.model.OWLEquivalentClassesAxiom;
import org.semanticweb.owlapi.model.OWLOntologyCreationException;
import org.semanticweb.owlapi.model.OWLOntologyStorageException;
import org.semanticweb.owlapi.model.RemoveAxiom;

import java.io.FileNotFoundException;
import java.util.Arrays;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

public class ClsTest {
    @Test
    public void expToJson() {
        OWLClsExpJsonable definedClsA = new OWLClsExpJsonable();
        OWLClsExpJsonable eCls = new OWLClsExpJsonable();
        eCls.iri = "test";
        definedClsA.eqClses = Collections.singletonList(eCls);
        OWLClsExpJsonable uCls = new OWLClsExpJsonable();
        OWLClsExpJsonable uRst = new OWLClsExpJsonable();
        eCls.exps = Arrays.asList(uCls, uRst);
        eCls.isOr = true;
        OWLClsExpJsonable iRst1 = new OWLClsExpJsonable();
        OWLClsExpJsonable iRst2 = new OWLClsExpJsonable();
        uCls.exps = Arrays.asList(iRst1, iRst2);
        iRst1.p = "hasB";
        iRst1.o = new OWLClsExpJsonable("owl:Thing");
        iRst2.p = "hasC";
        iRst2.o = new OWLClsExpJsonable("owl:Thing");
        uRst.p = "hasA";
        uRst.p = "DefinedClassA";
        String jsonA = new Gson().toJson(definedClsA);
        OWLClsExpJsonable definedClsB = new Gson().fromJson(jsonA, OWLClsExpJsonable.class);
        String jsonB = new Gson().toJson(definedClsB);
        System.out.println(jsonA);
        System.out.println(jsonB);
    }

    @Test
    public void expsToJson() throws OWLOntologyCreationException {
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.load("../../static/data/owl/pizza.owl");
        Set<OWLClsExpJsonable> oldExps = ont.getClasses().map(ont::getClassExpression).collect(Collectors.toSet());
        String json = new Gson().toJson(oldExps);
        System.out.println(json);
        JsonArray newExps = new Gson().fromJson(json, JsonArray.class);
        System.out.println(newExps);
    }

    @Test
    public void addTwoLabels() throws OWLOntologyCreationException, FileNotFoundException, OWLOntologyStorageException {
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.create();
        OWLClsWrapper cls = ont.addClass("test");
        ont.addClass("test");
        cls.addLabel("abc", "en");
        cls.addLabel("abc", "en");
        cls.addIndividual("a");
        cls.addIndividual("a");
        cls.addIndividual("a");
        OWLClsWrapper eqCls = ont.addClass("eq");
        eqCls.addEquivalentClass(cls);
        eqCls.addEquivalentClass(cls);
        ont.ont.axioms().filter(ax -> ax.containsEntityInSignature(cls.cls)).forEach(System.out::println);
        cls.getLabels().forEach((lang, label) -> System.out.println(lang + ": " + label));
        ont.save("../../static/data/owl/duplicate_label.test.owl");
    }

    @Test
    public void addExp() throws OWLOntologyCreationException, FileNotFoundException, OWLOntologyStorageException {
        OWLClsExpJsonable definedClsA = new OWLClsExpJsonable();
        definedClsA.iri = "test";
        OWLClsExpJsonable eCls = new OWLClsExpJsonable();
        definedClsA.eqClses = Collections.singletonList(eCls);
        OWLClsExpJsonable eClsA = new OWLClsExpJsonable();
        eClsA.iri = "eA";
        OWLClsExpJsonable eClsB = new OWLClsExpJsonable();
        eClsB.iri = "eB";
        OWLClsExpJsonable uCls = new OWLClsExpJsonable();
        OWLClsExpJsonable uRst = new OWLClsExpJsonable();
        eCls.exps = Arrays.asList(uCls, uRst);
        eCls.isOr = true;
        OWLClsExpJsonable iRst1 = new OWLClsExpJsonable();
        OWLClsExpJsonable iRst2 = new OWLClsExpJsonable();
        uCls.exps = Arrays.asList(iRst1, iRst2);
        iRst1.p = "hasB";
        iRst1.o = new OWLClsExpJsonable("owl:Thing");
        iRst2.p = "hasC";
        iRst2.o = new OWLClsExpJsonable("owl:Thing");
        uRst.p = "hasA";
        uRst.o = new OWLClsExpJsonable("DefinedClassA");
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.create();
        OWLClsWrapper cls = ont.addClass(definedClsA);
        ont.addClass(definedClsA);
        ont.save("../../static/data/owl/exp.test.owl");
        ont.ont.axioms().filter(ax -> ax.containsEntityInSignature(cls.cls)).forEach(ax -> {
            OWLEquivalentClassesAxiom a = (OWLEquivalentClassesAxiom) ax;
            a.classExpressions().forEach(System.out::println);
            System.out.println("");
        });
        OWLClsExpJsonable exp = ont.getClassExpression(ont.getClass("test"));
        String expJson = new Gson().toJson(exp);
        System.out.println(expJson);
        ont.manager.applyChanges(ont.ont.axioms()
                .filter(ax -> ax.containsEntityInSignature(cls.cls))
                .map(ax -> new RemoveAxiom(ont.ont, ax))
                .collect(Collectors.toList()));

        ont.save("../../static/data/owl/exp.remove.test.owl");
    }

    @Test
    public void duplicatedAxioms() throws OWLOntologyCreationException, FileNotFoundException, OWLOntologyStorageException {
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.create();
        OWLClsWrapper c1 = ont.addClass("Class1");
        ont.addClass("Class1");
        OWLIdvWrapper i1 = ont.addIndividual("idv1");
        c1.addIndividual(i1);
        c1.addIndividual(i1);
//        wrapper.wrapper.axioms().forEach(System.out::println);
//        System.out.println("--normal axioms--");
        OWLClsExpJsonable c2 = new OWLClsExpJsonable("Class2");
        OWLClsExpJsonable c3 = new OWLClsExpJsonable("Class3");
        c2.eqClses = Collections.singletonList(c3);
        ont.addClass(c2);
        ont.addClass(c2);
        ont.addClass(c2);
        ont.addClass(c2);
        ont.ont.axioms().forEach(System.out::println);
        ont.save("../../static/data/owl/duplicated_axioms.test.owl");
    }

    @Test
    public void addClsWithRestriction() throws OWLOntologyCreationException, OWLOntologyStorageException {
        OWLOntWrapper ont = new OWLOntWrapper();
        ont.create();
        String json = "{" +
                "iri:'test'," +
                "rsts:[" +
                "{" +
                "p:'hasRestrict'," + "o:{iri:'hello'}" +
                "}" +
                "]" +
                "}";
        OWLClsJsonable cls = new Gson().fromJson(json, OWLClsJsonable.class);
        ont.addClass(cls);
        ont.save("../../static/data/owl/restrictions.test.owl");
    }
}
