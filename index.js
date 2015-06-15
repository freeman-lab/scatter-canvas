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

    var xRange = xDomain[1] - xDomain[0]
    var yRange = yDomain[1] - yDomain[0]

    this.x = d3.scale.linear()
        .domain([xDomain[0] - xRange * 0.1, xDomain[1] + xRange * 0.1])
        .range([0, width]);

    this.y = d3.scale.linear()
        .domain([yDomain[0] - yRange * 0.1, yDomain[1] + yRange * 0.1])
        .range([height , 0]);

    this.zoom = d3.behavior.zoom()
        .x(this.x)
        .y(this.y)
        .on('zoom', zoomed);

    var shiftKey;

    var selected = [];

    var brush = d3.svg.brush()
        .x(this.x)
        .y(this.y)
        .on("brushstart", function() {
            selected = []
        })
        .on("brush", function() {
            if (shiftKey) {
                selected = []
                var extent = d3.event.target.extent();
                console.log(extent)
                _.forEach(points, function(p) {
                    var cond1 = (p.x > extent[0][0] & p.x < extent[1][0])
                    var cond2 = (p.y > extent[0][1] & p.y < extent[1][1])
                    if (cond1 & cond2) {
                        selected.push(p.i)
                    }
                })
                console.log(selected)
                canvas.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
                draw();
            } else {
              d3.select(this).call(d3.event.target);
            }
        })
        .on("brushend", function() {
            d3.event.target.clear();
            d3.select(this).call(d3.event.target);
        })

    var container = d3.select(selector)
        .append('div')
        .style('width', width + margin.left + margin.right + "px")
        .style('height', height + margin.top + margin.bottom + "px")

    var canvas = container
        .append('canvas')
        .attr('class', 'scatter-plot canvas')
        .attr('width', width)
        .attr('height', height)
        .style('margin', margin.top + 'px ' + margin.left + 'px')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(this.zoom)
        .on("click", mouseHandler)
        .node().getContext("2d")

    var svg = container
        .append('svg:svg')
        .attr('class', 'scatter-plot svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('svg:g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(this.zoom)

    var brushrect = container
        .append('svg:svg')
        .attr('class', 'scatter-plot brush-container')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
    .append("g")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr('class', 'brush')
        .call(brush)

    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'scatter-plot rect');

    d3.selectAll('.brush .background')
        .style('cursor', 'default')
    d3.selectAll('.brush')
        .style('pointer-events', 'none')

    function mouseHandler() {
        if (d3.event.defaultPrevented) return;
        selected = []
        canvas.clearRect(0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom);
        draw();
    }

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
        p.cstroke = buildRGBA(p.c ? p.c.darker(0.75) : self.defaultStroke, p.a ? p.a : self.defaultAlpha)
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
            var alpha
            if (selected.length > 0) {
                if (_.indexOf(selected, p.i) >= 0) {
                    console.log(p.i)
                    console.log('point is selected')
                    alpha = 0.9
                } else {
                    alpha = 0.1
                }
            } else {
                alpha = p.a ? p.a : self.defaultAlpha
            }
            cx = self.x(p.x);
            cy = self.y(p.y);
            canvas.beginPath();
            canvas.arc(cx, cy, p.s, 0, 2 * Math.PI, false);
            canvas.fillStyle = buildRGBA(p.c ? p.c : self.defaultFill, alpha)
            canvas.lineWidth = lineWidth
            canvas.strokeStyle = buildRGBA(p.c ? p.c.darker(0.75) : self.defaultStroke, alpha)
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

    d3.select(window).on("keydown", function() {
        shiftKey = d3.event.shiftKey;
        if (shiftKey) {
            console.log('turning on pointer events')
            d3.selectAll('.brush').style('pointer-events', 'all')
            d3.selectAll('.brush .background').style('cursor', 'crosshair')
        }
    });

    d3.select(window).on("keyup", function() {
        if (shiftKey) {
            d3.selectAll('.brush').style('pointer-events', 'none')
            d3.selectAll('.brush .background').style('cursor', 'default')
        }
    });
    
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