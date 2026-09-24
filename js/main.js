var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

var googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
});


var acudesStyle = {
    "color": "#070A9C",
    "fillcolor":"#27BEF5",
    "weight": 1,
    "opacity": 0.65
}


function onEachFeatureAcude(feature, layer) {
    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.Nome) {

        var popUp = `
            <strong>Nome: </strong>${feature.properties.Nome || '-'}<br>
            <strong>Executor: </strong>${feature.properties.Executor || '-'}<br>
            <strong>Finalidade: </strong>${feature.properties.Finalidade || '-'} <br>
            <strong>Municipio: </strong>${feature.properties.Municipio || '-'} <br>
        `
        layer.bindPopup(popUp);
    }

}


//var baciasStyle = {
  // "color": "#000000",
   //"fillcolor":"#272AF5",
   //"weight": 2,
    //"opacity": 0.65
//}


// Paleta de cores das bacias
var coresBacias = [
    "#e41a1c",
    "#377eb8",
    "#4daf4a",
    "#984ea3",
    "#ff7f00",
    "#ffff33",
    "#a65628",
    "#f781bf",
    "#999999",
    "#66c2a5",
    "#fc8d62",
    "#8da0cb"
];

// Guarda a relação entre o nome da bacia e a cor atribuída
var coresPorBacia = {};
var proximaCor = 0;


// Função responsável pelo estilo de cada bacia
function baciasStyle(feature) {

    // Propriedade que identifica a bacia
    var nomeBacia = feature.properties.Nome;

    // Se ainda não existe uma cor para essa bacia,
    // atribui a próxima cor disponível
    if (!coresPorBacia[nomeBacia]) {
        coresPorBacia[nomeBacia] = coresBacias[proximaCor];

        proximaCor++;

        // Quando chegar ao final da paleta,
        // começa novamente
        if (proximaCor >= coresBacias.length) {
            proximaCor = 0;
        }
    }

    return {
        "color": "#000000",
        "fillColor": coresPorBacia[nomeBacia],
        "weight": 2,
        "opacity": 0.65,
        "fillOpacity": 0.20
    };
}




function onEachFeatureBacia(feature, layer) {
    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.Nome) {

        var popUp = `
            <strong>Nome: </strong>${feature.properties.Nome || '-'}<br>
            <strong>Perimetro: </strong>${feature.properties.Perimetro || '-'}<br>
            <strong>Area_Km2: </strong>${feature.properties.Area_Km2 || '-'} <br>           
        `
        layer.bindPopup(popUp);
    }

}


var riosStyle = {
    "color": "#070A9C",
    "fillcolor":"#272AF5",
    "weight": 2,
    "opacity": 0.35
}

function onEachFeatureRio(feature, layer) {
    // does this feature have a property named popupContent?
    if (feature.properties && feature.properties.Nome) {

        var popUp = `
            <strong>Nome: </strong>${feature.properties.Nome || '-'}<br>
            <strong>Ordem: </strong>${feature.properties.Ordem || '-'}<br>                      
        `
        layer.bindPopup(popUp);
    }

}






var acudes = L.geoJSON(acudes, {
    style:acudesStyle,
    onEachFeature: onEachFeatureAcude
});


var bacias_hidro = L.geoJSON(bacias_hidro, {
    style:baciasStyle,
    onEachFeature: onEachFeatureBacia
});


var rios_drenagem_principal = L.geoJSON(rios_drenagem_principal, {
    style:riosStyle,
    onEachFeature: onEachFeatureRio
});




var map = L.map('map', {
    center: [-7.171750, -36.798706],
    zoom: 8,
    layers: [acudes, osm]
})

var baseMaps = {
    "OpenStreetMap": osm,  
    "GoogleSatelite": googleSat  
};

var overlayMaps = {
    "Açudes": acudes,
    "Bacias Hidrográgicas": bacias_hidro,
    "Rios - Drenagem Princial": rios_drenagem_principal
};


var layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);
