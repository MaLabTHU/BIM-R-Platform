import org.semanticweb.owlapi.model.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

abstract class OWLObjWrapper implements Wrapper {
    OWLOntWrapper wrapper;
    Map<String, String> labels;

    OWLObjWrapper(OWLOntWrapper wrapper) {
        this.wrapper = wrapper;
    }

    abstract IRI getIRI();

    void addLabel(String label, String lang) {
        wrapper._addLabel(this, label, lang);
    }

    void addLabels(Map<String, String> labels) {
        labels.forEach((lang, label) -> addLabel(label, lang));
    }

    void refreshLabels() {
        labels = wrapper.ont.annotationAssertionAxioms(getIRI())
                .filter(axiom -> axiom.getProperty().isLabel() && axiom.getValue() instanceof OWLLiteral)
                .map(axiom -> (OWLLiteral) axiom.getValue())
                .collect(Collectors.toMap(OWLLiteral::getLang, OWLLiteral::getLiteral));
    }

    Stream<OWLClsWrapper> _getClses(Stream<OWLClassExpression> stream) {
        return stream.filter(cls -> cls instanceof OWLClass).map(cls -> new OWLClsWrapper(cls.asOWLClass(), wrapper));
    }

    Stream<OWLIdvWrapper> _getIdvs(Stream<OWLIndividual> stream) {
        return stream.filter(idv -> idv instanceof OWLNamedIndividual).map(idv -> new OWLIdvWrapper(idv.asOWLNamedIndividual(), wrapper));
    }

    Stream<OWLClsExpJsonable> _getClsExps(Stream<OWLClassExpression> stream) {
        return stream.map(cls -> wrapper._getClassExpression(cls));
    }

    String getShortIRI() {
        IRI iri = getIRI();
        if (iri != null) {
            String shortIri = wrapper.prefixes.getPrefixIRI(iri);
            if (shortIri != null) {
                return shortIri.startsWith(":") ? shortIri.substring(1) : shortIri;
            }
            return iri.toString();
        }
        return null;
    }

    Map<String, String> getLabels() {
        if (labels == null) {
            refreshLabels();
        }
        return labels.isEmpty() ? null : labels;
    }
}

abstract class OWLEntWrapper extends OWLObjWrapper {
    OWLEntity ent;

    OWLEntWrapper(OWLEntity ent, OWLOntWrapper ont) {
        super(ont);
        this.ent = ent;
    }

    @Override
    IRI getIRI() {
        return ent.getIRI();
    }
}

class OWLObjJsonable {
    String iri;
    String type;
    Map<String, String> labels;

    OWLObjJsonable(OWLObjWrapper obj) {
        iri = obj.getShortIRI();
        labels = iri != null ? obj.getLabels() : null;
    }

    List<String> getShortIris(Stream<? extends OWLObjWrapper> stream) {
        List<String> iris = stream.map(OWLObjWrapper::getShortIRI).distinct().collect(Collectors.toList());
        iris.remove("owl:Thing");
        return iris.isEmpty() ? null : iris;
    }
}