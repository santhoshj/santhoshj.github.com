$(document).ready(function(){
    var text = "abracadabra$";
    var query = "cad";

    var suffixDetails = getSuffixDetails(text);
    var suffixes = suffixDetails.suffixes;
    var suffixArray = suffixDetails.suffixArray;
    var ranks = getRanks(suffixes);
    var cmap = new CumulativeMap(getCumulativeMap(text));

    bwtViewer = new BWTViewer("bwt");
    bwtViewer.load(suffixes, suffixArray, ranks, cmap);
    
//    bwtViewer.search("raca");
});

/**
 * Get sorted suffixes of the given text
 * Special handling is done for the character '$'. It is treated as the highest
 * character lexicographically.
 */
function getSuffixDetails(text) {
    var suffixDetails = new Array();
    // Collect all suffixes
    for (var i=0; i<text.length; ++i) {
        var next = text.slice(i, text.length) + text.slice(0, i);
        suffixDetails.push({text : next, position : i});
    }
    var sortedSuffixDetails = suffixDetails.sort(getSortFunction(function(a){return a.text;}));
    var suffixes = new Array(), suffixArray = new Array();
    _.each(sortedSuffixDetails, function(item) {
        suffixes.push(item.text);
        suffixArray.push(item.position);
    });
    return {suffixes: suffixes, suffixArray : suffixArray};
}

/**
 * Calculate ranks of alphabets upto the current row
 */
function getRanks(suffixes) {
    var ranks = new Array(), i;
    var ranksMap = {};
    var lastColumn = suffixes[0].length - 1;
    for (i=0; i < suffixes.length; ++i) {
        ranksMap[suffixes[i][lastColumn]] = 0;
    }
    for (i=0; i < suffixes.length; ++i) {
        ranks.push(deepcopy(ranksMap));
        ranksMap[suffixes[i][lastColumn]] += 1;
    }
    return ranks;
}

function BWTViewer(divID) {
    this.div = $('#' + divID);
    this.paper = Raphael(divID, this.div.width(), this.div.height());
    this.suffixGrid = new SuffixGrid(this.paper);
    this.query = new Query(this.paper);
}

BWTViewer.prototype.load = function(suffixes, suffixArray, ranks, cmap) {
    var size = this.suffixGrid.getSize(suffixes.length, suffixes[0].length);
    this.div.height(size.height+50);
    this.div.width(size.width);
    this.paper.setSize(size.width, size.height+50);
    this.suffixGrid.load(suffixes, suffixArray, ranks, cmap);
    this.query.load("racab", 10, size.height+10);
    this.cmap = cmap;
    this.ranks = ranks;
    this.suffixArray = suffixArray;
};

function SuffixGrid(paper){
    this.paper = paper;
    this.textSize = 20;
    this.cellPadding = 4;
    this.padding = 10;
    this.cellWidth = 30;
    this.columnGap = 2; // Gap between suffix array and text grid (in number of columns)
}

SuffixGrid.prototype.load = function(suffixes, suffixArray, ranks, cmap) {
    var i,j,pos,text;
    this.rowCount = suffixes.length;
    this.colCount = suffixes[0].length + 1 + this.columnGap;
    this.ranks = ranks;
    this.cmap = cmap;
    
    this.suffixArray = new Array();
    // Load suffix array
    for (i=0; i < this.rowCount; ++i) {
        pos = this.getTextPostion(i, 0);
        text = this.paper.text(pos.x, pos.y, suffixArray[i]);
        text.attr({
            "font-size" : this.textSize,
            "text-anchor" : "middle"
        });
        this.suffixArray.push(text);
    }
    // Load the text
    var grid = new Array();
    for (i=0; i < this.rowCount ; ++i) {
        var row = new Array();
        for (j=0; j < suffixes[0].length; ++j) {
            var next = suffixes[i][j];
            pos = this.getTextPostion(i, j + 1 + this.columnGap);
            text = this.paper.text(pos.x, pos.y, next);
            text.attr({
                "font-size" : this.textSize,
                "text-anchor" : "middle"
            });
            row.push(text);
        }
        grid.push(row);
    }
    // Rectangles
    // Suffix array
    var suffixArrayColumn = this.drawRectangles(0, "yellow");
    // First column
    var firstColumn = this.drawRectangles((1 + this.columnGap)*this.cellWidth, "green");
    // BWT column (Last column)
    var xPos = this.cellWidth * (this.colCount-1);
    var bwtColumn = this.drawRectangles(xPos, "red");
    var cellHeight = this.getTextItemHeight();
    // Create start and end markers
    var lineAttrs = {
        stroke : 'green',
        "stroke-width" : 5
    };
    
    this.startLine = this.paper.path(this.getPathString(0));
    this.startLine.attr(lineAttrs);
    
    this.endLine = this.paper.path(this.getPathString(this.rowCount*cellHeight));
    this.endLine.attr(lineAttrs);
};


