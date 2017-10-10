import org.semanticweb.HermiT.ReasonerFactory;
import org.semanticweb.owlapi.apibinding.OWLManager;
import org.semanticweb.owlapi.formats.ManchesterSyntaxDocumentFormat;
import org.semanticweb.owlapi.model.*;
import org.semanticweb.owlapi.model.parameters.OntologyCopy;
import org.semanticweb.owlapi.reasoner.OWLReasoner;
import org.semanticweb.owlapi.search.EntitySearcher;
import org.semanticweb.owlapi.util.DefaultPrefixManager;
import org.semanticweb.owlapi.util.InferredOntologyGenerator;

import java.io.File;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

class OWLOntWrapper extends OWLObjWrapper {
    static int _id = 0;
    //    static PrefixManager _prefixes = new DefaultPrefixManager();
    static Map<String, OWLOntWrapper> map = new ConcurrentHashMap<>();
    String id;
    String path;
    OWLOntology ont;
    PrefixManager prefixes = new DefaultPrefixManager();
    OWLOntologyManager manager = OWLManager.createOWLOntologyManager();
    OWLDataFactory factory = manager.getOWLDataFactory();

    OWLOntWrapper() {
        super(null);
        super.wrapper = this;
    }

    static String generateId() {
        return String.valueOf(_id++);
    }

    OWLReasoner getReasoner() {
        return new ReasonerFactory().createReasoner(ont);
    }

    OWLOntWrapper infer() {
        new InferredOntologyGenerator(getReasoner()).fillOntology(factory, ont);
        return this;
    }

    OWLOntWrapper create() throws OWLOntologyCreationException {
        close();
        ont = manager.createOntology();
//        prefixes.copyPrefixesFrom(_prefixes);
        id = generateId();
        map.put(id, this);
        return this;
    }

    OWLOntWrapper load(String file) throws OWLOntologyCreationException {
        return load(new File(file));
    }

    OWLOntWrapper load(File file) throws OWLOntologyCreationException {
        close();
        ont = manager.loadOntologyFromOntologyDocument(file);
//        prefixes.copyPrefixesFrom(_prefixes);
        OWLDocumentFormat format = ont.getFormat();
        if (format.isPrefixOWLDocumentFormat()) {
            prefixes.copyPrefixesFrom(format.asPrefixOWLDocumentFormat());
        }
        id = generateId();
        map.put(id, this);
        return this;
    }

    OWLOntWrapper close() {
        if (ont != null) {
            manager.removeOntology(ont);
            ont = null;
        }
        if (id != null) {
            map.remove(id);
            id = null;
        }
        path = null;
        return this;
    }

    OWLOntWrapper save(String file) throws OWLOntologyStorageException {
        return save(new File(file));
    }

    OWLOntWrapper save(File file) throws OWLOntologyStorageException {
        // todo format
        ManchesterSyntaxDocumentFormat format = new ManchesterSyntaxDocumentFormat();
        format.copyPrefixesFrom(prefixes);
        manager.saveOntology(ont, format, IRI.create(file.toURI()));
        return this;
    }

    OWLOntWrapper copy() throws OWLOntologyCreationException {
        OWLOntWrapper copied = new OWLOntWrapper();
        copied.ont = copied.manager.copyOntology(ont, OntologyCopy.DEEP);
        copied.id = generateId();
        map.put(copied.id, copied);
        copied.path = path;
        copied.prefixes.copyPrefixesFrom(prefixes);
        return copied;
    }

    OWLOntWrapper _declare(OWLEntity entity) {
        if (!ont.containsEntityInSignature(entity)) {
            manager.applyChange(new AddAxiom(ont, factory.getOWLDeclarationAxiom(entity)));
        }
        return this;
    }

    Map<String, String> getPrefixes() {
        return prefixes.getPrefixName2PrefixMap();
    }

    OWLOntWrapper setPrefix(String name, String iri) {
        prefixes.setPrefix(name, iri.endsWith("#") ? iri : iri + "#");
        return this;
    }

    OWLClsWrapper addClass(String iri) {
        OWLClass cls = _getClass(iri);
        _declare(cls);
        return new OWLClsWrapper(cls, this);
    }

    OWLClsWrapper addClass(OWLClsJsonable cls) {
        OWLClsWrapper wrapper = addClass(cls.iri);
        if (cls.labels != null) {
            wrapper.addLabels(cls.labels);
        }
        if (cls.supClses != null) {
            cls.supClses.forEach(iri -> wrapper.addSuperClass(getClass(iri)));
        }
        if (cls.eqClses != null) {
            cls.eqClses.forEach(iri -> wrapper.addEquivalentClass(getClass(iri)));
        }
        if (cls.subClses != null) {
            cls.subClses.forEach(iri -> wrapper.addSubClass(getClass(iri)));
        }
        if (cls.idvs != null) {
            cls.idvs.forEach(wrapper::addIndividual);
        }
        if (cls.rsts != null) {
            cls.rsts.forEach(rst -> {
                OWLClassExpression expression = _parseClassExpression(rst);
                manager.applyChange(new AddAxiom(ont, factory.getOWLSubClassOfAxiom(wrapper.cls, expression)));
            });
        }
        return wrapper;
    }

