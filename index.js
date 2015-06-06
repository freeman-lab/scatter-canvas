var d3 = require('d3');
require('d3-multiaxis-zoom')(d3);
var inherits = require('inherits');
var utils = require('lightning-client-utils');
var _ = require('lodash');
var Color = require('color');
var TooltipPlugin = require('d3-tip');
TooltipPlugin(d3);


var Scatter = function(selector, data, images, opts) {
    var margin = {
        top: 0,
        right: 0,
        bottom: 20,
        left: 45
    };

    var defaults = {
        tooltips: false
    };

    opts = _.defaults(opts || {}, defaults);

    this.opts = opts

    this.data = this._formatData(data)

    if(_.has(this.data, 'xaxis')) {
        margin.bottom = 57;
    }
    if(_.has(this.data, 'yaxis')) {
        margin.left = 70;
    }

    this.width = (opts.width || $(selector).width()) - margin.left - margin.right;
    this.height = Math.min(($(selector).height() || Infinity), (opts.height || (this.width * 0.6))) - margin.top - margin.bottom;

    this.selector = selector;
    this.defaultFill = '#deebfa'
    this.defaultStroke = '#68a1e5'
    this.defaultSize = 8
    this.defaultAlpha = 0.9
    this.margin = margin
    this._init();

};

inherits(Scatter, require('events').EventEmitter);

module.exports = Scatter;

Scatter.prototype._init = function() {

    var data = this.data
    var height = this.height
    var width = this.width
    var opts = this.opts
    var selector = this.selector
    var margin = this.margin
    var self = this

    var points = data.points

    var xDomain = d3.extent(points, function(d) {
            return d.x;
        });
    var yDomain = d3.extent(points, function(d) {
            return d.y;
        });

    var sizeMax = d3.max(points, function(d) {
            return d.s;
        });

    if (sizeMax) {
        var padding = sizeMax / 2
    } else {
        var padding = self.defaultSize / 2
    }

    var xRange = xDomain[1] - xDomain[0]
    var yRange = yDomain[1] - yDomain[0]

    this.x = d3.scale.linear()
        .domain([xDomain[0] - xRange * 0.1, xDomain[1] + xRange * 0.1])
        .range([0 + padding, width - padding]);

    this.y = d3.scale.linear()
        .domain([yDomain[0] - yRange * 0.1, yDomain[1] + yRange * 0.1])
        .range([height - padding , 0 + padding]);

    this.zoom = d3.behavior.zoom()
        .x(this.x)
        .y(this.y)
        .on('zoom', zoomed);

    var container = d3.select(selector)
        .append('div')
        .style('width', width + margin.left + margin.right + "px")
        .style('height', height + margin.top + margin.bottom + "px")


    var canvas = container
        .append('canvas')
        .attr('class', 'scatter-plot canvas')
        .attr('width', width)
        .attr('height', height)
        .style('padding', margin.top + 'px ' + margin.left + 'px')
        .call(this.zoom)
        .node().getContext("2d")

    var svg = container
        .append('svg:svg')
        .attr('class', 'scatter-plot svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('svg:g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(this.zoom)


    var makeXAxis = function () {
        return d3.svg.axis()
            .scale(self.x)
            .orient('bottom')
            .ticks(5);
    };

    var makeYAxis = function () {
        return d3.svg.axis()
            .scale(self.y)
            .orient('left')
            .ticks(5);
    };

    this.xAxis = d3.svg.axis()
        .scale(self.x)
        .orient('bottom')
        .ticks(5);

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0, ' + height + ')')
        .call(self.xAxis);

    this.yAxis = d3.svg.axis()
        .scale(self.y)
        .orient('left')
        .ticks(5);

    svg.append('g')
        .attr('class', 'y axis')
        .call(self.yAxis);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(makeXAxis()
                .tickSize(-height, 0, 0)
                .tickFormat(''));

    svg.append('g')
        .attr('class', 'y grid')
        .call(makeYAxis()
                .tickSize(-width, 0, 0)
                .tickFormat(''));

    // function for handling opacity
    var buildRGBA = function(fill, opacity) {
        var color = Color(fill);
        color.alpha(opacity);
        return color.rgbString();
    };

    _.map(points, function(p) {
        p.s = p.s ? p.s : self.defaultSize
        p.cfill = buildRGBA(p.c ? p.c : self.defaultFill, p.a ? p.a : self.defaultAlpha)
        p.cstroke = p.c ? p.c.darker(0.75) : self.defaultStroke
        return p
    })

    // automatically set line width based on number of points
    var lineWidth
    if (points.length > 500) {
        lineWidth = 1
    } else {
        lineWidth = 1.1
    }

    draw();

    function draw() {

        var cx, cy, s;

        _.forEach(points, function(p) {
            cx = self.x(p.x);
            cy = self.y(p.y);
            canvas.beginPath();
            canvas.arc(cx, cy, p.s, 0, 2 * Math.PI, false);
            canvas.fillStyle = p.cfill
            canvas.lineWidth = lineWidth
            canvas.strokeStyle = p.cstroke
            canvas.fill()
            canvas.stroke()
        })
          
    }

    function updateAxis() {

        svg.select('.x.axis').call(self.xAxis);
        svg.select('.y.axis').call(self.yAxis);
        svg.select('.x.grid')
            .call(makeXAxis()
                .tickSize(-height, 0, 0)
                .tickFormat(''));
        svg.select('.y.grid')
            .call(makeYAxis()
                    .tickSize(-width, 0, 0)
                    .tickFormat(''));

    }

    function zoomed() {

        canvas.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
        updateAxis();
        draw();
    }

    if(_.has(this.data, 'xaxis')) {
        var txt = this.data.xaxis;
        if(_.isArray(txt)) {
            txt = txt[0];
        }
        svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .text(txt);
    }
    if(_.has(this.data, 'yaxis')) {
        var txt = this.data.yaxis;
        if(_.isArray(txt)) {
            txt = txt[0];
        }

        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", - height / 2)
            .attr("y", -50)
            .text(txt);
    }
    
    this.svg = svg;
    this.points = points;

}

