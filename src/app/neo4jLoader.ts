import { searchGeneIds } from "./search";
import * as d3 from 'D3';
import { readdirSync } from "fs";

var neo4j = require('neo4j-driver').v1;
var driver = neo4j.driver("bolt://localhost:11001", neo4j.auth.basic("neo4j", "123"));
var _ = require('lodash');

export async function addNode(promOb:object, type:string){

  console.log('add node firing', promOb, type)
    let queryOb = await Promise.resolve(promOb);
    let value = queryOb.name? queryOb.name : queryOb.properties.name;
    let node = await checkForNode(value, type);

    if(node.length > 0){
       console.log(value +' already exists');
    }else{
        let name = queryOb.value ? queryOb.value : queryOb.properties.name;
        let prop = {};
        let properties = queryOb.properties ? queryOb.properties : queryOb;
        let idKeys = d3.keys(queryOb.properties.Ids);
        let propKeys = d3.keys(properties).filter(f=> f != 'Ids');

        propKeys.forEach(el => {
            prop[el] = typeof properties[el] === 'string' ? properties[el] : JSON.stringify(properties[el]);
        });

        idKeys.forEach((id, i)=> {
            prop[id] = properties.Ids[id];
        })

        prop.name = name;
        let command = `CREATE (n:`+type+` $props)`;
        var session = driver.session();
        session
            .run(command, {props: prop})
            .then(function(result) {
                session.close();
                console.log("adding to graph");
            })
            .catch(function(error:any) {
                console.log(error);
            });
        }

     //   driver.close();
}


export async function addNodeArray(phenoObs:Array<object>){

    let names: Array<string> = phenoObs.map(v=> v.name);
  
    let type = phenoObs[0].type;
    let originalNames : Array<string> = await checkForNodeArray(names, type);
    let newNames = names.filter(n=> originalNames.indexOf(n) == -1);
    if(newNames.length > 0){
     
        let newObs = phenoObs.filter(ob=> newNames.indexOf(ob.name) > -1)
        let newnew = newObs.map(o=> {
            let keys = d3.keys(o);
            keys.forEach(k=> {
             
                if(typeof o[k] != 'string'){
                    o[k] = JSON.stringify(o[k])
                }else if(typeof o[k] == 'object'){
                    o[k] = JSON.stringify(Promise.resolve(o[k]))
                }else{console.log('whaaa')}
            })
            return o;
        });
        
        let command = 'UNWIND $props AS map CREATE (n:'+type+') SET n = map'
   
        var session = driver.session();
        session
            .run(command, {props: newnew})
            .then(function(result) {
                session.close();

            console.log("adding to graph");
            })
            .catch(function(error:any) {
                console.log(error);
            });
        }else{ console.log('ALREADY THERE')}
}

export async function structureRelation(node1: Array<object>, node2: Array<object>, relation:string){
   
    let node1Label = node1[0].type ? node1[0].type : node1[0].label;
    let node2Label = node2[0].type ? node2[0].type : node2[0].label;

    let phenoNames = node1.map(p=> p.name.toString());
    let relationArr = []
    let relatedPhenotypes = node2.map(p=>{
        
            let varProps = typeof p.properties == 'string'? JSON.parse(p.properties) : p.properties;
            varProps = varProps.properties? varProps.properties : varProps;
            varProps = typeof varProps == 'string'? JSON.parse(varProps) : varProps;
       
            let phenoFromVars = varProps.Phenotypes.map(p=> {
                let omimCheck = p.map(dis=> dis.disease_ids.filter(d=> d.organization == "OMIM"));
                return omimCheck;
            });

            let filtered = phenoFromVars.flatMap(fil=>{ 
                return fil.filter(test=> test.length > 0);
            }).flatMap(d=> d);

        
            filtered.forEach(fil=> {
                let index = phenoNames.indexOf(fil.accession)
       
                if(index > -1){ relationArr.push({'pheno': fil.accession, 'variant': p.name}) }
<<<<<<< HEAD
            })       
=======
            })
  
>>>>>>> test
});

    relationArr.forEach(rel => {
    addRelation(rel.pheno, 'Phenotype', rel.variant, 'Variant', relation);
    });
}

