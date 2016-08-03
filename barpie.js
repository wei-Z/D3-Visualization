angular.module('crsApp').directive('barpie', ['$animate', '$timeout', function($animate, $timeout){

  return {
    restrict: 'E',
    scope: {
      val: '=',
      filter: '='
    },

    link: function(scope, element, attrs) {

      scope.$watchCollection('val', function(newVal, oldVal) {
        if (!newVal) {
            return;
        }

        var continent = scope.filter.location.Continent;
          
        // change the data between continent and country, if North America, US will show states network detail.
        if (continent== "N. America"){
            var data1=dataClean(newVal.filter(function(crs){return crs.country=="United States"}), "state");
            var data2=dataClean(newVal.filter(function(crs) {return crs.country!="United States"}), "country");
            //console.log(data1, data2);
            var data = data1;
            // Add Hatti to America States
            for (var i=0;i<Object.keys(data1).length;i++){
              for (var j =0;j<Object.keys(data2[i]).length; j++){
                data[i].push(data2[i][j]);
              }
              data[i]=data[i].sort(compare); // sort Hatti with all States
            }            
        }
        else if (continent === undefined || continent.length === 0) {
          var data = dataClean(newVal, "continent");
        } else {
          var data = dataClean(newVal, "country");
        }
  
       //deal with animation issues
        var container = angular.element( document.querySelector( '.content' ) );
        $animate.enter(container, parent).then(function(){
            dashboard('#dashboard',data);
        });


      },true);

      //compare function to sort
      function compare(a,b) {
        if (a.x < b.x)
          return -1;
        if (a.x > b.x)
          return 1;
        return 0;
      }

      // clean the newVal data 
      function dataClean(newVal, continentOrCountry) {
          var data = [];
          var temp = {funded:{}, ps:{}, unfunded:{}};

          newVal.forEach(function (crs) {

             var region = crs[continentOrCountry].trim();
             var key = crs.isFunded;
             //first, create network: {region:0} for each network
             Object.keys(temp).forEach (function (category) {
                if (temp[category][region] == undefined) {
                    temp[category][region] = 0;
                }
             })
             // for the matched category and region, plus 1
             temp[key][region] ++;

          })

          //from temp create wanted data format
          Object.keys(temp).forEach (function (category) {
            
            var obj =[];
            var Locations=Object.keys(temp[category]).sort();
          
            for (var i in Locations){
              var location = Locations[i];

              var element = {x:location, y:temp[category][location]}
              obj.push(element);
            }
            data.push(obj);

          })
     
          return data; 

        }

      function dashboard(id, fData) {
          var labelColor = '#FFFFFF';
          var n = 3; // number of catagories
          var m = fData[0].length; // number of x Axis labels
          var regions = []; // used for x domain
          for (i =0 ; i<m; i++) {
            regions.push(fData[0][i].x);
          }

          // Prepare data to be used in Stacked and Grouped barchart
          var stack = d3.layout.stack(), layers = stack(fData),
          yGroupMax = d3.max(layers, function (layer) { return d3.max(layer, function (d) {return d.y; })}),
          yStackMax = d3.max(layers, function (layer) { return d3.max(layer, function (d) {return d.y0 + d.y; })});
       
          // Draw d3 based on current window size       
          resize();

          // when window size changed, redraw d3
          d3.select(window).on("resize", resize);

          function resize() {
              //clear old dashboard elements if there are any
              if (document.getElementById('dashboard') != null) {
               var contents = document.getElementById('dashboard').innerHTML;
             } else {
               return;
             }
              if (contents) {
                document.getElementById('dashboard').innerHTML = '';}

              // set up margins and dimensions
              var hGDim = {t: 60, r: 50, b: 80, l: 80};
              hGDim.w = parseInt(d3.select('.data-viz-container').style('width'), 10)*0.78 - hGDim.l - hGDim.r, 
              hGDim.h = parseInt(d3.select('.data-viz-container').style('height'), 10)*0.65 - hGDim.t - hGDim.b;

              // create x y scales
              var x = d3.scale.ordinal()
                              .domain(regions)
                              .rangeRoundBands([0, hGDim.w], 0.3);

              var y = d3.scale.linear()
                              .domain([0, yStackMax])
                              .range([hGDim.h, 0]);

              // set up colors
              var color = d3.scale.ordinal()
                                     .range(["#F44336", "#B5B4B5", "#FF9E80"]);

              // set up x Axis
              var xAxis = d3.svg.axis()
                                      .scale(x)
                                      .tickSize(5)
                                      .tickPadding(6)
                                      .orient('bottom');

              // set up viz width, height and start point                   
              var svg = d3.select(id).append('svg')
                                  .attr('id', "svgplot")
                                  .attr("width", hGDim.w + hGDim.l + hGDim.r)
                                  .attr("height", hGDim.h + hGDim.t + hGDim.b)
                                  .append('g')
                                  .attr('transform', 'translate(' + hGDim.l + ', ' + hGDim.t + ')');

              // create layer for each category and assign color
              var layer = svg.selectAll('.layer')
                                      .data(layers)
                                      .enter()
                                      .append('g')
                                      .attr('class', 'layer')
                                      .style('fill', function (d, i) { return color(i); });

              // create a variable for bar width
              var ColumnWidth = Math.min(x.rangeBand(),  parseInt(d3.select('.data-viz-container').style('width'), 10)/77*3);

              // variance is for later adjustment
              var variance = (x.rangeBand() - ColumnWidth)/2;

              //append rect for each layer
              var rect = layer.selectAll('rect')
                                       .data(function (d) { return d;})
                                       .enter()
                                       .append('rect')
                                       .attr('x', function (d) { return x(d.x) + variance; })
                                       .attr('y', hGDim.h)
                                       .attr('width', ColumnWidth) // x.rangeBand()
                                       .attr("rx", ColumnWidth/7)
                                       .attr("ry", ColumnWidth/7)
                                       .attr('height', 0)
                                       .style('cursor', 'pointer');

              // rect transition
              rect.transition()
                    .delay(function (d, i) { return i *10; })
                    .attr('y', function (d) { return y(d.y0 + d.y); })
                    .attr('height', function (d) { return y(d.y0) - y(d.y0 + d.y); });

              // add text labels for Stacked Bars          
              var text = layer.selectAll('text')
                                       .data(function (d) { return d;})
                                       .enter()
                                       .append('text')
                                       .attr('fill', labelColor)
                                       .attr('class', 'StackText')
                                       .attr('x', function (d) { return x(d.x) + x.rangeBand()/2 ; })
                                       .attr('y', function (d) { return y(d.y0 + d.y) + (y(d.y0)-y(d.y0 + d.y))/2 ; })
                                       .attr("dy", ".35em")
                                       .attr('text-anchor', 'middle')
                                       .transition().delay(function (d,i){ return 300;})
                                       .duration(800)
                                       .text(function (d) { if (d.y == 0) return ''; return d.y; })
                                       .style('font-size',function (d) { return Math.min(20, y(d.y0) - y(d.y0 + d.y), ColumnWidth) + 'px'; });

              // add x axis and labels
              svg.append('g')
                    .attr('class', "x axis")
                    .attr('transform', 'translate(0, ' + hGDim.h  + ')')
                    .attr("fill", labelColor)
                    .call(xAxis)
                    .selectAll("text")                                                    
                    .style("text-anchor", "start")               // rotate based on start point of the text
                    .attr("transform", "rotate(30 -10, 0)")  // rotate x-axis labels
                    .style("text-transform", "uppercase"); // transfrom text labels to uppercase

              // add y axis labels
              // find 
              var spacing = parseInt(d3.select('#topInput').style('font-size'), 10)/10*8;

              svg.append('text')
                    .attr('transform', 'rotate(-90)')
                    .each (function (d) {
                      var yAxisText = ['* CRS Count', '(Includes Search Criteria)'];
                      for (i =0; i <yAxisText.length; i++) {
                        d3.select(this).append('tspan')
                            .text(yAxisText[i])
                            .attr('class', 'yAxisText')             
                            .attr('x', -hGDim.h /2.1)
                            .attr('y', Math.max(-hGDim.w/19, -hGDim.l) + spacing*i)
                            .attr('dy', '.71em')
                            .style('text-anchor', 'middle')
                            .style('font-size', .8 - i/10 + 'vw')
                            .attr('fill', labelColor)
                      }
                    });
                 
              // change when click Grouped or Stacked
              d3.selectAll("input").on("change", change);

              // Stacked switched Grouped after 1.2s
              var timeout = $timeout(function() {
                d3.select("input[value=\"grouped\"]").property("checked", true).each(change);
                // transitionGrouped();
              }, 1200);
             
              // function for : switch between Grouped and Stacked
              function change() {
                $timeout.cancel(timeout);
                if (this.value === "grouped") transitionGrouped();
                else transitionStacked();
              }

              // when click Grouped, switch to Grouped barchart
              function transitionGrouped() {
                // redo y axis domain based on grouped data
                y.domain([0, yGroupMax]);

                // remove Stacked text labels
                layer.selectAll('.StackText').remove();

                // rect transition to change to Grouped
                rect.transition()
                      .duration(500)
                      .delay(function (d, i) { return i * 10; })
                      .attr('x', function (d, i, j) { return x(d.x) + ColumnWidth / n * j + variance; })
                      .attr('width', ColumnWidth / n  ) //x.rangeBand() / n
                      .transition()
                      .attr('y', function (d) { return y(d.y); })
                      .attr('height', function (d) { return hGDim.h - y(d.y); });

                // add text labels for Grouped bar chart
                layer.selectAll('text')
                       .data(function (d) { return d;})
                       .enter()
                       .append('text')
                       .attr('fill', labelColor)
                       .attr('class', 'GroupText')
                       .attr('x', function (d, i, j) { return x(d.x) + (ColumnWidth ) / n * j +(ColumnWidth )/n /2 + variance; })
                       .attr('y', function (d) { return y(d.y) - Math.min(20, x.rangeBand() / n ) /2; })
                       .attr("dy", ".35em")
                       .attr('text-anchor', 'middle')
                       .transition().delay(function (d,i) { return 300;})
                       .duration(800)
                       .text(function (d) { if (d.y == 0) return ''; return d.y; })
                       .style('font-size', function (d) { return Math.min(20, ColumnWidth / n )+ 'px'; });

              }

              // when click Stacked, switch to Stacked bar chart
              function transitionStacked() {

                // redo y axis domain based on stacked data
                y.domain([0, yStackMax]);

                // remove Grouped text labels
                layer.selectAll('.GroupText').remove();

                // rect transition to change to Stacked
                rect.transition()
                      .duration(500)
                      .delay(function (d, i) { return i *10; })
                      .attr('y', function (d) { return y(d.y0 + d.y); })
                      .attr('height', function (d) { return y(d.y0) - y(d.y0 + d.y); })
                      .transition()
                      .attr('x', function (d) { return x(d.x) + variance; })
                      .attr('width', ColumnWidth); //x.rangeBand()

                // add text labels for Stacked bar chart
                layer.selectAll('text')
                       .data(function (d) { return d;})
                       .enter()
                       .append('text')
                       .attr('fill', labelColor)
                       .attr('class', 'StackText')
                       .attr('x', function (d) { return x(d.x) + x.rangeBand()/2 ; })
                       .attr('y', function (d) { return y(d.y0 + d.y) + (y(d.y0)-y(d.y0 + d.y))/2 ; })
                       .attr("dy", ".22em")
                       .attr('text-anchor', 'middle')
                       .transition().delay(function (d,i){ return 300;})
                       .duration(800)
                       .text(function (d) { if (d.y == 0) return ''; return d.y; })
                       .style('font-size',function (d) { return Math.min(20, y(d.y0) - y(d.y0 + d.y)) * 0.95; });

              }
              
               
            }// end of resize function      

      } // end of dashboard

    } // end of link function

  }; // end of return

}]); // end of barpie function and directive




    