Scatter.prototype._formatData = function(data) {

    retColor = utils.getColorFromData(data)
    retSize = data.size || []
    retAlpha = data.alpha || []

    data.points = data.points.map(function(d, i) {
        d.x = d[0]
        d.y = d[1]
        d.i = i
        d.c = retColor.length > 1 ? retColor[i] : retColor[0]
        d.s = retSize.length > 1 ? retSize[i] : retSize[0]
        d.a = retAlpha.length > 1 ? retAlpha[i] : retAlpha[0]
        return d
    })

    return data

};

Scatter.prototype.updateData = function(data) {
    
    // update existing points, add new ones
    // and delete old ones
   
    self = this
    var x = this.x
    var y = this.y

    var newdat = this.svg.selectAll('circle')
        .data(this._formatData(data).points)
        
    newdat.transition().ease('linear')
        .attr('class', 'dot')
        .attr('r', function(d) { return (d.s ? d.s : self.defaultSize)})
        .attr('transform', function(d) {
            return 'translate(' + x(d.x) + ',' + y(d.y) + ')';
        })
        .style('fill',function(d) { return (d.c ? d.c : self.defaultFill);})
        .style('stroke',function(d) { return (d.c ? d.c.darker(0.75) : self.defaultStroke);})
        .style('fill-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})
        .style('stroke-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})

    newdat.enter()
        .append('circle')
        .on('mouseover', self.darken)
        .on('mouseout', self.brighten)
        .style('opacity', 0.0)
        .attr('class','dot')
        .attr('r', function(d) { return (d.s ? d.s : self.defaultSize)})
        .attr('transform', function(d) {return 'translate(' + x(d.x) + ',' + y(d.y) + ')';})
        .style('fill',function(d) { return (d.c ? d.c : self.defaultFill);})
        .style('stroke',function(d) { return (d.c ? d.c.darker(0.75) : self.defaultStroke);})
        .style('fill-opacity', function(d) { return (d.a ? d.a : self.defaultOpacity)})
        .style('stroke-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})
      .transition().ease('linear')
        .duration(300)
        .style('opacity', 1.0)
        
    newdat.exit().transition().ease('linear')
        .style('opacity', 0.0).remove()
    
};

Scatter.prototype.appendData = function(data) {
    
    // add new points to existing points
   
    this.points = this.points.concat(this._formatData(data).points)
    points = this.points

    self = this
    var x = this.x
    var y = this.y
    
    this.svg.selectAll('circle')
        .data(points)
      .enter().append('circle')
        .style('opacity', 0.0)
        .attr('class', 'dot')
        .attr('r', function(d) { return (d.s ? d.s : self.defaultSize)})
        .attr('transform', function(d) {return 'translate(' + x(d.x) + ',' + y(d.y) + ')';})
        .style('fill',function(d) { return (d.c ? d.c : self.defaultFill);})
        .style('stroke',function(d) { return (d.c ? d.c.darker(0.75) : self.defaultStroke);})
        .style('fill-opacity', function(d) { return (d.a ? d.a : self.defaultOpacity)})
        .style('stroke-opacity',function(d) { return (d.a ? d.a : self.defaultAlpha);})
        .on('mouseover', self.darken)
        .on('mouseout', self.brighten)
      .transition()
        .ease('linear')
        .duration(300)
        .style('opacity', 1.0)
};