export async function addToGraph(query:string, type:string) {
    let command = 'CREATE (n:' + type + ' {name:"' + query + '"})';
 
    var session = driver.session();
    session
        .run(command)
        .then(function(result) {
            session.close();
            console.log("adding to graph");
        })
        .catch(function(error:any) {
            console.log(error);
        });
}

export async function checkForNode(name:string, type:string) {
    var session = driver.session();
    let command = 'MATCH (n:'+type+' { symbol: "' + name + '" }) RETURN n';

    return session
        .run(command)
        .then(function(result:any) {
            session.close();
     
            return result.records;
        })
        .catch(function(error:any) {
            console.log(error);
        });
}

export async function checkForNodeArray(names:Array<string>, type:string) {
    let command = 'UNWIND $vars as val MATCH (n:'+type+' {name: val}) RETURN n.name'
    var session = driver.session();
    
    return session
        .run(command, {vars: names})
        .then(function(result) {
            session.close();
            let resultArray = result.records.map(res => {
                return res.get('n.name');
            });
            return resultArray;
        })
        .catch(function(error:any) {
            console.log(error);
        });
}

export function setNodeProperty(type: string, name:string, prop:string, propValue:string) {
    //
    let command = 'MATCH (n:'+type+' {name: "' + name + '" }) UNWIND $props AS map SET n.' + prop + ' = map';
     
    var session = driver.session();

    session
        .run(command, {props: propValue})
        .then(function(result:any) {
            session.close();
        })
        .catch(function(error:any) {
            console.log(error);
        });

<<<<<<< HEAD
      
}

async function getGraphRelations(type1:string, type2:string, relation: string){
    let command = 'MATCH (a)-[r:'+relation+']->(b) RETURN collect(a) AS '+type1+', collect(b) AS '+type2+', collect(r) AS rel';
    
    var session = driver.session();

    return session
        .run(command)
        .then(function(result) {
         
            return result.records.map(r=> {
            
                let node1 = new Array(r.get(type1)).map(g=> {
                    let gen = new Object();
                    gen.index = g.identity.low;
                    gen.name = g.properties.name;
                    gen.properties = g.properties;
                    gen.label = g.labels[0];
                    return  gen;
                });

              
                let node2 = r.get(type2).map(v=> {
                    let vari = new Object();
                    vari.index = v.identity.low;
                    vari.name = v.properties.name;
                    vari.properties = v.properties;
                    vari.label = v.labels[0];
                    return vari;
                });

                let relations = r.get('rel').map(m=> {
                    let meh = new Object();
                    meh.start = m.start.low;
                    meh.end = m.end.low;
                    meh.index = m.identity.low;
                    meh.type = m.type;
                    return meh;
                });

                let nodes = node1.concat(node2);

                let indexArray = nodes.map(n=> n.index);
                let rels = relations.map(r=> {
                    var source = indexArray.indexOf(r.start);
                    var target = indexArray.indexOf(r.end);
                    return {'source': nodes[source].name, 'target': nodes[target].name}
                })
            console.log('nodesss',nodes);
            session.close();
            return {'n':nodes, 'r':rels };
    })   
    
})
        .catch(function(error) {
            console.log(error);
        });

=======
>>>>>>> test
}