SuffixGrid.prototype.setRange = function(start, end, cb) {
    var cellHeight = this.getTextItemHeight();
    
    var startPath = this.getPathString(start*cellHeight);
    var endPath = this.getPathString(end*cellHeight);
    this.startLine.animate({path: startPath}, 1000);
    this.endLine.animate({path: endPath}, 1000, cb);
};

SuffixGrid.prototype.getPathString = function(y) {
    return "M0,"+ y + "L"+ this.colCount*this.cellWidth + "," + y;
};

SuffixGrid.prototype.drawRectangles = function(xPos, color) {
    var col = new Array();
    var cellHeight = this.getTextItemHeight();
    for (var i=0; i < this.rowCount; ++i) {
        var y = cellHeight * i;
        var rect = this.paper.rect(xPos, y, this.cellWidth, cellHeight);
        rect.attr({
            fill : color,
            opacity : 0.3
        });
        col.push(rect);
    }
    return col;
};

SuffixGrid.prototype.getTextPostion = function(i, j) {
    var cellHeight = this.getTextItemHeight();
    var y = cellHeight * i + cellHeight/2;
    var x = this.cellWidth * j + this.cellWidth/2;
    return {x:x, y:y};
};

SuffixGrid.prototype.getTextItemHeight = function() {
    return this.textSize + 2*this.cellPadding;
};

SuffixGrid.prototype.getSize = function(rowCount, colCount) {
    var height = this.getTextItemHeight() * rowCount;
    var appendedCols = colCount + 1 + this.columnGap; // 1 column for suffix array and 2 for space between
    var width = this.cellWidth * appendedCols;
    return {
        width : width,
        height : height
    };
};

SuffixGrid.prototype.search = function(query) {
    var start, end, _this = this, transitions = new Array();
    start = this.cmap.getStart(query[query.length-1]);
    end = this.cmap.getEnd(query[query.length-1]);
    return this.animate(start, end, query[query.length-1], query.slice(0, query.length-1), this.showResult);
    /*
    var ret = new Array();
    _.each(_.range(start, end), function(j){
        ret.push(_this.suffixArray[j]);
    });
   return ret;
   */
};

SuffixGrid.prototype.showResult = function(start, end) {
    console.log("Start : " + start + " End : " + end);
};

SuffixGrid.prototype.animate = function(start, end, ch, query, cb) {
    var _this = this;
    console.log("Animating for " + ch);
    this.setRange(start, end, function() {
        _this.doSearch(start, end, query, cb);
    });
};

SuffixGrid.prototype.doSearch = function(start, end, query, cb) {
    if (start >= end) {
        cb(null, null);
        return;    
    }
    if (query === null || query.length === 0) {
        cb(start, end);
        return;    
    }
    var next = query[query.length-1];
    var elStart = this.ranks[start][next];
    var elEnd = this.ranks[end][next];

    if ((elStart < 0) || (elEnd < 0)) {
        cb(null, null);
        return;
    }
    var newstart = this.cmap.getPosition(next, elStart);
    var newend = this.cmap.getPosition(next, elEnd);
    this.animate(newstart, newend, next, query.slice(0, query.length-1), cb);
};

function Query(paper) {
    this.cellWidth = 30;
    this.cellHeight = 30;
    this.textSize = 16;
    this.query = new Array();
    this.paper = paper;
    this.rect = paper.rect(0, 0, 0, this.cellHeight).attr({fill : "blue"});
}

Query.prototype.load = function(query, x, y) {
    this.rect.attr({x : x, y : y, width: this.cellWidth*query.length});
    for (var i=0; i < query.length; ++i) {
        var next = this.paper.rect(x + i*this.cellWidth, y, this.cellWidth, this.cellHeight).attr({fill : 'grey'});
        this.query.push(next);
        this.paper.text(x + i*this.cellWidth + this.cellWidth/2, y+this.cellHeight/2, query[i]).attr({
            "font-size" : this.textSize,
            "text-anchor" : "middle"
        });
    }
};

Query.prototype.clear = function() {
    _.each(this.query, function(item) {
        item.remove();
    });
    this.query = new Array();
    this.rect.attr({width: 0});
};
