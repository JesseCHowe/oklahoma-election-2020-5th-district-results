const width = 760,
  height = 500,
  projection = d3.geo.albersUsa(),
  path = d3.geo.path().projection(projection);

const colorScale = d3.scale
    .linear()
    .domain([0, 0.5, 1])
    .range(["#446093", "#874e8e", "#bc3939"]),
  opacityScale = d3.scale.linear().domain([0, 1000]).range([0, 1]),
  republican = "STEPHANIE BICE",
  democrat = "KENDRA S. HORN",
  electionData =
    "https://raw.githubusercontent.com/JesseCHowe/oklahoma-election-2020-5th-district-results/main/data/results.csv",
  precinctData =
    "https://raw.githubusercontent.com/JesseCHowe/oklahoma-election-2020-5th-district-results/main/data/precints.json",
  placesData =
    "https://raw.githubusercontent.com/JesseCHowe/oklahoma-election-2020-5th-district-results/main/data/places.json";

const democratPct = d3.select(".democrat-percentage"),
  democratRow = d3.select(".democrat-row"),
  democratVote = d3.select(".democrat-vote"),
  republicanPct = d3.select(".republican-percentage"),
  republicanRow = d3.select(".republican-row"),
  republicanVote = d3.select(".republican-vote"),
  precinctNum = d3.select(".precinct-num"),
  tooltip = d3.select(".toolTip");

