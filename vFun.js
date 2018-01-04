window.addEventListener('load', initMap);


/**
 * @var {vmap}vamp 초기화 객체
 * @var {marker}mapMarker 버스위치 마커
 * @var {element}div_vmap html vmap div id
 * @var {layer}vectorLayer 버스노선이 그려지는 vectorLayer
 * @var {string}busSelectorvalue 사용자가 선택한 버스 id
 * @var {string}oldSelectorValue 사용자가 선택했던 버스 id selet 가 바뀔 때를 위한 변수
 */
var vmap;
let mapMarker;
let div_vmap;
let vectorLayer;
let busSelectorvalue;
let oldSelectorValue = "";

/** 전 상태의 url 로 복귀, 지도 이동한다.
 * @fires widnow#onpopstate */
window.onpopstate = function (event) {
/**
 * @event window#onpopstate
 * @property {state}loadState - 브라우저의 뒤로가기를 누를 때의 핸들러.
 */
    loadState(event.state);
};

/**
 * 중앙좌표를 저장함.
 * @fires vmap#moveend
 * @param {event} evt
 */
function centerGPSForURL(evt) {
/**
 *  @event vmap#moveend
 *  @property {history}pushState - 지도가 움직일 때, 중앙 좌표(x,y)를 저장함.
 */
    //배열값으로 나옴. 0: X, 1: Y
    let centerGPS_4326 = vmap.getView().getCenter();
    let centerGPS_3857 = ol.proj.transform([centerGPS_4326[0], centerGPS_4326[1]], "EPSG:3857", "EPSG:4326");
    history.pushState(null, null, '#' + centerGPS_3857[0] + ',' + centerGPS_3857[1]);
}

/**
 * {@link loadState}로 불려지는 함수. url에 써져있는 좌표값을 반환해준다.
 */
function getURLCoordinate() {
    let url = window.location.href;
    let coordinate = url.slice(url.search('#') + 1).split(',');
    return coordinate;
}
/**
 * 뒤로가기를 눌렀을 때, {@link getURLCoordinate}를 통해 url의 좌표를 가져오고 {@link moveMap} 에 인자로 준다.
 * @param {state} state 
 */
function loadState(state) {
    /**@function getURLCoordinate */
    let urlCoordinate = getURLCoordinate();
    moveMap(Number(urlCoordinate[0]), Number(urlCoordinate[1]));

}
/**
 * 창 초기화
 * @fires window#load
 */
function initMap() {
/**
* @event window#load 
*/
    div_vmap = document.getElementById('v_map');
    // busData = document.getElementById('busData');
    vw.ol3.MapOptions = {
        basemapType: vw.ol3.BasemapType.GRAPHIC
        , controlDensity: vw.ol3.DensityType.EMPTY
        , interactionDensity: vw.ol3.DensityType.BASIC
        , controlsAutoArrange: true
        , homePosition: vw.ol3.CameraPosition
        , initPosition: vw.ol3.CameraPosition
    };
    vmap = new vw.ol3.Map(div_vmap, vw.ol3.MapOptions);

    vmap.getView().setCenter(ol.proj.transform([126.972559, 37.554648], "EPSG:4326", "EPSG:3857"));
    vmap.getView().setZoom(12);
    vmap.on('moveend', centerGPSForURL);

    $('#busSelect').on('change', function () {

        vectorLayer = clearLayer(vectorLayer);
        busSelectorvalue = this.value;
        setTimeout("positionForMarker()", 300);
    });

    $('#get30').on('change', function () {
        let checkInterval_vFun = "";
        busSelectorvalue = $('#busSelect')[0].selectedOptions[0].value;
        if ($('#get30')[0].checked) {
            checkInterval_vFun = setInterval(function () {
                setTimeout("positionForMarker()", 2000);
            }, 30000);
        }
        else {
            clearInterval(checkInterval_vFun);
        }
    });

    $('#busPath').on('click', function () {
        if (busRouteData.busRoutePosX == 0) {
            alert("이 노선은 노선정보(path)가 없습니다!");
            return;
        }
        else {
            createBusPath();
        }
    });


}





/**
 * 마커들을 생성하기 위한 사전 준비작업 함수. 각 데이터는 {@link GetBusRouteList}의 BusRoutePath 에서 얻는다.
 * 호출은 busSelect 에서 실행됨.
 */
