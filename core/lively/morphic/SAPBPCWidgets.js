module('lively.morphic.SAPBPCWidgets').requires('lively.morphic.Core', 'lively.morphic.Events', 'lively.WidgetsTraits', 'lively.morphic.Styles', 'users.robertkrahn.MassMorphCreation').toRun(function() {

lively.morphic.Morph.subclass('lively.morphic.SAPCheckBox',
'properties', {
    connections: {
        setChecked: {}
    }
},
'initializing', {
    initialize: function($super, isChecked) {
        $super(this.createShape());
        this.setChecked(isChecked);
    },
    createShape: function() {
        var node = XHTMLNS.create('input');
        node.type = 'checkbox';
        return new lively.morphic.Shapes.External(node);
    },
},
'accessing', {
    setChecked: function(bool) {
        this.checked = bool;
        this.renderContext().shapeNode.checked = bool;
        return bool;
    },
},
'testing', {
    isChecked: function() {
        return this.checked;
    },
},
'event handling', {

    onClick: function(evt) {
        // for halos/menus
         if (evt.isCommandKey() || !evt.isLeftMouseButtonDown()) {
            evt.stop()
            return true;
        }
        // we do it ourselves
        this.setChecked(!this.isChecked())
        // evt.stop();
         return true;
     },

},
'serialization', {
    prepareForNewRenderContext: function ($super, renderCtx) {
        $super(renderCtx);
        // FIXME what about connections to this.isChecked?
        // they would be updated here...
        this.setChecked(this.isChecked());
    },
});

/*
GridBenchmark.run([[10,50]]);
*/
Global.GridBenchmark = {

    benchmarkResults: {},

    run: function(allColsAndRows) {
        allColsAndRows.forEachShowingProgress(
            $morph('ProgressBar'),
            function(colsAndRows) {
                var grid = new lively.morphic.SAPDataGrid(colsAndRows[0], colsAndRows[1]);
                grid.name="BPCGrid";
                grid.openInWorld(pt(1200, 0));
                grid.remove();
            },
            function(colsAndRows) {
                return colsAndRows[0] + '/' + colsAndRows[1];
            })
    },

    add: function(grid, funcName, elapsed) {
        var entryName = grid.numRows + '/' + grid.numCols,
            entry = this.benchmarkResults[entryName] || {};
        entry[funcName] = elapsed;
        this.benchmarkResults[entryName] = entry;
    },

    toString: function() {
        var resultsPerSize = []
        Properties.forEachOwn(this.benchmarkResults, function(name, entry) {
            var lines = [Strings.format('Results for %s:', name)];
            Properties.forEachOwn(entry, function(funcName, secs) {
                lines.push(funcName + ': ' + secs);
            })
            resultsPerSize.push(lines.join('\n\t'));
        })
        return "GridBenchmark:\n\n" + resultsPerSize.join('\n\n');
    },

}


lively.morphic.Morph.subclass('lively.morphic.SAPDataGrid',
'initialization', {
    initialize: function($super, numCols, numRows) {
        $super();
        this.defaultCellHeight = 30;
        this.defaultCellWidth = 120;
        this.borderSize = 50;
        this.colNames = new Array(numCols);
        this.numCols = numCols;
        this.numRows = numRows;
        this.oAnnotation = null;
        this.activeCellContent = '';
        this.initializeData();
        this.initializeMorph();
        this.initializeAnnotation();

    },
    initializeAnnotation: function() {
        this.oAnnotation = new lively.morphic.SAPGridAnnotation();
        this.oAnnotation.addToGrid(this);
        this.oAnnotation.setVisible(false);
        this.oAnnotation.setExtent(lively.pt(200,100));
    },
    initializeData: function() {
        var start = new Date().getTime();
        this.rows = [];
        this.dataModel = [];
        this.addScript(function renderFunction(value) { return value; });
        var elapsed = new Date().getTime() - start;
	elapsed = elapsed/1000;
	console.log('End initializeData=' + elapsed);
    },
    initializeMorph: function() {
        var start = new Date().getTime();
        this.setExtent(pt(
            this.numCols * this.defaultCellWidth  + 2 * this.borderSize,
            this.numRows * this.defaultCellHeight + 2 * this.borderSize));
        this.setFill(Color.rgb(255,255,255));
        if (!this.hideColHeads) {
            this.createColHeads();
        }
        this.createCells();
        this.createLayout();
        var elapsed = new Date().getTime() - start;
	elapsed = elapsed/1000;
	console.log('End initializeMorph=' + elapsed);
        GridBenchmark.add(this, 'initializeMorph', elapsed);
    },
    createCells: function() {
        var headOffset = this.hideColHeads ? 0 : 1;

        var start = new Date().getTime();

        var self = this,
            cells = lively.morphic.Morph.createN(this.numRows * this.numCols, function() {
                return self.createCellOptimized();
            });

        for (var y = 0; y < this.numRows; y++) {
            var row = [];
            for (var x = 0; x < this.numCols; x++) {
                var cell = cells.pop();
                cell.addToGrid(this);
                cell.gridCoords = pt(x, y + headOffset);
                cell.name = '[' + x + ';' + y + ']';
                row.push(cell);
            }
            this.rows.push(row);
        }

        var elapsed = new Date().getTime() - start;
	elapsed = elapsed/1000;
	console.log('End createCells =' + elapsed);
        GridBenchmark.add(this, 'createCells', elapsed);
    },
    createCellOptimized: function() {
        var cell = new lively.morphic.SAPDataGridCell();
        cell.doitContext = this;
        cell.setExtent(pt(this.defaultCellWidth, this.defaultCellHeight));
        return cell;
    },

    createCell: function(x, y, headOffset) {
        var cell = new lively.morphic.SAPDataGridCell();
        cell.doitContext = this;
        cell.setExtent(pt(this.defaultCellWidth, this.defaultCellHeight));
        cell.addToGrid(this);
        cell.gridCoords = pt(x, y + headOffset);
        cell.name = '[' + x + ';' + y + ']';
        return cell;
    },

    createColHeads: function() {
        this.colHeads = [];
        for (var i = 0; i < this.numCols; i++) {
            var head = this.createColHead(i);
            this.colHeads.push(head);
        }
    },
    createColHead: function(index, title) {
        var head = new lively.morphic.SAPDataGridColHead();
        head.setExtent(pt(this.defaultCellWidth, this.defaultCellHeight));
        head.addToGrid(this);
        head.gridCoords = pt(index, 0);
        //head.name = title ? title : '[' + index + ']';
        head.name = title ? title : 'Col' + index;
        head.textString = head.name;
        return head;
    },


    createLayout: function() {
        var start = new Date().getTime();

        var head = this.hideColHeads ? 0 : 1;

        var layouter = new lively.morphic.Layout.GridLayout(
            this, this.numCols, this.numRows + head);
        this.setLayouter(layouter);
        layouter.rows = this.rows;

        this.applyLayout();

        var elapsed = new Date().getTime() - start;
        elapsed = elapsed/1000;
        console.log('End createLayout =' + elapsed);
        GridBenchmark.add(this, 'createLayout', elapsed);
    },

    getLayoutableSubmorphs: function() {
        return this.submorphs;
    },

    writeAnnotation: function(nColumn,nRow,sText) {
        this.get('BPCGrid').at(nColumn,nRow).annotation = sText;
    },

    showAnnotation: function(nColumn,nRow) {
        this.oAnnotation.setVisible(true);
        this.oAnnotation.textString = 'test annotation....';
        //alert(this.rows[nColumn][nRow].getPosition());
        this.oAnnotation.setPosition(this.rows[nColumn][nRow].getPosition());
    },

    hideAnnotation: function() {
        this.oAnnotation.setVisible(false);
    },

    at: function(x, y) {
        return this.rows[y][x];
    },
    atPut: function(x, y, value) {
        //debugger;
        console.log("SAPDataGrid.atPut: x=" + x + ", y=" + y + ", value=" + value );
        this.rows[y][x].textString = value;
    },
    clear: function() {
        for (var y = 0; y < this.numRows; y++) {
            for (var x = 0; x < this.numCols; x++) {
                this.rows[y][x].textString = '';
                this.rows[y][x].evalExpression = undefined;
            }
        }
    },

    onUpPressed: function(evt) {
        this.moveActiveCellBy(pt(0,-1));
        evt.stop();
    },
    onDownPressed: function(evt) {
        this.moveActiveCellBy(pt(0,1));
        evt.stop();
    },
    onLeftPressed: function(evt) {
        //testing cell text is focused or not
    console.log("SAPDataGrid.onLeftPressed");
        if (!this.activeCell) {
         }else{
              alert(this.activeCell.isFocused())
         }
        this.moveActiveCellBy(pt(-1,0));
        evt.stop();
    },
    onRightPressed: function(evt) {
        this.moveActiveCellBy(pt(1,0));
        evt.stop();
    },


    moveActiveCellBy: function(aPoint) {
        if (!this.activeCell) {
            this.at(0,0).activate();
            return;
        }
        var curX = this.getActiveColIndex(),
            curY = this.getActiveRowIndex(),
            newX = curX + aPoint.x,
            newY = curY + aPoint.y;
        if (this.numRows > newY  && this.numCols > newX &&
                newY >= 0 && newX >= 0) {
            this.at(curX + aPoint.x, curY + aPoint.y).activate();
        }
    },
    setData: function(aJsArray) {
        this.clear();
        this.dataModel = [];
        //debugger;
        var that = this;
        aJsArray.forEach(function(ea) {
            if (ea.constructor.name === 'Array') {
                that.dataModel.push(ea);
                return;
            }
            var row = that.createDataRowFromObject(ea);
            that.dataModel.push(row);
        });
        this.updateDisplay();
    },
    getDataObjects: function() {
        var that = this;
        return this.rows.map(function(ea){
            var obj = {};
            for (var i = 0; i < that.numCols; i++) {
                if (that.colNames[i] != undefined) {
                    obj[that.colNames[i]] = ea[i].getContent();
                }
            }
            return obj;
        });
    },
    getDataArrObjects: function() {
        var that = this;
        return this.rows.map(function(ea){
            var arrColumns = [];
 //debugger;
            for (var i = 0; i < that.numCols; i++) {
                //if (that.colNames[i] != undefined) {

		  arrColumns[i]= ea[i].getContent();
                    //obj[that.colNames[i]] = ea[i].getContent();
                //}
            }
            return arrColumns;
        });
    },
    createDataRowFromObject: function(anObject) {
        var row = [],
            names = this.getColNames();

        if (names.select(function(ea) {return ea != undefined}).length == 0) {
            //col names have not been set
            for (var prop in anObject) {
               row.push(anObject[prop]);
            }
        } else {
            var i;
            row = new Array(this.numCols);
            for (i = 0; i < row.length; i++) {row[i] = ''};
            for (i = 0; i < names.length && i < this.numCols; i++) {
                if (names[i] in anObject) {
                    row[i] = anObject[names[i]];
                }
            }
        }
        return row;
    },


    updateDisplay: function() {
        for (var y = 0; y < this.dataModel.length &&
                y < this.numRows; y++) {
            for (var x = 0; x < this.dataModel[y].length &&
                    x < this.numCols; x++) {
                //hak formula
                var sValue = this.renderFunction(this.dataModel[y][x]);
                if (sValue.charAt(0)=="="){
                    //console.log(sValue);
                    this.at(x,y).cellformula = sValue;

                    this.at(x,y).setToolTip('Formula: \n' + sValue);


                    sValue = this.parseFormula(sValue);
                }
                this.at(x,y).textString = sValue;

                //this.at(x,y).textString = this.renderFunction(this.dataModel[y][x]);
            }
        }
        if (this.activeCell) {
            this.activeCellContent = this.activeCell.getContent();
        }
    },
/*can't use this... it will stop everything
  rk: you can use this, just call $super(evt);
    onKeyDown: function($super, evt) {
 //debugger;
    console.log("SAPDataGrid.onKeyDown");
        //evt.stop();
    },
*/
    onKeyPress: function(evt) {
        console.log("SAPDataGrid.onKeyPress");
        if (!this.activeCell) {
            this.at(0,0).activate();
        }
        this.activeCell.onKeyPress(evt);
        evt.stop();
    },
    onBackspacePressed: function(evt) {
        if (!this.activeCell) {
            this.at(0,0).activate();
        }
        this.activeCell.onBackspacePressed(evt);
        return true;
    },
    onEnterPressed: function($super, evt) {
        //Hak March27 2012:  calculate formula
        if (this.activeCell !=null){
            var sValue = this.activeCell.textString;
            console.log("SAPDataGrid.onEnterPressed sValue=" + sValue );
            if (sValue .charAt(0)=="="){
                this.activeCell.textString=this.parseFormula(sValue);
                //'Formula \n test'
                this.activeCell.setToolTip('Formula: \n' + sValue);
                this.activeCell.cellformula = sValue;

            }

        }
        this.onDownPressed(evt);
        return true;
    },
    onTabPressed: function($super, evt) {
        this.onRightPressed(evt);
        return true;
    },



    setActiveCellContent: function(aString) {
        if (!this.activeCell) {
            this.at(0,0).activate();
        }
        this.activeCell.textString = aString;
    },
    evaluateExpression: function(anExpression) {
        try {
            return (eval("(function() { \
                var that = this; \
                var cell = function(x,y) {return that.at(x,y).getContent();}; \
                return " + anExpression + ";})").bind(this)) ();
        } catch (e) {
            return 'ERROR';
        }
    },
    setColWidth: function(colIndex, newWidth) {
        for (var i = 0; i < this.rows.length; i++) {
            var curCell = this.rows[i][colIndex];
            curCell.setExtent(pt(newWidth, curCell.getExtent().y));
        }
    },
    setColNames: function(anArray) {
        this.colNames = anArray;
    //debugger;
        for (var i = 0; i < this.colHeads.length; i++) {
            if (i < anArray.length) {
                this.colHeads[i].textString = anArray[i];
            } else {
                this.colHeads[i].textString = '';
            }
        }
    },
    getColNames: function() {
        return this.colNames;
    },

    setColName: function(colIndex, aString) {
        this.colNames[colIndex] = aString;
    },
    getColHead: function(anInteger) {
        return this.colHeads[anInteger];
    },



    recalculateRowsFirst: function() {
        this.rows.forEach(function (row) {
            row.forEach(function (col) {
                col.updateDisplay();
            });
        });
    },
    getActiveRowObject: function() {
        var activeRow = this.getActiveRow(),
            result = {};
        for (var i = 0; i < this.numCols && i < this.colNames.length; i++) {
            if (this.colNames[i]) {
                var value = activeRow[i].getContent();
                //if (activeRow[i].__secretHiddenValue) {
                //       // FIXME this will be gone once we have refactored the data model
                //    value = activeRow[i].__secretHiddenValue;
                //}
                result[this.colNames[i]] = value;
            }
        }
        return result;
    },
    getActiveRowIndex: function() {
        return this.activeCell.gridCoords.y - (this.hideColHeads ? 0 : 1);
    },
    getActiveColIndex: function() {
        return this.activeCell.gridCoords.x;
    },

    getActiveRow: function() {
        return this.rows[this.getActiveRowIndex()];
    },
    getActiveColName: function() {
        return this.colNames[this.getActiveColIndex()];
    },

    addCol: function(colName) {
        this.colNames.push(undefined);
        var realColName = (colName && typeof(colName) == 'string') ? colName : undefined;
        this.colNames[this.numCols] = realColName;

        if (!this.hideColHeads) {
            var head = this.createColHead(this.numCols, realColName);
            this.colHeads.push(head);
        }
        for (var i = 0; i < this.numRows; i++) {
            var cell = this.createCell(this.numCols, i, this.hideColHeads ? 0 : 1);
            this.rows[i].push(cell);
        }
        this.numCols++;
        this.createLayout();
    },
    addRow: function() {
    //debugger;
        var row = [];
        for (var i = 0; i < this.numCols; i++) {
            var cell = this.createCell(i, this.numRows, this.hideColHeads ? 0 : 1);
            row.push(cell);
        }
        this.rows.push(row);
        this.numRows++;
        this.createLayout();
    },
    removeCol: function() {
        var lastColIndex = this.numCols - 1;
//debugger;
        this.rows.map(function(ea) {
            return ea[lastColIndex];}).
                forEach(function(ea) {
                    delete ea.gridCoords;
                    ea.remove();});
        this.rows.forEach(function(ea) {
            ea.pop();});

        delete this.colHeads[lastColIndex].gridCoords;
        this.colHeads[lastColIndex].remove();
        this.colHeads.pop();
        while (this.colNames.length > lastColIndex) {
            this.colNames.pop();
        }

        this.numCols--;
        this.createLayout();
//Hak March 26 2012 reset height.
        var that=this;
        this.rows.map(function(ea){
            for (var i = 0; i < that.numCols; i++) {
               if (ea[i]!=null){
                    ea[i].setExtent(pt(that.defaultCellWidth, that.defaultCellHeight));
                }
            }
        });
        for (var i = 0; i < this.numCols; i++) {
            if (this.colHeads[i]!=null){
                this.colHeads[i].setExtent(pt(that.defaultCellWidth, that.defaultCellHeight));
            }
        }
//Hak March 26 2012 reset height done.

    },
    removeRow: function() {
        var lastRowIndex = this.numRows - 1;
        this.rows[lastRowIndex].forEach(function(ea) {
            delete ea.gridCoords;
            ea.remove();});
        this.rows.pop();
        this.numRows--;
        this.createLayout();
        var that=this;
        this.rows.map(function(ea){
            for (var i = 0; i < that.numCols; i++) {
               if (ea[i]!=null){
                    ea[i].setExtent(pt(that.defaultCellWidth, that.defaultCellHeight));
                }
            }
        });

    },
/*
Hak March 27 2012.
we need smart parser!! this is for POS only
currently only support
=AVERAGE(E3:E7)
=SUM(E3:E6)
=E3
*/
    parseFormula: function(sValue) {
        var arrValue;
        var nTotal = 0;
        var nAve = 0;
    	var nValue;

        //debugger;
        if (sValue){

            sValue = sValue.toUpperCase();
            if (sValue.substr(0,5)=="=SUM("){
                arrValue= sValue.replace(/=SUM\(/g, "").replace(/\)/g,"").split(":");
                var oStartCell = this.parseformulaCellIndex(arrValue[0]);
                var oEndCell = this.parseformulaCellIndex(arrValue[1]);

	       //summing vertically
                if (oStartCell.columnIndex==oEndCell.columnIndex){
                    for (var nRow = oStartCell.rowIndex; nRow <= oEndCell.rowIndex; nRow ++) {
                        nValue = parseFloat(this.at(oStartCell.columnIndex,nRow).textString);
		        if (isNaN(nValue)) {nValue=0}
		        nTotal  +=nValue;
		    }
	       }else{//summing horizontally
                    for (var nCol = oStartCell.columnIndex; nCol <= oEndCell.columnIndex; nCol ++) {

		      }
                }
                return nTotal;
            }else if(sValue.substr(0,9)=="=AVERAGE("){
                arrValue= sValue.replace(/=AVERAGE\(/g, "").replace(/\)/g,"").split(":");
                var oStartCell = this.parseformulaCellIndex(arrValue[0]);
                var oEndCell = this.parseformulaCellIndex(arrValue[1]);
                var nCount=0;
                if (oStartCell.columnIndex==oEndCell.columnIndex){
                    for (var nRow = oStartCell.rowIndex; nRow <= oEndCell.rowIndex; nRow ++) {
                        nValue = parseFloat(this.at(oStartCell.columnIndex,nRow).textString);
		        if (isNaN(nValue)) {nValue=0}
		        nTotal  +=nValue;
                        nCount +=1;
		    }
                    nAve = parseInt(nTotal/nCount)
	       }else{//summing horizontally
                    for (var nCol = oStartCell.columnIndex; nCol <= oEndCell.columnIndex; nCol ++) {

		      }
                }
                return nAve;
	   }else{  //copying other cell
                var oCell = this.parseformulaCellIndex(sValue.replace(/=/g, ""));

                nValue = parseFloat(this.at(oCell.columnIndex,oCell.rowIndex).textString);
                return nValue;
	   }
        }
    return 255;
    },
    parseformulaCellIndex: function (sValue){
        var oIndex={};
	var sRow = sValue.replace(/[A-Za-z]/g,'');
	var sCol = sValue.replace(sRow,'');
	var instruct = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	var sNewCol = '';

	for (var i=0; i<sCol.length; i++) {
	   var n = instruct.indexOf(sCol[i]);
	   if (n == -1) { sNewCol += sCol[i]; } else { sNewCol += n.toString(); }
	}

	oIndex.columnIndex = sNewCol;
	oIndex.rowIndex = sRow;
	return oIndex;
    },
    morphMenuItems: function ($super) {
        var items = $super();
        items.push(['+ column', this.addCol.bind(this)]);
        items.push(['- column', this.removeCol.bind(this)]);
        items.push(['+ row', this.addRow.bind(this)]);
        items.push(['- row', this.removeRow.bind(this)]);
        return items;
    },

    readCSV: function(seperator, string) {
        var values = string.split(new RegExp(seperator + '|\n'));
        for (var y = 0; y < this.numRows; y++) {
            for (var x = 0; x < this.numCols; x++) {
                this.atPut(x, y, values.shift());
            }
        }
    }
});

lively.morphic.Text.subclass('lively.morphic.SAPDataGridCell',
'settings', {
    style: {
        borderColor: Color.rgb(177,181,186),
        fill: Color.rgb(255, 2550, 255)
    }
},
"initializing", {
    initialize: function($super, bounds, string) {
        $super(bounds, string);
        this.evalExpression = undefined;
    },
},
'default category', {
    addToGrid: function(aGrid) {
        this.grid = aGrid;
        this.grid.addMorph(this);
        this.cellformula = '';
        this.annotation = ''; //maybe we need array object to save more than one
    },
    activate: function() {
        if (this.grid.activeCell) {
            this.grid.activeCell.deactivate();
        }
        this.grid.activeCell = this;
        this.grid.activeCellContent = this.textString;
        this.setBorderColor(Color.red);
        this.setBorderWidth(2);
        this.displayExpression();
    },
    deactivate: function() {
        if (this.grid.activeCell !== this) {
            return;
        }
        this.grid.activeCell = null;
        this.setBorderColor(Color.rgb(177,181,186));
        this.setBorderWidth(1);
        this.updateEvalExpression();
        this.updateDisplay();
        this.grid.recalculateRowsFirst();
    },
    onMouseDown: function (evt) {
        if (evt.isLeftMouseButtonDown()) {
            this.activate();
        }
    },

    put: function(aValue) {
        // TODO: check if aValue starts with =, then evaluate it or not
        debugger;
        this.textString = aValue;
    },
    onKeyPress: function($super, evt) {
        // enter comment here
        $super(evt);
        this.textString += String.fromCharCode(evt.getKeyCode());
    },
    onBackspacePressed: function($super, evt) {
        $super(evt);
        if (!this.textString) {
            evt.stop();
            return true;
        }
        this.textString = this.textString.substring(0, this.textString.length-1);
        evt.stop();
    },

    updateDisplay: function() {
        if (this.evalExpression !== undefined) {
            this.textString = this.grid.evaluateExpression(this.evalExpression);
        }
    },
    updateEvalExpression: function() {
        if (this.textString.substring(0,1) === '=') {
            this.evalExpression = this.textString.substring(1);
            //this.textString = this.grid.evaluateExpression(this.textString.substring(1));
        } else {
            this.evalExpression = undefined;
        }
    },

    displayExpression: function() {
        if (this.evalExpression !== undefined) {
            this.textString = '=' + this.evalExpression;
        }
    },
    getContent: function() {
        var content = this.textString,
            floatValue = parseFloat(content);
        if (isNaN(floatValue)) {
            return content;
        }
        return floatValue;
    },
});

lively.morphic.Text.subclass('lively.morphic.SAPDataGridColHead',
'default category', {
    initialize: function($super, arg1, arg2) {
        $super(arg1, arg2);
        this.setFill(Color.rgb(223, 227, 232));
        this.setBorderColor(Color.rgb(177,181,186));
    },
    addToGrid: function(aGrid) {
        this.grid = aGrid;
        this.grid.addMorph(this);
    },
    updateDisplay: Functions.Null
});

lively.morphic.Text.subclass('lively.morphic.SAPGridAnnotation',
'default category', {
    initialize: function($super, arg1, arg2) {
        $super(arg1, arg2);
        this.setFill(Color.rgb(255, 255, 225));
        this.setBorderColor(Color.rgb(0,0,0));
    },
    addToGrid: function(aGrid) {
        this.grid = aGrid;
        this.grid.addMorph(this);
    },
    onKeyDown: function($super, evt) {
 //debugger;
        $super(evt);
        this.textString += String.fromCharCode(evt.getKeyCode());
    },
    onKeyPress: function($super, evt) {
       // debugger;
        $super(evt);
        this.textString += String.fromCharCode(evt.getKeyCode());
    },
    onBackspacePressed: function($super, evt) {
        $super(evt);
        if (!this.textString) {
            evt.stop();
            return true;
        }
        this.textString = this.textString.substring(0, this.textString.length-1);
        evt.stop();
    },
    onMouseDown: function (evt) {
    //debugger;
        if (evt.isLeftMouseButtonDown()) {
            this.displayExpression();
        }
    },
    displayExpression: function() {
        if (this.evalExpression !== undefined) {
            this.textString = '=' + this.evalExpression;
        }
    },

    put: function(aValue) {
        this.textString = aValue;
    },


});


}) // end of module