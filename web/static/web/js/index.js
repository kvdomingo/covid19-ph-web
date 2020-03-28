document.addEventListener("DOMContentLoaded", () => {
    $("#map").first().css("height", window.innerHeight - $(".navbar").first().innerHeight());
    $("#sideDash").first()
        .css("overflow-y", "scroll")
        .css("height", window.innerHeight - $(".navbar").first().innerHeight());

    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            data = JSON.parse(this.responseText);
        }
    };
    xhttp.open('GET', window.location.href + 'api/geo', true);
    xhttp.send();

    mapboxgl.accessToken = 'pk.eyJ1Ijoia3Zkb21pbmdvIiwiYSI6ImNrODhwbDk4MjBiNTAzbHM0enByZ21pZ3YifQ.xKWVuQAh7SnTyT-IL1rb1g';

    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [121, 12.5],
        zoom: 5,
    });

    map.addControl(
        new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
        })
    );

    map.addControl(new mapboxgl.NavigationControl());

    map.addControl(
        new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
            },
            trackUserLocation: true,
        })
    );

    map.on('load', function() {
        map.addSource('provinces', {
            type: 'geojson',
            data: 'https://raw.githubusercontent.com/macoymejia/geojsonph/master/Province/Provinces.json',
        });

        map.addSource('metro', {
            type: 'geojson',
            data: 'https://raw.githubusercontent.com/macoymejia/geojsonph/master/Philippines/Luzon/Metropolitant%20Manila/MetropolitantManila.json'
        });

        map.addSource('cases', {
            type: 'geojson',
            data: data,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
        });

        map.addLayer({
            id: 'province-fills',
            type: 'fill',
            source: 'provinces',
            layout: {},
            paint: {
                'fill-color': '#cccccc',
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                ],
            },
        });

        map.addLayer({
            id: 'province-borders',
            type: 'line',
            source: 'provinces',
            layout: {},
            paint: {
                'line-color': '#fcfcfc',
                'line-width': 2,
            },
        });

        map.addLayer({
            id: 'metro-fills',
            type: 'fill',
            source: 'metro',
            layout: {},
            paint: {
                'fill-color': 'rgba(204, 204, 204, 0.5)',
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                ],
            },
        });

        map.addLayer({
            id: 'metro-borders',
            type: 'line',
            source: 'metro',
            layout: {},
            paint: {
                'line-color': 'rgba(252, 252, 252, 0.5)',
                'line-width': 2,
            },
        });

        map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'cases',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#f1f075',
                    100,
                    '#f19a75',
                    750,
                    '#f28cb1',
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    100,
                    30,
                    750,
                    40,
                ],
            },
        });

        map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'cases',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12,
            },
        });

        map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'cases',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': '#11b4da',
                'circle-radius': 10,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff'
            },
        });

        var hoveredStateId = null;

        map.on('mousemove', 'province-fills', function(e) {
            if (e.features.length > 0) {
                if (hoveredStateId) {
                    map.setFeatureState(
                        { source: 'provinces', id: hoveredStateId },
                        { hover: false },
                    );
                }
                hoveredStateId = e.features[0].properties['ID_1'];
                map.setFeatureState(
                    { source: 'provinces', id: hoveredStateId },
                    { hover: true },
                );
            }
        });

        map.on('mouseleave', 'province-fills', function() {
            if (hoveredStateId) {
                map.setFeatureState(
                    { source: 'provinces', id: hoveredStateId },
                    { hover: false }
                );
            }
            hoveredStateId = null;
        });

        map.on('click', 'clusters', function(e) {
            var features = map.queryRenderedFeatures(e.point, {
                layers: ['clusters'],
            });
            var clusterId = features[0].properties.cluster_id;
            map.getSource('cases').getClusterExpansionZoom(
                clusterId,
                function(err, zoom) {
                    if (err) return;
                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom,
                    });
                },
            );
        });

        map.on('click', 'unclustered-point', function(e) {
            var coordinates = e.features[0].geometry.coordinates.slice();
            var props = e.features[0].properties;
            new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(`
                    caseID: ${props.caseID}<br />
                    age: ${props.age}<br />
                    sex: ${props.sex[0]}<br />
                    facility: ${props.facility}
                `)
                .addTo(map);
        });

        map.on('mouseenter', 'clusters', function() {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'clusters', function() {
            map.getCanvas().style.cursor = '';
        });
    });
});