function positionForMarker() {

    let bus_gpsX = busData.busGpsX;
    let bus_gpsY = busData.busGpsY;
    let bus_plainNo = busData.busPlainNo;

    if (!(busSelectorvalue == oldSelectorValue)) {
        oldSelectorValue = busSelectorvalue;
        let centerGpsX = 0.0;
        let centerGpsY = 0.0;
        let numberForItemCount;
        for (numberForItemCount = 0; numberForItemCount < bus_gpsX.length; numberForItemCount++) {
            centerGpsX += parseFloat(bus_gpsX[numberForItemCount]);
            centerGpsY += parseFloat(bus_gpsY[numberForItemCount]);
        }
        centerGpsX = Number((centerGpsX / numberForItemCount).toPrecision(9));
        centerGpsY = Number((centerGpsY / numberForItemCount).toPrecision(8));

        moveMap(centerGpsX, centerGpsY);

    }
    createBusMarker(bus_gpsX, bus_gpsY, bus_plainNo);
}

/**
 * {@link positionForMarker} 에서 받아온 정보를 토대로 마커를 생성하는 함수
 * @param {Number} bus_gpsX 버스들의 X좌표
 * @param {Number} bus_gpsY 버스들의 Y좌표
 * @param {Number} bus_plainNo 버스들의 번호판
 */
function createBusMarker(bus_gpsX, bus_gpsY, bus_plainNo) {

    mapMarker = clearLayer(mapMarker);
    mapMarker = new vw.ol3.layer.Marker(vmap);
    vmap.addLayer(mapMarker);
    for (let i = 0; i < bus_gpsX.length; i++) {
        vw.ol3.markerOption = {
            x: bus_gpsX[i],
            y: bus_gpsY[i],
            epsg: "EPSG:4326",
            title: bus_plainNo[i],
            contents: bus_plainNo[i],
        };
        mapMarker.addMarker(vw.ol3.markerOption);
    }
}

/**
 * 버스 패스 정보 생성.
 * @fires busPath#click
 */
function createBusPath() {
/**
 * @event busPath#click
 * @property {layer}addLayer - busPath 버튼이 눌릴 때 실행. 각 버스 path들을 이어 붙이기 위한 사전작업. 벡터레이어를 정의하는 곳
 */
    let busPathX = busRouteData.busRoutePosX;
    let busPathY = busRouteData.busRoutePosY;

    let busPath = []; //[[X0, Y0], [X1, Y1], [X2, Y2]...]

    for (i = 0; i < busPathX.length; i++) {
        busPath.push(ol.proj.transform([Number(busPathX[i]), Number(busPathY[i])], "EPSG:4326", "EPSG:3857"));
    }

    let vectorSource = new ol.source.Vector();
    vectorLayer = new ol.layer.Vector({ source: vectorSource });

    addBusPathLine(vectorSource, busPath);
    vmap.addLayer(vectorLayer);
}

/**
 * {@link createBusPath} 에서 받아온 정보를 토대로 벡터레이어에 각 선을 그리는 함수
 * @param {source} src vectorSource
 * @param {array} busPath [ [x0, y0], [x1, y1]...] 형태의 버스노선 배열
 */
function addBusPathLine(src, busPath) {

    let feature = new ol.Feature({
        geometry: new ol.geom.LineString(busPath)
    });

    let style = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'red',
            width: 4
        })
    });

    feature.setStyle(style);
    src.addFeature(feature);
}

/**
 * 레이어를 제거 시켜주는 함수. 초기화 기능
 * @param {layer} inLayer 초기화할 레이어
 */
function clearLayer(inLayer) {

    if (inLayer != null) {
        vmap.removeLayer(inLayer);
        inLayer = null;
    }

    return inLayer;
}

/**
 * 지도를 이동시키는 함수. {@link positionForMarker}, {@link loadState} 에서 호출된다.
 * @param {Number} centerGpsX EPSG:4326 형태의 x좌표
 * @param {Number} centerGpsY EPSG:4326 형태의 y좌표
 */
function moveMap(centerGpsX, centerGpsY) {
    let moving = ol.animation.pan({
        duration: 1000,
        source: (vmap.getView().getCenter())
    });
    vmap.beforeRender(moving);

    vmap.getView().setCenter(ol.proj.transform([centerGpsX, centerGpsY], "EPSG:4326", "EPSG:3857"));
}