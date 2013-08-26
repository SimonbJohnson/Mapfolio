// THIS IS FOR THE IMAGE GALLERY, MAP STUFF START FARTHER DOWN
var windowHeight = $(window).height();

function toggleSector (sectorClass, element) {
	var status = $(element).children();
	if ($(status).hasClass("glyphicon-ok")){
		$(status).removeClass("glyphicon-ok");
		$(status).addClass("glyphicon-remove");
		$(sectorClass).hide();
	} else {
		$(status).removeClass("glyphicon-remove");
		$(status).addClass("glyphicon-ok");
		$(sectorClass).show();
	}    
}

function toggleExtent (extentFilter) {
	var thumbnails = $(".thumbnailGallery").children();
    if (extentFilter === "ALL"){
        $(thumbnails).show();
    } else {
        $(thumbnails).hide();
        $.each(thumbnails, function(i, thumbnail){
            if($(thumbnail).hasClass(extentFilter)){
                $(thumbnail).show();
            }
        })
    }
    var buttons = $("#extentButtons").children();
    $.each(buttons, function(i, button){
        var buttonElements = $(button).children();
        if($(button).hasClass(extentFilter)){            
            $(buttonElements).removeClass("glyphicon-remove");
            $(buttonElements).addClass("glyphicon-ok");
        } else {
            $(buttonElements).removeClass("glyphicon-ok");
            $(buttonElements).addClass("glyphicon-remove");
        }
    });
    markersToMap(extentFilter);
} 

function callModal (item) {
	var title = $(item).children('.caption').html();
	$(".modal-title").empty();
	$(".modal-title").append(title);
	
	var thumbSrc = $(item).children('img').attr("src");
	var mapSrc = thumbSrc.replace("_thumb", "");
    var img_maxHeight = windowHeight*0.60;
	var mapImg = '<img src="' + mapSrc + '" alt="" ' + 'style="max-height:' + img_maxHeight + 'px">';
	$(".modal-body").empty();
	$(".modal-body").append(mapImg);

    var description = $(item).children('.detailedDescription').html();
    $(".modal-detailedDescription").empty();
    $(".modal-detailedDescription").append(description);    
	
	var pdfSrc = "pdf" + mapSrc.substring(3).replace(".png", ".pdf");
	$("#downloadPDF").attr("href", pdfSrc);  

	$('#myModal').modal();
}

//disclaimer text
function showDisclaimer() {
    window.alert("The maps on this page do not imply the expression of any opinion on the part of the American Red Cross concerning the legal status of a territory or of its authorities.");
}




// MAP SHIT STARTS HERE

var centroids = [];
var markersBounds = [];
var displayedPoints = [];
var markers = new L.MarkerClusterGroup();

var countryStyle = {
    color: '#fff',
    weight: 1,
    fillColor: '#d7d7d8',
    fillOpacity: 1,
    clickable: false
};

var centroidOptions = {
    radius: 8,
    fillColor: "#ED1B2E",
    color: "#FFF",
    weight: 2.5,
    opacity: 1,
    fillOpacity: 1
};

var cloudmadeUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var attribution = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a> | &copy; <a href="http://redcross.org" title="Red Cross" target="_blank">Red Cross</a> 2013';
var cloudmade = L.tileLayer(cloudmadeUrl, {attribution: attribution});

var map = L.map('map', {   
    zoom: 0,
    scrollWheelZoom: false,
    layers: [cloudmade]
});
cloudmade.setOpacity(0); 

// change display accordingly to the zoom level
function mapDisplay() {
    var remove = {fillOpacity:0, opacity:0}
    var add = {fillOpacity:1, opacity:1}
    map.on('viewreset', function() {
        if (map.getZoom() < 6) {
            cloudmade.setOpacity(0);
            geojson.setStyle(add);
        } else {
            geojson.setStyle(remove);
            cloudmade.setOpacity(1);
        }
    })
}

// on marker click open modal
function centroidClick (e) {
    var thumbnail_id_class = "." + e.target.feature.properties.thumbnail_id;
    var sector = e.target.feature.properties.sector;
    if (sector === "ONLINE") {
        url = $(thumbnail_id_class).attr('href');
        window.open(url, '_blank');
    } else {
        callModal(thumbnail_id_class);
    }    
}

// on marker mouseover
function displayName(e) {   
    var target = e.target;
    target.openPopup();   
}
// on marker mouseout
function clearName(e) {    
    var target = e.target;
    target.closePopup();    
}

// beginning of function chain to initialize map
function getWorld() {
    $.ajax({
        type: 'GET',
        url: 'data/worldcountries.json',
        contentType: 'application/json',
        dataType: 'json',
        timeout: 10000,
        success: function(json) {
            worldcountries = json;
            countries = new L.layerGroup().addTo(map);
            geojson = L.geoJson(worldcountries,{
                style: countryStyle
            }).addTo(countries);
            getCentroids();
        },
        error: function(e) {
            console.log(e);
        }
    });
}

function getCentroids() {
    $.ajax({
        type: 'GET',
        url: 'data/centroids.json',
        contentType: 'application/json',
        dataType: 'json',
        timeout: 10000,
        success: function(data) {
            formatCentroids(data);
            mapDisplay();
        },
        error: function(e) {
            console.log(e);
        }
    });
}

function formatCentroids(data){
    $.each(data, function(index, item) {
        latlng = [item.longitude, item.latitude];
        var mapCoord = {
            "type": "Feature",
            "properties": {
                "name": item.name,
                "thumbnail_id": item.thumbnail_id,
                "extent": item.extent,
                "sector": item.sector,                        
            },
            "geometry": {
                "type": "Point",
                "coordinates": latlng
            }
        }
        centroids.push(mapCoord);
    }); 
    markersToMap('ALL');
}

function markersToMap(extentFilter){
    map.removeLayer(markers);
    markers = new L.MarkerClusterGroup({showCoverageOnHover:false, spiderfyDistanceMultiplier:3,});
    displayedPoints=[];
    $.each(centroids, function (i, centroid){
        var currentExtent = centroid.properties.extent;
        if (extentFilter === currentExtent || extentFilter === "ALL") {
            displayedPoints.push(centroid);
        }
    })    

    marker = L.geoJson(displayedPoints, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, centroidOptions);
        },
        onEachFeature: function(feature, layer) {
            var thumbnail_id_class = "." + feature.properties.thumbnail_id;
            var popupContent = $(thumbnail_id_class).children('.caption').html();
            var popupOptions = {
                'minWidth': 30,
                'offset': [0,-10],
                'closeButton': false,
            }; 
            layer.bindPopup(popupContent, popupOptions);
            layer.on({
                click: centroidClick,
                mouseover: displayName,
                mouseout: clearName,
            });   
        }            
    });
    markers.addLayer(marker);
    markers.addTo(map);
    markersBounds = markers.getBounds();
    map.fitBounds(markersBounds);
} 


$(window).resize(function(){
    map.fitBounds(markersBounds);
    windowHeight = $(window).height();
})

// reset map bounds using Zoom to Extent button
function zoomOut() {
    map.fitBounds(markersBounds);
}

// tweet popup
$('.twitterpopup').click(function(event) {
    var width  = 575,
        height = 400,
        left   = ($(window).width()  - width)  / 2,
        top    = ($(window).height() - height) / 2,
        url    = this.href,
        opts   = 'status=1' +
                 ',width='  + width  +
                 ',height=' + height +
                 ',top='    + top    +
                 ',left='   + left;

    window.open(url, 'twitter', opts);

    return false;
});

// start function chain to initialize map
getWorld();