/* GeoPortal — main.js
   Mapa (index.html) e galeria (galeria.html).
   Os poços são agrupados usando Leaflet.markercluster.
*/
(function () {
  'use strict';

  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    });
  };

  var fmt = function (v) {
    return v.toLocaleString('pt-BR', {
      maximumFractionDigits: 2
    });
  };

  /* Monta os dados dos pop-ups */
  function popup(titulo, props, campos) {
    var linhas = campos.map(function (c) {
      var v = props[c[1]];

      if (v === null || v === undefined || v === '') {
        return '';
      }

      var txt = typeof v === 'number' && c[2] !== undefined
        ? fmt(v) + c[2]
        : String(v);

      return '<tr><th scope="row">' + esc(c[0]) +
        '</th><td>' + esc(txt) + '</td></tr>';
    }).join('');

    return '<strong>' + esc(titulo) +
      '</strong><table class="popup-attr">' +
      linhas + '</table>';
  }

  /* ---------------- MAPA ---------------- */
  function iniciarMapa() {
    if (!document.getElementById('map') ||
        typeof L === 'undefined') {
      return;
    }

    var map = L.map('map', {
      preferCanvas: true
    }).setView([-7.2, -36.8], 8);

    var osm = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; contribuidores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    ).addTo(map);

    var sat = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Imagens &copy; Esri'
      }
    );

    var controle = L.control.layers({
      'OpenStreetMap': osm,
      'Imagem de satélite (Esri)': sat
    }, null, {
      position: 'topright'
    }).addTo(map);

    L.control.scale({
      imperial: false,
      position: 'bottomleft'
    }).addTo(map);

    var PAL = [
      '#d8b45a',
      '#9db87a',
      '#c98a6b',
      '#8fb3c4',
      '#b9a3c9',
      '#c4c18f'
    ];

    var limites = null;

    /* 1. Bacias hidrográficas */
    if (typeof bacias_hidro !== 'undefined') {
      var bacias = L.geoJSON(bacias_hidro, {
        style: function (f) {
          return {
            color: '#6b5a2e',
            weight: 1.5,
            dashArray: '5 3',
            fillColor: PAL[
              (f.properties.Cod || 0) % PAL.length
            ],
            fillOpacity: 0.3
          };
        },

        onEachFeature: function (f, l) {
          var p = f.properties || {};

          l.bindTooltip(esc(p.Nome || 'Bacia'), {
            sticky: true
          });

          l.bindPopup(popup(
            'Bacia ' + (p.Nome || ''),
            p,
            [
              ['Código', 'Cod'],
              ['Comitê', 'Comite'],
              ['Área', 'Area_Km2', ' km²'],
              ['Perímetro', 'Perimetro', ' km'],
              ['Volume', 'Volume(%)', ' %']
            ]
          ));
        }
      }).addTo(map);

      bacias._geoRotulo = 'Bacias hidrográficas';
      limites = bacias.getBounds();
    }

    /* 2. Drenagem principal */
    if (typeof drenagem_principal !== 'undefined') {
      var drenagem = L.geoJSON(drenagem_principal, {
        style: function (f) {
          var p = f.properties || {};

          var n = parseInt(
            String(p.Ordem || '').replace(/\D/g, ''),
            10
          ) || 3;

          return {
            color: '#2a7fc1',
            weight: Math.max(0.8, (n - 2) * 0.7 + 0.6),
            opacity: 0.9
          };
        },

        onEachFeature: function (f, l) {
          var p = f.properties || {};

          l.bindPopup(popup(
            p.Nome || 'Trecho de drenagem',
            p,
            [
              ['Ordem', 'Ordem'],
              ['Zona', 'Zona'],
              ['Domínio', 'Dominio'],
              ['Código Otto', 'CodigoOtto']
            ]
          ));
        }
      }).addTo(map);
      drenagem._geoRotulo = 'Drenagem principal';
    }

    /* 3. Açudes — os dados são POLÍGONOS (MultiPolygon), com campos
          Nome, Municipio, Capacidade (m³) etc. Desenha o espelho d'água
          de cada açude (apenas os polígonos reais). */
    if (typeof acudes !== 'undefined') {
      var acudesPoly = L.geoJSON(acudes, {
        pointToLayer: function (f, ll) {
          /* só usado se a base vier como pontos (formato antigo) */
          var p = f.properties || {};
          var cap = Number(p.capacidade_hm3) || 0;

          return L.circleMarker(ll, {
            radius: Math.max(6, Math.min(16, 4 + Math.sqrt(cap) * 0.45)),
            color: '#fff',
            weight: 1.5,
            fillColor: '#0b4f8a',
            fillOpacity: 0.9
          });
        },

        style: function () {
          return {
            color: '#08306b',
            weight: 2.5,
            opacity: 1,
            fillColor: '#2a7fc1',
            fillOpacity: 1
          };
        },

        onEachFeature: function (f, l) {
          var p = f.properties || {};
          var nome = p.Nome || p.nome || ('Açude (ID ' + (p.OBJECTID || '?') + ')');

          /* conversões: m³ → hm³ e m² → ha; zero = sem informação */
          var hm3 = p.Capacidade !== undefined
            ? (Number(p.Capacidade) || 0) / 1e6
            : (Number(p.capacidade_hm3) || 0);
          var morto = (Number(p.Vol_Morto) || 0) / 1e6;
          var espelho = (Number(p.A_Espelho) || 0) / 1e4;

          var dados = {
            Municipio: p.Municipio || p.municipio,
            Microrreg: p.Microrreg,
            Mesorreg: p.Mesorreg,
            Propriet: p.Propriet,
            Org_Resp: p.Org_Resp,
            Finalidade: p.Finalidade,
            cap: hm3 || null,
            morto: morto || null,
            espelho: espelho || null,
            Alt_Barrag: p.Alt_Barrag || null,
            Comp_: p.Comp_ || null,
            Curso_Bar: p.Curso_Bar,
            Inic_Const: p.Inic_Const,
            Conclusao: p.Conclusao
          };

          var html = popup(nome, dados, [
            ['Município', 'Municipio'],
            ['Microrregião', 'Microrreg'],
            ['Mesorregião', 'Mesorreg'],
            ['Proprietário', 'Propriet'],
            ['Órgão responsável', 'Org_Resp'],
            ['Finalidade', 'Finalidade'],
            ['Capacidade', 'cap', ' hm³'],
            ['Volume morto', 'morto', ' hm³'],
            ['Área do espelho', 'espelho', ' ha'],
            ['Altura da barragem', 'Alt_Barrag', ' m'],
            ['Comprimento', 'Comp_', ' m'],
            ['Curso barrado', 'Curso_Bar'],
            ['Início da construção', 'Inic_Const'],
            ['Conclusão', 'Conclusao']
          ]);

          l.bindTooltip(esc(nome), { sticky: true });
          l.bindPopup(html);
        }
      });

      acudesPoly._geoRotulo = 'Açudes';
      acudesPoly.addTo(map);

      console.log('Açudes carregados:', acudesPoly.getLayers().length);

      if (acudes.features.some(function (f) {
        return f.geometry && f.geometry.type === 'Point';
      })) {
        console.warn(
          'data/acudes.js contém PONTOS (versão antiga de exemplo). ' +
          'Substitua pelo arquivo com os 71 polígonos e atualize o cache (Ctrl+F5).'
        );
      }
    }

    /* 4. Poços — agrupamento dos pontos */
    function adicionarPocos() {
      if (
        typeof pocos === 'undefined' ||
        !pocos ||
        !Array.isArray(pocos.features)
      ) {
        console.error(
          'Dados dos poços não encontrados ou GeoJSON inválido.'
        );

        var totalErro = document.getElementById('totalPocos');

        if (totalErro) {
          totalErro.textContent = '(dados não carregados)';
        }

        return;
      }

      if (typeof L.markerClusterGroup !== 'function') {
        console.error(
          'Leaflet.markercluster não foi carregado.'
        );
        return;
      }

      var total = 0;

      var pocosCluster = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 55
      });

      pocos.features.forEach(function (f) {
        if (
          !f ||
          !f.geometry ||
          f.geometry.type !== 'Point' ||
          !Array.isArray(f.geometry.coordinates) ||
          f.geometry.coordinates.length < 2
        ) {
          return;
        }

        var coords = f.geometry.coordinates;
        var lng = Number(coords[0]);
        var lat = Number(coords[1]);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          Math.abs(lat) > 90 ||
          Math.abs(lng) > 180
        ) {
          return;
        }

        var p = f.properties || {};

        /* a base não tem campo "nome": identifica pelo fid */
        var nome = 'Poço ' + (p.fid || (total + 1));

        /* Marcador individual */
        var icone = L.divIcon({
          className: 'poco-marker-wrapper',
          html:
            '<span style="' +
            'display:block;' +
            'width:12px;' +
            'height:12px;' +
            'border:2px solid #fff;' +
            'border-radius:50%;' +
            'background:#c2185b;' +
            'box-shadow:0 0 3px #333;' +
            '"></span>',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        var marker = L.marker([lat, lng], {
          icon: icone,
          title: nome,
          alt: nome
        });

        /* permite ao painel de camadas identificar a camada pelos atributos */
        marker.feature = f;

        marker.bindTooltip(esc(nome), {
          direction: 'top',
          offset: [0, -5]
        });

        marker.bindPopup(popup(
          nome,
          p,
          [
            ['Identificador', 'fid'],
            ['Proprietário', 'proprietario'],
            ['Órgão responsável', 'orgao'],
            ['Data de perfuração', 'data_perfuracao'],
            ['Município', 'municipio'],
            ['Microrregião', 'microregiao'],
            ['Mesorregião', 'mesoregiao'],
            ['Profundidade', 'profundidade', ' m'],
            ['Vazão', 'q_m3h', ' m³/h'],
            ['Equipamento', 'equipamento']
          ]
        ));

        /* Adiciona o marcador ao agrupamento */
        pocosCluster.addLayer(marker);
        total++;
      });

      /* Exibe todos os clusters no mapa */
      pocosCluster.addTo(map);

      controle.addOverlay(
        pocosCluster,
        'Poços (' + total.toLocaleString('pt-BR') + ')'
      );

      pocosCluster._geoRotulo = 'Poços';
      window.pocosCluster = pocosCluster;

      /* Atualiza o total da legenda */
      var elTotal = document.getElementById('totalPocos');

      if (elTotal) {
        elTotal.textContent =
          '(' + total.toLocaleString('pt-BR') + ')';
      }

      var esperado = pocos.features.length;

      console.log(
        'Poços carregados no mapa:',
        total,
        '| Feições no arquivo:',
        esperado
      );

      if (total !== esperado) {
        console.warn(
          'Foram carregados ' + total + ' de ' + esperado +
          ' poços; ' + (esperado - total) +
          ' foram descartados (geometria/coordenadas inválidas).'
        );
      }
    }

    /* Carrega os poços */
    if (typeof pocos !== 'undefined') {
      adicionarPocos();
    } else {
      var sc = document.createElement('script');

      sc.src = 'data/pocos_pb.js';

      sc.onload = function () {
        if (typeof pocos !== 'undefined') {
          adicionarPocos();
        } else {
          console.error(
            'O arquivo data/pocos_pb.js carregou, ' +
            'mas não definiu a variável "pocos".'
          );
        }
      };

      sc.onerror = function () {
        console.error(
          'Não foi possível carregar data/pocos_pb.js. ' +
          'Verifique o caminho do arquivo.'
        );
      };

      document.head.appendChild(sc);
    }

    if (limites && limites.isValid()) {
      map.fitBounds(limites);
    }

    window.mapaGeoPortal = map;
  }

  /* ---------------- GALERIA ---------------- */
  function iniciarGaleria() {
    var grid = document.getElementById('galleryGrid');

    if (!grid) {
      return;
    }

    var itens = Array.prototype.slice.call(
      grid.querySelectorAll('.gallery-item')
    );

    var busca = document.getElementById('gallerySearch');
    var vazio = document.getElementById('emptyGallery');

    var botoes = Array.prototype.slice.call(
      document.querySelectorAll('.filter-btn')
    );

    var filtro = 'todos';

    var norm = function (s) {
      return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    };

    function aplicar() {
      var q = norm(busca ? busca.value.trim() : '');
      var n = 0;

      itens.forEach(function (it) {
        var ok =
          (filtro === 'todos' ||
            it.dataset.category === filtro) &&
          (!q ||
            norm(it.dataset.title).indexOf(q) > -1);

        it.classList.toggle('d-none', !ok);

        if (ok) {
          n++;
        }
      });

      if (vazio) {
        vazio.classList.toggle('d-none', n > 0);
      }
    }

    botoes.forEach(function (b) {
      b.setAttribute(
        'aria-pressed',
        b.classList.contains('active') ? 'true' : 'false'
      );

      b.addEventListener('click', function () {
        filtro = b.dataset.filter;

        botoes.forEach(function (x) {
          var on = x === b;

          x.classList.toggle('active', on);

          x.setAttribute(
            'aria-pressed',
            on ? 'true' : 'false'
          );
        });

        aplicar();
      });
    });

    if (busca) {
      busca.addEventListener('input', aplicar);
    }
  }

  iniciarMapa();
  iniciarGaleria();
})();