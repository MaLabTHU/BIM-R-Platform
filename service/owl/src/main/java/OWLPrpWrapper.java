import org.semanticweb.owlapi.model.OWLDataProperty;
import org.semanticweb.owlapi.model.OWLObjectProperty;
import org.semanticweb.owlapi.model.OWLProperty;

public class OWLPrpWrapper extends OWLEntWrapper {
    boolean isObjectProperty;

    OWLPrpWrapper(OWLProperty prp, OWLOntWrapper ont) {
        super(prp, ont);
        this.isObjectProperty = prp instanceof OWLObjectProperty;
    }

    @Override
    public Object toJsonable() {
        return new OWLPrpJsonable(this, isObjectProperty);
    }
}

class OWLObjPrpWrapper extends OWLPrpWrapper {
    OWLObjectProperty objPrp;

    OWLObjPrpWrapper(OWLObjectProperty objPrp, OWLOntWrapper ont) {
        super(objPrp, ont);
        this.objPrp = objPrp;
    }
}

class OWLDatPrpWrapper extends OWLPrpWrapper {
    OWLDataProperty datPrp;

    OWLDatPrpWrapper(OWLDataProperty datPrp, OWLOntWrapper ont) {
        super(datPrp, ont);
        this.datPrp = datPrp;
    }
}

class OWLPrpJsonable extends OWLObjJsonable {
    OWLPrpJsonable(OWLPrpWrapper wrapper, boolean isObjectProperty) {
        super(wrapper);
        type = isObjectProperty ? "objectProperty" : "dataProperty";
    }
}
