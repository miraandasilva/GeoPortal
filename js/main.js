var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

var googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: '&copy; Google'
});

var acudesStyle = {
    "color": "#0057B8",
    "fillColor": "#00A6FB",
    "weight": 2,
    "opacity": 0.8
}

function onEachFeatureAcude(feature, layer) {
    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.Nome) {

        var popUp = `
          <strong>Nome: </strong>${feature.properties.Nome}<br>
          <strong>Executor: </strong>${feature.properties.Executor || '-'}<br>
          <strong>Finalidade: </strong>${feature.properties.Finalidade || '-'}<br>
          <strong>Municipio: </strong>${feature.properties.Municipio || '-'}<br>
        `

        layer.bindPopup(popUp);
    }
}

// Paleta de cores para as bacias
var coresBacias = [
    "#272AF5", "#FF5733", "#33A02C", "#F1C40F",
    "#8E44AD", "#E67E22", "#1ABC9C", "#D35400",
    "#2980B9", "#C0392B", "#16A085", "#7D3C98"
];

// Função para gerar uma cor consistente a partir do nome da bacia
function getCorBacia(nome) {
    if (!nome) return coresBacias[0];
    
    // gera um índice baseado no hash do nome, garantindo que a mesma bacia sempre tenha a mesma cor
    var hash = 0;
    for (var i = 0; i < nome.length; i++) {
        hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    }
    var index = Math.abs(hash) % coresBacias.length;
    return coresBacias[index];
}

// baciasStyle agora é uma função
function baciasStyle(feature) {
    var cor = getCorBacia(feature.properties.Nome);
    return {
        "color": cor,
        "fillColor": cor,
        "weight": 2,
        "opacity": 0.7,
        "fillOpacity": 0.4
    };
}

function onEachFeatureBacia(feature, layer) {
    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.Nome) {

        var popUp = `
          <strong>Nome: </strong>${feature.properties.Nome}<br>
          <strong>Perimetro: </strong>${feature.properties.Perimetro || '-'}<br>
          <strong>Area_km2: </strong>${feature.properties.Area_km2 || '-'}<br>
        `

        layer.bindPopup(popUp);
    }
}

var riosStyle = {
    "color": "#070A9c",
    "fillColor": "#070A52",
    "weight": 2,
    "opacity": 0.8
}

function onEachFeatureRio(feature, layer) {
    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.Nome) {

        var popUp = `
          <strong>Nome: </strong>${feature.properties.Nome || '-'}<br>
          <strong>Ordem: </strong>${feature.properties.Ordem || '-'}<br>
          <strong>Dominio: </strong>${feature.properties.Dominio || '-'}<br>
        `

        layer.bindPopup(popUp);
    }
}

var acudes = L.geoJSON(acudes, {
  style: acudesStyle, 
  onEachFeature: onEachFeatureAcude
});

var bacias_hidro = L.geoJSON(bacias_hidro, {
    style: baciasStyle,
    onEachFeature: onEachFeatureBacia
});

var drenagem_principal = L.geoJSON(drenagem_principal, {
    style: riosStyle,
    onEachFeature: onEachFeatureRio
});

var map = L.map('map', {
    center: [-7.171756, -36.798706],
    zoom: 8,
    layers: [drenagem_principal, bacias_hidro, acudes, osm]

});

var baseMaps = {
    "OpenStreetMap": osm,
    "Google Satélite": googleSat

};

var overlayMaps = {
    "Açudes": acudes,
    "Bacias Hidrográficas": bacias_hidro,
    "Drenagem_Principal": drenagem_principal
    
};

var layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);