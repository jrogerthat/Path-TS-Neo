import * as d3 from 'D3';
import * as data from './testData.json';
const search = require('./search');


export async function loadFile(){

    let dataFixed = data.default.map(d=> d);

    let dataFiltered = dataFixed.filter(d=> d.overall_max_maf < .01);

    let test = d3.nest().key(function(d) { return d.gene; })
    .entries(dataFiltered);

    return test;
}

export async function renderSidebar(data: Object){

    let sidebar = d3.select('#left-nav');
    let callTable = sidebar.select('.call-table');
    let geneDiv = callTable.selectAll('.gene').data(data);
    geneDiv.exit().remove();
    let geneEnterDiv = geneDiv.enter().append('div').attr('class', d=> d.key).classed('gene', true);
    let geneHeader = geneEnterDiv.append('div').classed('gene-header', true)
    geneHeader.append('text').text(d=> d.key);
    geneDiv = geneEnterDiv.merge(geneDiv);

    let variantBox = geneDiv.append('div').classed('variant-wrapper', true);

    let variants = variantBox.selectAll('.variant').data(d=>d.values);
    variants.exit().remove();
    let varEnter = variants.enter().append('div').classed('variant', true);
    let varText = varEnter.append('h5').text(d=>d.id);
    let varDes = varEnter.append('div').classed('var-descript', true).classed('hidden', true);
    let blurbs = varDes.selectAll('.blurb').data(d=>d3.entries(d)).enter().append('div').classed('blurb', true);
    blurbs.append('text').text(d=> d.key + ": "+ d.value);
    variants = varEnter.merge(variants);
  
    variants.on('click', function(d){
        console.log(d);
        let blurb = d3.select(this).select('.var-descript');
        blurb.classed('hidden')? blurb.classed('hidden', false) : blurb.classed('hidden', true);

    });
}

export async function renderGeneDetail(data: Object){
    console.log(data);
    let sidebar = d3.select('#left-nav');
    let geneDet = sidebar.select('.gene-detail');
}

