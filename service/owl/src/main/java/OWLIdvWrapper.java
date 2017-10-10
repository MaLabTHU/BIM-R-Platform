import org.semanticweb.owlapi.model.*;
import org.semanticweb.owlapi.search.EntitySearcher;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class OWLIdvWrapper extends OWLEntWrapper {
    OWLNamedIndividual idv;

    OWLIdvWrapper(OWLNamedIndividual idv, OWLOntWrapper ont) {
        super(idv, ont);
        this.idv = idv;
    }

    Stream<OWLClsWrapper> getTypes() {
        return _getClses(EntitySearcher.getTypes(idv, wrapper.ont));
    }

    OWLIdvWrapper addType(OWLClsWrapper cls) {
        wrapper._linkClass(cls, this);
        return this;
    }

    OWLIdvWrapper addObjectProperty(OWLObjPrpWrapper p, OWLIdvWrapper o) {
        wrapper._linkObjectProperty(this, p, o);
        return this;
    }

    OWLIdvWrapper addDataProperty(OWLDatPrpWrapper p, OWLLiteral o) {
        wrapper._linkDataProperty(this, p, o);
        return this;
    }

    @Override
    public Object toJsonable() {
        return new OWLIdvJsonable(this);
    }
}

class OWLIdvObjPrpAxmJsonable {
    String p;
    String o;

    OWLIdvObjPrpAxmJsonable(String p, String o) {
        this.p = p;
        this.o = o;
    }
}

class OWLIdvDatPrpAxmJsonable {
    String p;
    String d;
    String t;

    OWLIdvDatPrpAxmJsonable(String p, String d, String t) {
        this.p = p;
        this.d = d;
        this.t = t;
    }

    OWLIdvDatPrpAxmJsonable(String p, OWLLiteral literal) {
        this(p, literal.getLiteral(), typeToStr(literal.getDatatype()));
    }

    static String typeToStr(OWLDatatype type) {
        if (type.isInteger()) {
            return "int";
        }
        if (type.isFloat()) {
            return "float";
        }
        if (type.isDouble()) {
            return "double";
        }
        if (type.isBoolean()) {
            return "bool";
        }
//        if (type.isString()) {
//            return "str";
//        }
        return null;
    }

    static OWLLiteral strToLiteral(String d, String t, OWLOntWrapper ont) {
        switch (t != null ? t : "str") {
            case "int":
                return ont.factory.getOWLLiteral(Integer.valueOf(d));
            case "float":
                return ont.factory.getOWLLiteral(Float.valueOf(d));
            case "double":
                return ont.factory.getOWLLiteral(Double.valueOf(d));
            case "bool":
                return ont.factory.getOWLLiteral(Boolean.valueOf(d));
            case "str":
            default:
                return ont.factory.getOWLLiteral(d);
        }
    }
}

class OWLIdvJsonable extends OWLObjJsonable {
    List<String> types;
    List<OWLIdvObjPrpAxmJsonable> objPrps;
    List<OWLIdvDatPrpAxmJsonable> datPrps;

    OWLIdvJsonable(OWLIdvWrapper idv) {
        super(idv);
        OWLObjectProperty top = idv.wrapper._getObjectProperty("owl:topObjectProperty");
        type = "individual";
        types = getShortIris(idv.getTypes());
        objPrps = idv.wrapper.ont.objectPropertyAssertionAxioms(idv.idv)
                .filter(axm -> {
                    OWLPropertyExpression p = axm.getProperty();
                    return p instanceof OWLProperty && !p.equals(top) && axm.getObject() instanceof OWLNamedIndividual;
                })
                .map(axm -> new OWLIdvObjPrpAxmJsonable(
                        new OWLPrpWrapper(axm.getProperty().asOWLObjectProperty(), idv.wrapper).getShortIRI(),
                        new OWLIdvWrapper(axm.getObject().asOWLNamedIndividual(), idv.wrapper).getShortIRI())
                ).collect(Collectors.toList());
        objPrps = objPrps.isEmpty() ? null : objPrps;
        datPrps = idv.wrapper.ont.dataPropertyAssertionAxioms(idv.idv)
                .filter(axm -> axm.getProperty() instanceof OWLProperty)
                .map(axm -> new OWLIdvDatPrpAxmJsonable(
                        new OWLPrpWrapper(axm.getProperty().asOWLDataProperty(), idv.wrapper).getShortIRI(),
                        axm.getObject()
                )).collect(Collectors.toList());
        datPrps = datPrps.isEmpty() ? null : datPrps;
    }
}