import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLClassExpression;
import org.semanticweb.owlapi.search.EntitySearcher;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class OWLClsWrapper extends OWLEntWrapper {
    OWLClass cls;

    OWLClsWrapper(OWLClass cls, OWLOntWrapper ont) {
        super(cls, ont);
        this.cls = cls;
    }

    OWLClsWrapper addSuperClass(OWLClsWrapper superCls) {
        wrapper._linkSubClassOf(this, superCls);
        return this;
    }

    OWLClsWrapper addSubClass(OWLClsWrapper subCls) {
        wrapper._linkSubClassOf(subCls, this);
        return this;
    }

    OWLIdvWrapper addIndividual(String iri) {
        OWLIdvWrapper idv = wrapper.addIndividual(iri);
        return addIndividual(idv);
    }

    OWLIdvWrapper addIndividual(OWLIdvWrapper idv) {
        wrapper._linkClass(this, idv);
        return idv;
    }

    OWLClsWrapper addEquivalentClass(OWLClsWrapper cls) {
        return addEquivalentClass(cls.cls);
    }

    OWLClsWrapper addEquivalentClass(OWLClassExpression exp) {
        wrapper._linkEquivalent(cls, exp);
        return this;
    }

    Stream<OWLClsWrapper> getSuperClasses() {
        return _getClses(EntitySearcher.getSuperClasses(cls, wrapper.ont));
    }

    Stream<OWLClsWrapper> getSubClasses() {
        return _getClses(EntitySearcher.getSubClasses(cls, wrapper.ont));
    }

    Stream<OWLClsExpJsonable> getRestrictions() {
        return _getClsExps(EntitySearcher.getSubClasses(cls, wrapper.ont));
    }

    Stream<OWLClsWrapper> getEquivalentClasses() {
        return _getClses(EntitySearcher.getEquivalentClasses(cls, wrapper.ont));
    }

    Stream<OWLIdvWrapper> getInstances() {
        return _getIdvs(EntitySearcher.getIndividuals(cls, wrapper.ont));
    }

    @Override
    public Object toJsonable() {
        return new OWLClsJsonable(this);
    }
}

class OWLClsJsonable extends OWLObjJsonable {
    List<String> supClses;
    List<String> eqClses;
    List<String> subClses;
    List<String> idvs;
    List<OWLClsExpJsonable> rsts;

    OWLClsJsonable(OWLClsWrapper cls) {
        super(cls);
        type = "class";
        supClses = getShortIris(cls.getSuperClasses());
        eqClses = getShortIris(cls.getEquivalentClasses());
        subClses = getShortIris(cls.getSubClasses());
        idvs = getShortIris(cls.getInstances());
    }

    OWLClsJsonable(OWLClsWrapper cls, boolean restrictions) {
        this(cls);
        if (restrictions) {
            rsts = cls.getRestrictions().collect(Collectors.toList());
        }
    }
}

class OWLClsExpJsonable {
    // for class
    List<OWLClsExpJsonable> exps;
    Boolean isOr;

    // for named class only
    String iri;
    List<OWLClsExpJsonable> eqClses;

    // for restriction
    String p;
    OWLClsExpJsonable o; // nested object restriction is not supported
    String d;
    String t;

    OWLClsExpJsonable() {
    }

    OWLClsExpJsonable(String iri) {
        this.iri = iri;
    }
}