    OWLClsWrapper addClass(OWLClsExpJsonable exp) {
        OWLClassExpression expression = _parseClassExpression(exp);
        if (expression instanceof OWLClass) {
            OWLClass cls = (OWLClass) expression;
            _declare(cls);
            return new OWLClsWrapper(cls, this);
        }
        return null;
    }

    OWLClassExpression _parseClassExpression(OWLClsExpJsonable exp) {
        OWLClassExpression expression = null;
        // for class
        if (exp.exps != null) {
            expression = exp.isOr == null || !exp.isOr ?
                    factory.getOWLObjectIntersectionOf(exp.exps.stream().map(this::_parseClassExpression)) :
                    factory.getOWLObjectUnionOf(exp.exps.stream().map(this::_parseClassExpression));

        }
        // for named class only
        if (exp.iri != null) {
            OWLClsWrapper wrapper = getClass(exp.iri);
            if (expression != null) {
                wrapper.addEquivalentClass(expression);
            }
            expression = wrapper.cls;
        }
        // for restriction
        if (expression == null && exp.p != null) {
            expression = exp.o != null ?
                    factory.getOWLObjectSomeValuesFrom(addObjectProperty(exp.p).objPrp, addClass(exp.o.iri).cls) :
                    factory.getOWLDataSomeValuesFrom(addDataProperty(exp.p).datPrp, OWLIdvDatPrpAxmJsonable.strToLiteral(exp.d, exp.t, this).getDatatype());
        }
        // for both class and restriction
        if (expression != null && exp.eqClses != null) {
            for (OWLClsExpJsonable eqCls : exp.eqClses) {
                _linkEquivalent(expression, _parseClassExpression(eqCls));
            }
        }
        return expression;
    }

    OWLClsExpJsonable getClassExpression(String iri) {
        return getClassExpression(getClass(iri));
    }

    OWLClsExpJsonable getClassExpression(OWLClsWrapper cls) {
        OWLClsExpJsonable exp = _getClassExpression(cls.cls);
        exp.eqClses = EntitySearcher.getEquivalentClasses(cls.cls, ont).filter(c -> c != cls.cls).map(this::_getClassExpression).collect(Collectors.toList());
        exp.eqClses = exp.eqClses.isEmpty() ? null : exp.eqClses;
        return exp;
    }

    OWLClsExpJsonable _getClassExpression(OWLClassExpression expression) {
        OWLClsExpJsonable exp = new OWLClsExpJsonable();
        if (expression instanceof OWLNaryBooleanClassExpression) {
            OWLNaryBooleanClassExpression bExp = (OWLNaryBooleanClassExpression) expression;
            exp.isOr = bExp instanceof OWLObjectUnionOf ? true : null;
            exp.exps = bExp.operands().map(this::_getClassExpression).collect(Collectors.toList());
        } else if (expression instanceof OWLClass) { // xxx
            exp.iri = new OWLClsWrapper((OWLClass) expression, this).getShortIRI();
        } else if (expression instanceof OWLObjectSomeValuesFrom) {
            OWLObjectSomeValuesFrom rst = (OWLObjectSomeValuesFrom) expression;
            OWLObjectPropertyExpression pe = rst.getProperty();
            if (pe.isOWLObjectProperty()) {
                exp.p = new OWLPrpWrapper(pe.asOWLObjectProperty(), this).getShortIRI();
                exp.o = _getClassExpression(rst.getFiller());
            }
            // todo
//        } else if (expression instanceof OWLDataSomeValuesFrom) {
//            OWLDataSomeValuesFrom rst = (OWLDataSomeValuesFrom) expression;
//            OWLDataPropertyExpression pe = rst.getProperty();
//            OWLDataRange dr = rst.getFiller();
//            if (pe.isOWLDataProperty()) {
//                exp.p = new OWLPrpWrapper(pe.asOWLDataProperty(), this).getShortIRI();
//                exp.d = OWLIdvDatPrpAxmJsonable.typeToStr(rst.getFiller().asOWLDatatype());
//            }
//            if (dr.isOWLDatatype()) {
//                exp.d = OWLIdvDatPrpAxmJsonable.typeToStr(dr.asOWLDatatype());
//            }
        }
        // todo support nested data restriction
        return exp;
    }

    OWLClsWrapper getClass(String iri) {
        return new OWLClsWrapper(_getClass(iri), this);
    }

    OWLObjPrpWrapper addObjectProperty(String iri) {
        OWLObjectProperty prp = _getObjectProperty(iri);
        _declare(prp);
        return new OWLObjPrpWrapper(prp, this);
    }

    OWLObjPrpWrapper getObjectProperty(String iri) {
        return new OWLObjPrpWrapper(_getObjectProperty(iri), this);
    }

    OWLDatPrpWrapper addDataProperty(String iri) {
        OWLDataProperty prp = _getDataProperty(iri);
        _declare(prp);
        return new OWLDatPrpWrapper(prp, this);
    }

    OWLDatPrpWrapper getDataProperty(String iri) {
        return new OWLDatPrpWrapper(_getDataProperty(iri), this);
    }