export async function getGraph() {

   let command = 'OPTIONAL MATCH (v)-[m:Mutation]->(g) \
    OPTIONAL MATCH (p)-[r:Pheno]->(v) \
<<<<<<< HEAD
    RETURN DISTINCT collect(v) AS variant, collect(p) AS phenotype, \
    g AS gene, collect(r) AS phenoRel, collect(m) AS mutationRel'
       
  //  let command = 'MATCH (n) \
  //  OPTIONAL MATCH (n)-[r]-()\
  //  RETURN collect(n) AS nodes, collect(r) AS relation'
 
 // let rel1 = await getGraphRelations('Variant', 'Gene', 'Mutation');
 // console.log('relation1!',rel1);
=======
    OPTIONAL MATCH (n)-[i:Interacts]->(g)\
    RETURN DISTINCT collect(distinct v) AS variant, collect(distinct p) AS phenotype, collect(distinct n) as inters,\
    g AS gene, collect(distinct r) AS phenoRel, collect(distinct m) AS mutationRel, collect(distinct i) as interRel'

    console.log('loading graph?');
>>>>>>> test

    var session = driver.session();

    return session
        .run(command)
        .then(function(result) {
        
            return result.records.map(r=> {

                console.log('results updated', r);
            
                let gene = new Array(r.get('gene')).map(g=> {
               
                    let gen = new Object();
                    gen.index = g.identity.low;
                    gen.name = g.properties.name;
                    gen.properties = g.properties;
                    gen.label = g.labels[0];
                    return  gen;
                });

             
                let vars = r.get('variant').map(v=> {
                    let vari = new Object();
                    vari.index = v.identity.low;
                    vari.name = v.properties.name;
                    vari.properties = v.properties;
                    vari.label = v.labels[0];
                    return vari;
                });

             

                let pheno = r.get('phenotype').map(p=> {
                    let ph = new Object();
                    ph.index = p.identity.low;
                    ph.name = p.properties.name;
                    ph.properties = p.properties;
                    ph.label = p.labels[0];
                    return ph;
                });
<<<<<<< HEAD
             
=======
                console.log('pheno', pheno);

                let interactNodes = r.get('inters').map(p=>{
                    let ph = new Object();
                    ph.index = p.identity.low;
                    ph.name = p.properties.name;
                    ph.properties = p.properties;
                    ph.label = p.labels[0];
                    return ph;
                });

>>>>>>> test
                let phenopaths = r.get('phenoRel').map(p=>{
                    let ph = new Object();
                    ph.start = p.start.low;
                    ph.end = p.end.low;
                    ph.index = p.identity.low;
                    ph.type = p.type;
                    return ph;
                });

                let mutationpaths = r.get('mutationRel').map(m=> {
                    let meh = new Object();
                    meh.start = m.start.low;
                    meh.end = m.end.low;
                    meh.index = m.identity.low;
                    meh.type = m.type;
                    return meh;
                });

                
                let interpaths = r.get('interRel').map(p=>{
                    let ph = new Object();
                    ph.start = p.start.low;
                    ph.end = p.end.low;
                    ph.index = p.identity.low;
                    ph.type = p.type;
                    return ph;
                });
        
                let nodes = gene.concat(vars, pheno, interactNodes);
                let relations = phenopaths.concat(mutationpaths, interpaths);
                let indexArray = nodes.map(n=> n.index);
                let rels = relations.map(r=> {
                    var source = indexArray.indexOf(r.start);
                    var target = indexArray.indexOf(r.end);
                    return {'source': nodes[source].name, 'target': nodes[target].name}
                })

                let varNames = [];
                let uniVars = [];

                nodes.forEach(v=>{
                    if(varNames.indexOf(v.name) == -1){
                        varNames.push(v.name);
                        uniVars.push(v);
                    }
                });

                let nameArr = uniVars.map(d=> d.name)
          
                let relInd = rels.map(v=>{
                    return {'source': nameArr.indexOf(v.source), 'target': nameArr.indexOf(v.target) }
                });

                session.close();
                return {nodes: uniVars, links: relInd };  
        });
    })   
        .catch(function(error) {
            console.log(error);
        });

        

}

export async function addRelation(sourceName:string, sourceType:string, targetName:string, targetType:string, linkType:string) {
    
    let command = 'MATCH (a:'+sourceType+'),(b:'+targetType+') \
    WHERE a.name = "' + sourceName + '" AND b.name = "' + targetName + '" MERGE (a)-[r:'+linkType+']->(b) ON CREATE SET r.alreadyExisted=false ON MATCH SET r.alreadyExisted=true RETURN r.alreadyExisted';

    var session = driver.session();
    return session
        .run(command)
        .then(function(result) {
            session.close();
            return result;
        })
        .catch(function(error) {
            console.log(error);
        });
}