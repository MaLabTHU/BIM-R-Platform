# BIM-R-Platfrom

## Setup

TODO

## Use Case

- project
    - create project
    - open project
    - edit project
    - close project
    - delete project
- standard, to be deprecated
    - load standard
- owl
    - create
        - definition and parent for standard item
        - quantity takeoff rule for standard item
        - composition of work content for standard item
    - edit
    - delete
- ifc
    - raw quantity takeoff
    - fill information
    - reason to match standard item
- xls
    - edit feature of standard item instance and merge
    - edit cost
    - create report

## Restful API

- v1/projects, node-server.js
    - .
        - post, create project, return conflict if any project with the same name exists
            - projectName
            - modelUuid & modelPath
            - ...
        - get, get projects
            - limit, max number of projects
    - /{projectId}
        - put
        - get, get project
        - delete
    - /{projectId}/analyze
        - post, start analyze
        - get, get progress
    - /{projectId}/products
        - get, get products
- v1/uploads, node-server.js
    - .
        - post, create temporary upload
- v1/ifcs, service/ifc/route/ifc.cs
    - .
        - post, open model, return conflict if opened
            - path
                - [offline mode]: the path must be absolute path containing ":"
                - [online mode]: the path must be relative to "static"
        - get, get models
    - /{modelId}, modelId is number (int) but may be changed to token (string) later
        - get, get model
        - delete, close model
    - /{modelId}/structure
        - get, get structured entities of model
    - /{modelId}/entities/{entityId}, entityId is line number (int) of entity in ifc file
        - get, get entity
    - /{modelId}/entities/{entityId}/attributes
        - get, get direct attributes
    - /{modelId}/entities/{entityId}/attributes/q={attributePath}, attributePath, see below
        - get, get property, return not found if the attributePath is wrong
    - /{modelId}/entities/{entityId}/quantities
        - get, get quantities
- v1/owls, service/owl/main/java/Main.java
    - .
        - post, open or create owl
            - [path], optional
        - get, get owls
    - /{owlId}
        - get, get owl
        - delete, close owl
    - /{owlId}/copy
        - post, copy owl
    - /{owlId}/infer
        - post, infer owl
    - /{owlId}/save
        - post, save owl
    - /{owlId}/classes
        - post, create class
        - get, get classes
    - /{owlId}/classes/{iri}
        - get, get class
    - /{owlId}/expressions/class
        - post, create class by expression
        - get, get class expressions
    - /{owlId}/expressions/class/{iri}
        - get, get class expression
    - /{owlId}/properties/object
        - post, create object property
        - get, get object properties
    - /{owlId}/properties/object/{iri}
        - get, get object property
    - /{owlId}/properties/data
        - post, create data property
        - get, get data properties
    - /{owlId}/properties/data/{iri}
        - get, get data property
    - /{owlId}/individuals
        - post, create individual
        - get, get individuals
    - /{owlId}/individuals/{iri}
        - get, get individual

### attributePath

Example:

attributePath=.Name will get the name of entity

attributePath=.ContainsElements.RelatedElements will get the contained entities of an IfcSpatialElement