    OWLIdvWrapper addIndividual(String iri) {
        OWLNamedIndividual idv = _getIndividual(iri);
        _declare(idv);
        return new OWLIdvWrapper(idv, this);
    }

    OWLIdvWrapper addIndividual(OWLIdvJsonable idv) {
        OWLIdvWrapper wrapper = addIndividual(idv.iri);
        if (idv.labels != null) {
            wrapper.addLabels(idv.labels);
        }
        if (idv.types != null) {
            idv.types.forEach(iri -> wrapper.addType(getClass(iri)));
        }
        if (idv.objPrps != null) {
            idv.objPrps.forEach(objPrp -> wrapper.addObjectProperty(
                    getObjectProperty(objPrp.p),
                    getIndividual(objPrp.o))
            );
        }
        if (idv.datPrps != null) {
            idv.datPrps.forEach(datPrp -> wrapper.addDataProperty(
                    getDataProperty(datPrp.p),
                    OWLIdvDatPrpAxmJsonable.strToLiteral(datPrp.d, datPrp.t, this)
            ));
        }
        return wrapper;
    }

    OWLIdvWrapper getIndividual(String iri) {
        return new OWLIdvWrapper(_getIndividual(iri), this);
    }

    Stream<OWLClsWrapper> getClasses() {
        return ont.classesInSignature().map(cls -> new OWLClsWrapper(cls, this));
    }

    Stream<OWLObjPrpWrapper> getObjectProperties() {
        return ont.objectPropertiesInSignature().map(prp -> new OWLObjPrpWrapper(prp, this));
    }

    Stream<OWLDatPrpWrapper> getDataProperties() {
        return ont.dataPropertiesInSignature().map(prp -> new OWLDatPrpWrapper(prp, this));
    }

    Stream<OWLIdvWrapper> getIndividuals() {
        return ont.individualsInSignature().map(idv -> new OWLIdvWrapper(idv, this));
    }

    OWLClass _getClass(String iri) {
        return factory.getOWLClass(iri, prefixes);
    }

    OWLOntWrapper _linkEquivalent(OWLClassExpression... exps) {
        manager.applyChange(new AddAxiom(ont, factory.getOWLEquivalentClassesAxiom(exps)));
        return this;
    }

    OWLOntWrapper _linkSubClassOf(OWLClsWrapper subCls, OWLClsWrapper superCls) {
        manager.applyChange(new AddAxiom(ont, factory.getOWLSubClassOfAxiom(subCls.cls, superCls.cls)));
        return this;
    }

    OWLNamedIndividual _getIndividual(String iri) {
        return factory.getOWLNamedIndividual(iri, prefixes);
    }

    OWLOntWrapper _linkClass(OWLClsWrapper cls, OWLIdvWrapper idv) {
        manager.applyChange(new AddAxiom(ont, factory.getOWLClassAssertionAxiom(cls.cls, idv.idv)));
        return this;
    }

    OWLObjectProperty _getObjectProperty(String iri) {
        return factory.getOWLObjectProperty(iri, prefixes);
    }

    OWLDataProperty _getDataProperty(String iri) {
        return factory.getOWLDataProperty(iri, prefixes);
    }

    OWLLiteral _addLiteral(String literal, String lang) {
        return factory.getOWLLiteral(literal, lang);
    }

    OWLOntWrapper _addLabel(OWLObjWrapper wrapper, String label, String lang) {
        OWLAxiom axiom = factory.getOWLAnnotationAssertionAxiom(factory.getRDFSLabel(), wrapper.getIRI(), _addLiteral(label, lang));
        manager.applyChange(new AddAxiom(ont, axiom));
        return this;
    }

    OWLOntWrapper _linkObjectProperty(OWLIdvWrapper s, OWLObjPrpWrapper p, OWLIdvWrapper o) {
        OWLAxiom axiom = factory.getOWLObjectPropertyAssertionAxiom(p.objPrp, s.idv, o.idv);
        manager.applyChange(new AddAxiom(ont, axiom));
        return this;
    }

    OWLOntWrapper _linkDataProperty(OWLIdvWrapper s, OWLDatPrpWrapper p, OWLLiteral o) {
        OWLAxiom axiom = factory.getOWLDataPropertyAssertionAxiom(p.datPrp, s.idv, o);
        manager.applyChange(new AddAxiom(ont, axiom));
        return this;
    }

    @Override
    IRI getIRI() {
        if (ont != null) {
            Optional<IRI> iri = ont.getOntologyID().getOntologyIRI();
            if (iri.isPresent()) {
                return iri.get();
            }
        }
        return null;
    }

    @Override
    String getShortIRI() {
        IRI iri = getIRI();
        return iri != null ? iri.toString() : null;
    }

    @Override
    public Object toJsonable() {
        return new OWLOntJsonable(this, id, path);
    }
}

class OWLOntJsonable extends OWLObjJsonable {
    String id;
    String path;

    OWLOntJsonable(OWLOntWrapper ont, String id, String path) {
        super(ont);
        this.id = id;
        this.path = path;
        type = "ontology";
    }
}
