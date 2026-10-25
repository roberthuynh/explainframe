import test from 'node:test';import assert from 'node:assert/strict';
import {visualDescription,missingVisualDescription} from '../../src/player/description.mjs';
test('text alternatives preserve authored values, units and relationships',()=>{
 assert.equal(visualDescription({visual:{type:'stacked-bars',prefix:'$',items:[{label:'B',segments:[{label:'Costs',value:5},{label:'Contribution',value:3}]}]}}),'B: total $8; Costs: $5, Contribution: $3');
 assert.equal(visualDescription({visual:{type:'dots',count:3,edges:[[0,2]],text:'One connection.'}}),'3 labeled dots. Connections: 1 to 3. One connection.');
 assert.equal(visualDescription({visual:{type:'bars',items:[{label:'Users',value:12}]}}),'Users: 12');
 assert.equal(visualDescription({visual:{type:'image'},visualDescription:'  A meaningful diagram.  '}),'A meaningful diagram.');
 for(const type of ['custom','image']){assert.equal(missingVisualDescription({visual:{type}}),true);assert.equal(missingVisualDescription({visual:{type},visualDescription:'   '}),true);assert.equal(missingVisualDescription({visual:{type},visualMeaningInNarration:true}),false);}
});