const svg = d3
  .select(".map_container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);
svg
  .append("rect")
  .attr("class", "background")
  .attr("width", width)
  .attr("height", height);

const g = svg.append("g").style("stroke-width", "1.5px");

queue()
  .defer(d3.json, precinctData)
  .defer(d3.csv, electionData)
  .defer(d3.json, placesData)
  .await(loaded);

function loaded(error, county, results, places) {
  const republicanResults = results
    .filter((o) => o.cand_name === republican)
    .reduce((tot, num) => (tot += +num.cand_tot_votes), 0);
  const democratResults = results
    .filter((o) => o.cand_name === democrat)
    .reduce((tot, num) => (tot += +num.cand_tot_votes), 0);
  const totalresult = results.reduce((tot, num) => {
    return (tot += +num.cand_tot_votes);
  }, 0);

  let highNum = 0;
  for (let i = 0; i < results.length; i++) {
    if (+results[i].cand_tot_votes > highNum) {
      highNum = +results[i].cand_tot_votes;
    }
  }

  precinctNum.text(null);
  democratVote.text(numberWithCommas(democratResults));
  republicanVote.text(numberWithCommas(republicanResults));
  democratPct.text(((democratResults / totalresult) * 100).toFixed(2) + "%");
  republicanPct.text(
    ((republicanResults / totalresult) * 100).toFixed(2) + "%"
  );
  republicanRow.classed("win", +republicanResults > +democratResults);
  democratRow.classed("win", +democratResults > +republicanResults);

  const district5 = topojson.feature(county, county.objects.pct_2010);
  projection.scale(1).translate([0, 0]);
  const b = path.bounds(district5),
    s =
      0.95 /
      Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
    t = [
      (width - s * (b[1][0] + b[0][0])) / 2,
      (height - s * (b[1][1] + b[0][1])) / 2,
    ];
  projection.scale(s).translate(t);

  g.append("g")
    .attr("id", "precincts")
    .selectAll("path")
    .data(topojson.feature(county, county.objects.pct_2010).features)
    .enter()
    .append("path")
    .attr("d", path)
    .style("opacity", (d) => getOpacity(d))
    .style("fill", (d) => getColorElection(d))
    .style("stroke", (d) => getColorElection(d))
    .attr("class", (d) => `county-boundary ${d.properties.COUNTY_NAM}`);

  g.append("g")
    .attr("id", "places")
    .selectAll("path")
    .data(
      topojson.feature(places, places.objects.ne_10m_populated_places).features
    )
    .enter()
    .append("path")
    .attr(
      "class",
      (d) => "place-point " + d.properties.NAME.split(" ").join("_")
    )
    .style("fill", "#fff")
    .style("stroke", "#333")
    .attr("d", path);

  g.append("g")
    .attr("id", "places_name")
    .selectAll("path")
    .data(
      topojson.feature(places, places.objects.ne_10m_populated_places).features
    )
    .enter()
    .append("text")
    .attr(
      "class",
      (d) => "place-text " + d.properties.NAME.split(" ").join("_")
    )
    .attr("transform", function (d) {
      return "translate(" + projection(d.geometry.coordinates) + ")";
    })
    .attr("dy", "-0.60em")
    .attr("dx", ".35em")
    .attr("font-size", 15)
    .text((d) => d.properties.NAME);

  g.append("g")
    .attr("class", "precinct_tip")
    .selectAll("path")
    .data(topojson.feature(county, county.objects.pct_2010).features)
    .enter()
    .append("path")
    .attr("d", path)
    .style("fill", "rgba(0,0,0,0)")
    .attr("class", (d) => `county-overlay ${d.properties.COUNTY_NAM}`)
    .on("mousemove", (d) => mouseOverFunc(d))
    .on("mouseout", (d) => mouseOutFunc(d));

  d3.selectAll(".Norman").remove();
  d3.selectAll(".Bartlesville").remove();

  function getColorElection(d) {
    const precinct = results.filter(
      (o) => +o.precinct_code === +d.properties.PCT_CEB
    );
    const totalresult = precinct.reduce((tot, num) => {
      return (tot += +num.cand_tot_votes);
    }, 0);
    const republicanCount =
      precinct.filter((o) => o.cand_name == republican)[0] || 0;
    const percentRepublican = +republicanCount.cand_tot_votes / totalresult;
    return colorScale(percentRepublican);
  }

  function getOpacity(d) {
    const precinct = results.filter(
      (o) => +o.precinct_code === +d.properties.PCT_CEB
    );
    let totalresult = precinct.reduce((tot, num) => {
      return (tot += +num.cand_tot_votes);
    }, 0);
    const voteCount = +totalresult || 0;
    return opacityScale(voteCount);
  }

  function mouseOutFunc(d) {
    precinctNum.text(null);
    democratVote.text(numberWithCommas(democratResults));
    republicanVote.text(numberWithCommas(republicanResults));
    democratPct.text(((democratResults / totalresult) * 100).toFixed(2) + "%");
    republicanPct.text(
      ((republicanResults / totalresult) * 100).toFixed(2) + "%"
    );
    republicanRow.classed("win", +republicanResults > +democratResults);
    democratRow.classed("win", +democratResults > +republicanResults);
  }

  function mouseOverFunc(d) {
    const precinct = results.filter(
      (o) => +o.precinct_code === +d.properties.PCT_CEB
    );

    const totalresult = precinct.reduce(
      (tot, num) => (tot += +num.cand_tot_votes),
      0
    );
    if (totalresult) {
      const precinctRepublicanResults =
        precinct.filter((o) => o.cand_name === republican)[0] || 0;
      const precintDemocratResults =
        precinct.filter((o) => o.cand_name === democrat)[0] || 0;

      precinctNum.text(`Precinct ${+d.properties.Precinct}`);
      democratVote.text(
        numberWithCommas(precintDemocratResults.cand_tot_votes)
      );
      republicanVote.text(
        numberWithCommas(precinctRepublicanResults.cand_tot_votes)
      );
      democratPct.text(
        ((precintDemocratResults.cand_tot_votes / totalresult) * 100).toFixed(
          2
        ) + "%"
      );
      republicanPct.text(
        (
          (precinctRepublicanResults.cand_tot_votes / totalresult) *
          100
        ).toFixed(2) + "%"
      );

      republicanRow.classed(
        "win",
        +precinctRepublicanResults.cand_tot_votes >
          +precintDemocratResults.cand_tot_votes
      );
      democratRow.classed(
        "win",
        +precintDemocratResults.cand_tot_votes >
          +precinctRepublicanResults.cand_tot_votes
      );
    }
  }
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
